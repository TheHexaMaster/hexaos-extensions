# XINLUDA XL9535 — 16-channel I2C GPIO expander

A 16-bit I2C GPIO expander. Each of the 16 pins can be individually configured as
an input or an output, with optional per-pin polarity inversion.

## Wiring / addressing
- Bus: I2C. Default address `0x20` (override in the install wizard; the XL9535
  address pins A0–A2 select `0x20`–`0x27`).
- Polled every `100 ms` by default.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x20`).
- **poll_ms** — read interval in ms (default `100`).
- **io_mask** (bitmask16) — per-pin direction; bit set = **output**, bit clear =
  **input**. The driver writes the inverted mask to the chip's direction register
  (the chip uses 1=input).
- **invert** (bitmask16) — per-pin polarity inversion; bit set = inverted.
- **state_mem** (bool) — persist the output state across reboots.

## Behaviour
On init the driver clears all outputs, programs the inversion mask, then sets pin
directions from `io_mask`. Each pin is exposed as a boolean field; pins configured
as outputs are writable (toggle), pins configured as inputs are read-only and
reflect the physical line.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/device/xl9535.json`). Register map, init sequence and field behaviour are
preserved unchanged.
