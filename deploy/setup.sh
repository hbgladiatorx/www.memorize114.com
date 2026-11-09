#!/usr/bin/env bash
# One-time setup of Memorize 114 on a Lightsail instance.
# Works on AlmaLinux/Rocky/RHEL 8–9, Amazon Linux 2023 (dnf) and Ubuntu 22.04/24.04 (apt).
# Run from the cloned repo:  sudo bash /opt/memorize114/deploy/setup.sh
set -euo pipefail

APP_DIR=/opt/memorize114
DOMAIN=www.memorize114.com
APEX=memorize114.com

if [[ $EUID -ne 0 ]]; then echo "Run with sudo: sudo bash $APP_DIR/deploy/setup.sh"; exit 1; fi
REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
if [[ "$REPO_DIR" != "$APP_DIR" ]]; then echo "Clone the repository to $APP_DIR first (see README)."; exit 1; fi
OWNER=${SUDO_USER:-$(stat -c %U "$APP_DIR")}   # the login user who owns the code and pulls updates

if command -v dnf >/dev/null; then PM=dnf; elif command -v apt-get >/dev/null; then PM=apt; else echo "Unsupported system: needs dnf or apt."; exit 1; fi

read -rp "Your email (becomes the site administrator, also used for the HTTPS certificate): " ADMIN_EMAIL
read -rp "Amazon SES region for emails (e.g. us-east-1) — press Enter to skip for now: " SES_REGION
AWS_KEY=""; AWS_SECRET=""
if [[ -n "$SES_REGION" ]]; then
  read -rp "AWS access key ID for SES: " AWS_KEY
  read -rsp "AWS secret access key for SES: " AWS_SECRET; echo
fi

echo "==> Installing packages ($PM)"
if [[ $PM == apt ]]; then
  apt-get update -y
  apt-get install -y ca-certificates curl git openssl nginx postgresql certbot python3-certbot-nginx
  if ! command -v node >/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  fi
  NGINX_SITE=/etc/nginx/sites-available/memorize114
else
  . /etc/os-release
  if [[ "$ID" == "amzn" ]]; then
    # Amazon Linux 2023
    dnf install -y git openssl nginx python3 tar
    dnf install -y postgresql16-server postgresql16 || dnf install -y postgresql15-server postgresql15
  else
    # AlmaLinux / Rocky / RHEL 8–9
    dnf install -y epel-release || true
    dnf install -y git openssl nginx python3 tar policycoreutils-python-utils
    dnf -y module reset postgresql >/dev/null 2>&1 || true
    dnf -y module enable postgresql:16 >/dev/null 2>&1 || dnf -y module enable postgresql:15 >/dev/null 2>&1 || true
    dnf install -y postgresql-server postgresql
    dnf install -y certbot python3-certbot-nginx || true
  fi
  if ! command -v node >/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
    dnf -y module disable nodejs >/dev/null 2>&1 || true
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi
  # PostgreSQL: create the data folder once, and allow password logins from this machine
  [[ -f /var/lib/pgsql/data/PG_VERSION ]] || postgresql-setup --initdb
  sed -i -E 's#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+)[a-z0-9-]+#\1scram-sha-256#; s#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+::1/128[[:space:]]+)[a-z0-9-]+#\1scram-sha-256#' /var/lib/pgsql/data/pg_hba.conf
  systemctl enable postgresql && systemctl restart postgresql
  # certbot, if the system has no package for it: install it in its own Python environment
  if ! command -v certbot >/dev/null; then
    python3 -m venv /opt/certbot
    /opt/certbot/bin/pip install --quiet --upgrade pip certbot certbot-nginx
    ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
  fi
  # firewalld, if running: open the web ports
  if systemctl is-active --quiet firewalld; then firewall-cmd --permanent --add-service=http --add-service=https && firewall-cmd --reload; fi
  NGINX_SITE=/etc/nginx/conf.d/memorize114.conf
fi
systemctl enable --now nginx

echo "==> Service user (runs the API; the code stays owned by $OWNER)"
id m114 >/dev/null 2>&1 || useradd --system --no-create-home --shell /sbin/nologin m114

echo "==> Database"
DB_PASS=$(openssl rand -hex 24)
cd /tmp
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='m114'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER USER m114 WITH PASSWORD '$DB_PASS';"
else
  sudo -u postgres psql -c "CREATE USER m114 WITH PASSWORD '$DB_PASS';"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='m114'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE m114 OWNER m114;"

echo "==> Server settings (server/.env)"
cat > "$APP_DIR/server/.env" <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://m114:$DB_PASS@127.0.0.1:5432/m114
APP_URL=https://$DOMAIN
ADMIN_EMAILS=$ADMIN_EMAIL
MAIL_FROM=Memorize 114 <no-reply@$APEX>
SES_REGION=$SES_REGION
AWS_ACCESS_KEY_ID=$AWS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET
EOF
chown m114:m114 "$APP_DIR/server/.env"; chmod 600 "$APP_DIR/server/.env"

echo "==> Building"
cd "$APP_DIR/server" && sudo -u "$OWNER" npm ci --omit=dev --no-audit --no-fund
cd "$APP_DIR/web" && sudo -u "$OWNER" npm ci --no-audit --no-fund && sudo -u "$OWNER" npm run build
cd "$APP_DIR/server" && sudo -u m114 node src/migrate.js

echo "==> Service and web server"
cp "$APP_DIR/deploy/memorize114.service" /etc/systemd/system/memorize114.service
systemctl daemon-reload && systemctl enable memorize114 && systemctl restart memorize114
cp "$APP_DIR/deploy/nginx.conf" "$NGINX_SITE"
if [[ $PM == apt ]]; then ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/memorize114; rm -f /etc/nginx/sites-enabled/default; fi
chmod o+rx /opt "$APP_DIR" "$APP_DIR/web"
# SELinux (AlmaLinux/RHEL enforce it): let nginx read the site and talk to the API
if command -v getenforce >/dev/null && [[ $(getenforce) != Disabled ]]; then
  setsebool -P httpd_can_network_connect 1
  semanage fcontext -a -t httpd_sys_content_t "$APP_DIR/web/dist(/.*)?" 2>/dev/null || semanage fcontext -m -t httpd_sys_content_t "$APP_DIR/web/dist(/.*)?"
  restorecon -R "$APP_DIR/web/dist"
fi
nginx -t && systemctl reload nginx

echo "==> HTTPS certificate"
certbot --nginx -d "$DOMAIN" -d "$APEX" --redirect --agree-tos -m "$ADMIN_EMAIL" --non-interactive || \
  echo "!! certbot failed — check that both DNS records point to this server, then run: sudo certbot --nginx -d $DOMAIN -d $APEX --redirect"

sleep 1
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then echo "API is running."; else echo "!! API did not start — see: sudo journalctl -u memorize114 -n 50"; fi
echo
echo "Done. Open https://$DOMAIN and register with $ADMIN_EMAIL — that account becomes the administrator."
