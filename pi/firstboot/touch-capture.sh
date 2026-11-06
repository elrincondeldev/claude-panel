#!/bin/sh
# Prints the raw position of every touch release on the ADS7846 touchscreen ("x y" per line).
# Used by pi/calibrate.ts; it reads the kernel device, so no current calibration is applied.
event=$(grep -l '^ADS7846 Touchscreen$' /sys/class/input/event*/device/name | head -n 1 | cut -d/ -f5)
[ -n "$event" ] || { echo "no ADS7846 touchscreen found" >&2; exit 1; }
exec evtest "/dev/input/$event" | awk '/ABS_X\), value/ {x=$NF} /ABS_Y\), value/ {y=$NF} /BTN_TOUCH\), value 0/ {print x, y; fflush()}'
