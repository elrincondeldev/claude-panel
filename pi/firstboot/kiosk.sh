#!/bin/sh
# SPI panels appear as their own DRM device with no GPU: drive only that device, rendering in software.
spi=$(ls /dev/dri/by-path/*spi*-card 2>/dev/null | head -n 1)
if [ -n "$spi" ]; then
  WLR_DRM_DEVICES=$(readlink -f "$spi")
  export WLR_DRM_DEVICES WLR_RENDERER=pixman
fi

exec cage -- /opt/claude-panel/session.sh
