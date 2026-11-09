#!/usr/bin/env bash
# Pull the latest code from GitHub and redeploy:  sudo bash /opt/memorize114/deploy/update.sh
set -euo pipefail
APP_DIR=/opt/memorize114
OWNER=${SUDO_USER:-ubuntu}
cd "$APP_DIR"
sudo -u "$OWNER" git pull --ff-only
cd server && sudo -u "$OWNER" npm ci --omit=dev --no-audit --no-fund && sudo -u m114 node src/migrate.js
cd ../web && sudo -u "$OWNER" npm ci --no-audit --no-fund && sudo -u "$OWNER" npm run build
command -v restorecon >/dev/null && restorecon -R "$APP_DIR/web/dist" || true
systemctl restart memorize114
echo "Updated to: $(sudo -u "$OWNER" git -C "$APP_DIR" log -1 --format='%h %s')"
