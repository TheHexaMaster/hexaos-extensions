#!/usr/bin/env python3
"""Build the HexaOS Extensions catalogue index from the Drivers/ packages.

Scans every Drivers/<slug>/cat.json and emits catalog/index.json — the single
machine-readable index the hexaos.io site (and the device WebUI) consume.

This is the source-of-truth generator: a GitHub Action runs it on merge to main
and publishes catalog/ to the hexaos.io catalogue (see .github/workflows/
publish-catalog.yml). It also validates each package: the 5 mandatory files must
exist, cat.json must parse + carry the required keys, slug must be unique and
equal the directory name, and version/hexaos_compat must be semver.

Usage:
    python3 tools/build_catalog.py            # writes catalog/index.json
    python3 tools/build_catalog.py --check    # validate only, no write (CI)
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DRIVERS = REPO / "Drivers"
OUT_DIR = REPO / "catalog"
OUT = OUT_DIR / "index.json"

MANDATORY_FILES = ("cat.json", "set.json", "drv.json", "readme.md", "changelog.md")
REQUIRED_CAT_KEYS = (
    "slug", "interface", "protocol", "category", "manufacturer", "model",
    "version", "hexaos_compat", "description",
)
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
GITHUB_RAW = "https://raw.githubusercontent.com/TheHexaMaster/HexaOS-Extensions/main/Drivers"
GITHUB_TREE = "https://github.com/TheHexaMaster/HexaOS-Extensions/tree/main/Drivers"

CATALOG_VERSION = 1


def fail(errors: list[str]) -> None:
    print(f"\n✗ catalogue build FAILED with {len(errors)} error(s):", file=sys.stderr)
    for e in errors:
        print(f"  - {e}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    check_only = "--check" in sys.argv
    if not DRIVERS.is_dir():
        fail([f"Drivers/ directory not found at {DRIVERS}"])

    errors: list[str] = []
    seen_slugs: dict[str, Path] = {}
    entries: list[dict] = []

    for pkg in sorted(p for p in DRIVERS.iterdir() if p.is_dir()):
        dirname = pkg.name

        for f in MANDATORY_FILES:
            if not (pkg / f).is_file():
                errors.append(f"{dirname}: missing mandatory file {f}")

        cat_path = pkg / "cat.json"
        if not cat_path.is_file():
            continue
        try:
            cat = json.loads(cat_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errors.append(f"{dirname}/cat.json: invalid JSON ({e})")
            continue

        for k in REQUIRED_CAT_KEYS:
            if k not in cat:
                errors.append(f"{dirname}/cat.json: missing required key '{k}'")

        slug = cat.get("slug", "")
        if slug != dirname:
            errors.append(f"{dirname}: slug '{slug}' != directory name '{dirname}'")
        if slug in seen_slugs:
            errors.append(f"duplicate slug '{slug}' ({dirname} and {seen_slugs[slug].name})")
        seen_slugs[slug] = pkg

        for k in ("version", "hexaos_compat"):
            v = cat.get(k, "")
            if not SEMVER.match(str(v)):
                errors.append(f"{dirname}/cat.json: '{k}'='{v}' is not semver (X.Y.Z)")

        if "max_instances" in cat:
            errors.append(f"{dirname}/cat.json: 'max_instances' must not be present (removed)")

        entries.append({
            "slug": slug,
            "interface": cat.get("interface"),
            "protocol": cat.get("protocol"),
            "category": cat.get("category"),
            "manufacturer": cat.get("manufacturer"),
            "model": cat.get("model"),
            "version": cat.get("version"),
            "hexaos_compat": cat.get("hexaos_compat"),
            "released": cat.get("released"),
            "updated": cat.get("updated"),
            "author": cat.get("author"),
            "description": cat.get("description"),
            "tags": cat.get("tags", []),
            "dependencies": cat.get("dependencies", []),
            "paths": {
                "dir": f"Drivers/{slug}",
                "cat": f"{GITHUB_RAW}/{slug}/cat.json",
                "set": f"{GITHUB_RAW}/{slug}/set.json",
                "drv": f"{GITHUB_RAW}/{slug}/drv.json",
                "readme": f"{GITHUB_RAW}/{slug}/readme.md",
                "changelog": f"{GITHUB_RAW}/{slug}/changelog.md",
                "browse": f"{GITHUB_TREE}/{slug}",
            },
        })

    if errors:
        fail(errors)

    index = {
        "catalog_version": CATALOG_VERSION,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "https://github.com/TheHexaMaster/HexaOS-Extensions",
        "count": len(entries),
        "drivers": entries,
    }

    print(f"✓ validated {len(entries)} driver package(s), all checks passed")
    if check_only:
        return

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✓ wrote {OUT.relative_to(REPO)} ({len(entries)} drivers)")


if __name__ == "__main__":
    main()
