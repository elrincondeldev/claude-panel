#!/bin/sh
# Runs inside cage. The SPI panel's native mode is portrait (320×480): turn the output to landscape.
if wlr-randr 2>/dev/null | grep -q '^SPI-1'; then
  wlr-randr --output SPI-1 --transform 90
fi

browser=$(command -v chromium || command -v chromium-browser)
# --disable-gpu: with cage rendering in software, GPU (dmabuf) frames never reach the screen.
exec "$browser" \
  --kiosk --incognito --ozone-platform=wayland --disable-gpu \
  --noerrdialogs --disable-infobars --no-first-run --password-store=basic --disable-features=Translate \
  "http://127.0.0.1:8080/?kiosk&inset=0,12,0,0"
