# Injoinic IP5306 — sensor

Power bank SoC with integrated charger, boost converter, and battery gauge. I2C
variant only (e.g. PB0A module, M5Stack Core). Provides a 4-step battery level,
charge status, and configurable charge parameters.

## Wiring / addressing
- Bus: I2C. Default address `0x75`.
- Polled every `3000 ms` by default.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x75`).
- **poll_ms** — read interval in ms (default `3000`).
- **charger_en / boost_en / auto_pwr_on / boost_out_en / btn_off_en /
  low_pwr_off / boost_keep** (bool) — feature enables wired into SYS_CTL0/1.
- **batt_voltage** (enum) — target battery voltage.
- **charge_current** (enum) — charge current (50–2050 mA).
- **end_current** (enum) — end-of-charge current detection threshold.
- **cutoff_voltage** (enum) — charge cutoff voltage set.
- **shutdown_time** (enum) — light-load auto-shutdown time.

## Behaviour
On init the driver programs SYS_CTL0/1/2 and the Charger_CTL0/1/2 + CHG_DIG_CTL0
registers from the settings above. It exposes a 4-step battery level, several
boolean state fields (charging, full, light load, button short/long/double,
charger/boost/5V active), plus read-back of the configured charge current and
battery voltage.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/ip5306.json`).
