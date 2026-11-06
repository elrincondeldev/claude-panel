#!/bin/bash
# Turns a fresh Raspberry Pi OS Lite into the claude-panel kiosk, then reboots.
# cloud-init runs it once on first boot; re-run it over SSH with `sudo bash setup.sh`.
# `--app` only reinstalls the app and restarts the kiosk, without rebooting (pi/deploy.ts uses it).
set -euo pipefail
exec > >(tee -a /var/log/claude-panel-setup.log) 2>&1

BUNDLE=$(dirname "$(readlink -f "$0")")
APP=/opt/claude-panel
CONFIG=/boot/firmware/config.txt
CMDLINE=/boot/firmware/cmdline.txt
TOUCH_RULE=/etc/udev/rules.d/99-claude-panel-touch.rules
# Default for the CUQI 3.5" (SPI variant) in landscape, whose raw X axis runs right to left.
TOUCH_MATRIX="-1.14824 -0.00746 1.07864 0.00852 1.20110 -0.11929"
export DEBIAN_FRONTEND=noninteractive

install_app() {
  echo "== app"
  install -d "$APP"
  rm -rf "$APP/ui"
  cp -r "$BUNDLE/ui" "$APP/ui"
  install -m 755 "$BUNDLE/kiosk.sh" "$BUNDLE/session.sh" "$BUNDLE/touch-capture.sh" "$APP/"
  install -m 644 "$BUNDLE"/claude-panel-*.service /etc/systemd/system/
  # Keep a calibration made with pi/calibrate.ts.
  [ -f "$TOUCH_RULE" ] ||
    echo "ATTRS{name}==\"ADS7846 Touchscreen\", ENV{LIBINPUT_CALIBRATION_MATRIX}=\"$TOUCH_MATRIX\"" >"$TOUCH_RULE"
  udevadm control --reload
  udevadm trigger --subsystem-match=input --action=change
  systemctl daemon-reload
  systemctl enable ssh claude-panel-ui.service claude-panel-kiosk.service
}

if [ "${1:-}" = "--app" ]; then
  install_app
  systemctl restart claude-panel-ui.service claude-panel-kiosk.service
  exit 0
fi

echo "== waiting for network"
for _ in $(seq 60); do
  getent hosts archive.raspberrypi.com >/dev/null && break
  sleep 5
done

echo "== packages"
# First boot may still be running apt timers; wait for the lock instead of failing.
apt() { apt-get -o DPkg::Lock::Timeout=300 "$@"; }
apt update || { sleep 30; apt update; }
# Raspberry Pi OS renamed chromium-browser to chromium; accept either.
apt install -y cage wlr-randr evtest chromium || apt install -y cage wlr-randr evtest chromium-browser

install_app

echo "== removing the WiFi password from the boot partition"
# cloud-init only reads network-config on the first boot. After that the file just exposes the
# password on the FAT partition, readable by any user and by anyone holding the card.
# NetworkManager keeps its own root-only copy.
printf '# Applied by cloud-init on first boot; the WiFi password was removed afterwards.\n' \
  >/boot/firmware/network-config

echo "== display"
# The CUQI 3.5" is sold in an SPI and an HDMI variant; the HDMI one shows up as a connected monitor.
sed -i '/^# claude-panel begin/,/^# claude-panel end/d' "$CONFIG"
if grep -qs '^connected' /sys/class/drm/card*-HDMI-A-1/status; then
  kind=hdmi
  overlay="dtoverlay=ads7846,cs=1,penirq=25,penirq_pull=2,speed=50000,keep_vref_on=0,swapxy=0,pmax=255,xohms=150,xmin=200,xmax=3900,ymin=200,ymax=3900"
  grep -q 'video=HDMI-A-1:480x320' "$CMDLINE" || sed -i '1 s/$/ video=HDMI-A-1:480x320M@60/' "$CMDLINE"
else
  kind=spi
  overlay="dtoverlay=piscreen,drm,speed=16000000,rotate=90"
fi
printf '# claude-panel begin (%s panel)\n[all]\ndtparam=spi=on\n%s\n# claude-panel end\n' "$kind" "$overlay" >>"$CONFIG"
echo "configured the $kind variant"

echo "== rebooting into the kiosk"
systemctl reboot
