#!/usr/bin/env bash
#
# Promote a freshly-rsynced STAGING catalogue into the LIVE hexaos.io mirror,
# preserving previous driver versions.
#
# Runs ON THE MIRROR HOST (invoked over SSH by .github/workflows/publish-catalog.yml).
# For every driver in staging:
#   - if the live copy exists and its version differs from the incoming one,
#     snapshot the live cat/set/drv/readme into  <slug>/<old-version>/  BEFORE
#     overwriting (so users can still install/download older versions);
#   - copy the 5 current files over the live copy WITHOUT deleting version sub-folders;
#   - (re)write  <slug>/versions.json  = the current version + every snapshot.
# Finally publish index.json at the mirror root.
#
# Downloads are zipped CLIENT-SIDE in the browser (the site fetches the per-version
# raw files and builds the archive), so the mirror stores only raw files — no
# physical .zip artifacts. Any previously-generated .zip files are cleaned up here.
#
# Per-version snapshots are mirror-only — NOT in Git (Git history already preserves
# every prior version). See driver_system_redesign.md §11.0.2 and SCHEMA.md.
#
# Usage: mirror_publish.sh <STAGING_DIR> <LIVE_DIR>
# Deps: POSIX sh tools only (grep/sed/cp/mkdir/rm).
set -euo pipefail

STAGING="${1:?usage: mirror_publish.sh <STAGING_DIR> <LIVE_DIR>}"
LIVE="${2:?usage: mirror_publish.sh <STAGING_DIR> <LIVE_DIR>}"

SRC_DRV="$STAGING/Drivers"
DST_DRV="$LIVE/Drivers"
mkdir -p "$DST_DRV"

get_version() {
  grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$1" 2>/dev/null \
    | head -1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/'
}
is_semver() { printf '%s' "$1" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; }

snapshots=0; updated=0; added=0

for slug_dir in "$SRC_DRV"/*/; do
  [ -d "$slug_dir" ] || continue
  slug="$(basename "$slug_dir")"
  [ -f "$slug_dir/cat.json" ] || { echo "skip $slug (no cat.json)"; continue; }
  newv="$(get_version "$slug_dir/cat.json")"
  dstdir="$DST_DRV/$slug"

  if [ -f "$dstdir/cat.json" ]; then
    oldv="$(get_version "$dstdir/cat.json")"
    if [ -n "$oldv" ] && [ "$oldv" != "$newv" ] && is_semver "$oldv"; then
      snap="$dstdir/$oldv"
      mkdir -p "$snap"
      for f in cat.json set.json drv.json readme.md; do
        [ -f "$dstdir/$f" ] && cp -f "$dstdir/$f" "$snap/$f"
      done
      echo "snapshot  $slug  $oldv -> $newv"
      snapshots=$((snapshots + 1))
    fi
    updated=$((updated + 1))
  else
    added=$((added + 1))
  fi

  mkdir -p "$dstdir"
  for f in cat.json set.json drv.json readme.md changelog.md; do
    [ -f "$slug_dir/$f" ] && cp -f "$slug_dir/$f" "$dstdir/$f"
  done

  # Remove any physical .zip artifacts from earlier publishes (downloads are now
  # zipped client-side; nothing to keep on disk).
  rm -f "$dstdir"/*.zip 2>/dev/null || true

  # Backfill readme.md into any legacy snapshot folder that predates readme
  # capture, so historical downloads also carry the readme.
  for d in "$dstdir"/*/; do
    [ -d "$d" ] || continue
    vd="$(basename "$d")"
    if is_semver "$vd" && [ ! -f "$d/readme.md" ] && [ -f "$dstdir/readme.md" ]; then
      cp -f "$dstdir/readme.md" "$d/readme.md"
    fi
  done

  # versions.json: current first, then each semver snapshot sub-folder.
  {
    printf '{"current":"%s","versions":["%s"' "$newv" "$newv"
    for d in "$dstdir"/*/; do
      [ -d "$d" ] || continue
      vd="$(basename "$d")"
      if is_semver "$vd" && [ "$vd" != "$newv" ]; then
        printf ',"%s"' "$vd"
      fi
    done
    printf ']}\n'
  } > "$dstdir/versions.json"
done

# Canonical catalogue index at the mirror root → served at hexaos.io/catalog/index.json
cp -f "$STAGING/catalog/index.json" "$LIVE/index.json"

echo "mirror publish complete: $added new, $updated updated, $snapshots version snapshot(s)"
