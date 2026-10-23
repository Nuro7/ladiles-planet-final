#!/usr/bin/env bash
# Runs on the Lightsail instance (Amazon Linux 2023). Idempotent: safe to re-run for redeploys.
set -euo pipefail

APP=/home/ec2-user/app
WEB=/var/www/ladies-planet
PUBLIC_HOST="${PUBLIC_HOST:-15.206.253.153}"
# Hostname for HTTPS (Let's Encrypt cannot issue for a bare IP).
DOMAIN="${DOMAIN:-${PUBLIC_HOST//./-}.sslip.io}"
# Optional contact for Let's Encrypt expiry notices; renewals are automatic either way.
CERT_EMAIL="${CERT_EMAIL:-}"

echo "==> System packages"
sudo dnf install -y -q nginx git tar unzip >/dev/null
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash - >/dev/null
  sudo dnf install -y -q nodejs >/dev/null
fi
command -v pm2 >/dev/null || sudo npm i -g pm2 --silent

if [ ! -f /swapfile ]; then
  echo "==> 2 GB swap"
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

if [ -z "${HIGGSFIELD_OWNER_USER_ID:-}" ] && ! grep -qs "^HIGGSFIELD_OWNER_USER_ID=." /home/ec2-user/ladies-secrets.env /home/ec2-user/backend.env; then
  echo "ERROR: HIGGSFIELD_OWNER_USER_ID is not set; the backend refuses to start in production without it." >&2
  echo "Nothing was changed. Re-run with: deploy-lightsail.ps1 -OwnerUserId <Supabase user UID>" >&2
  exit 1
fi

echo "==> Unpack code"
mkdir -p "$APP"
tar -xzf /home/ec2-user/ladies-code.tgz -C "$APP"
[ -f /home/ec2-user/backend.env ] && mv /home/ec2-user/backend.env "$APP/backend/.env"
[ -f /home/ec2-user/frontend.env ] && mv /home/ec2-user/frontend.env "$APP/frontend/.env"
[ -f "$APP/backend/.env" ] || cp "$APP/backend/.env.example" "$APP/backend/.env"
[ -f "$APP/frontend/.env" ] || cp "$APP/frontend/.env.example" "$APP/frontend/.env"

# Production overrides; the rest of .env stays as provided.
set_env() { if grep -q "^$1=" "$3"; then sed -i "s|^$1=.*|$1=$2|" "$3"; else echo "$1=$2" >> "$3"; fi; }
set_env NODE_ENV production "$APP/backend/.env"
set_env HOST 127.0.0.1 "$APP/backend/.env"
set_env PORT 5050 "$APP/backend/.env"
set_env HIGGSFIELD_OAUTH_REDIRECT_URI "https://$DOMAIN/api/higgsfield-oauth/callback" "$APP/backend/.env"
set_env FRONTEND_URL "https://$DOMAIN" "$APP/backend/.env"
set_env TRUSTED_PROXY_CIDRS "127.0.0.1/32,::1/128" "$APP/backend/.env"
set_env ALLOW_LOCAL_DEV_AUTH false "$APP/backend/.env"

# Server-only secrets live outside the uploaded .env so redeploys never rotate them
# (a new HIGGSFIELD_TOKEN_ENCRYPTION_KEY would make the saved Higgsfield login unreadable).
SECRETS=/home/ec2-user/ladies-secrets.env
touch "$SECRETS" && chmod 600 "$SECRETS"
grep -q "^MEDIA_SESSION_SECRET=." "$SECRETS" || echo "MEDIA_SESSION_SECRET=$(openssl rand -hex 32)" >> "$SECRETS"
grep -q "^HIGGSFIELD_TOKEN_ENCRYPTION_KEY=." "$SECRETS" || echo "HIGGSFIELD_TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> "$SECRETS"
# Production only lets this Supabase user connect Higgsfield; pass it once via env and it is remembered.
[ -n "${HIGGSFIELD_OWNER_USER_ID:-}" ] && set_env HIGGSFIELD_OWNER_USER_ID "$HIGGSFIELD_OWNER_USER_ID" "$SECRETS"
# Split on the first '=' only: base64 values end in '=' padding that `read` would strip.
while IFS= read -r line; do [ -n "$line" ] && set_env "${line%%=*}" "${line#*=}" "$APP/backend/.env"; done < "$SECRETS"
# Don't leak this script's variables into the pm2 process: dotenv never overrides an existing (even empty) variable.
unset HIGGSFIELD_OWNER_USER_ID
if ! grep -q "^HIGGSFIELD_OWNER_USER_ID=." "$APP/backend/.env"; then
  echo "ERROR: HIGGSFIELD_OWNER_USER_ID is not set; the backend refuses to start in production without it." >&2
  echo "Re-run with: deploy-lightsail.ps1 -OwnerUserId <Supabase user UID>" >&2
  exit 1
fi
set_env VITE_API_URL /api "$APP/frontend/.env"

if [ -f /home/ec2-user/ladies-media.zip ]; then
  echo "==> Restore media"
  unzip -oq /home/ec2-user/ladies-media.zip -d "$APP"
fi

echo "==> Backend"
cd "$APP/backend" && npm ci --omit=dev --no-audit --no-fund --loglevel=error
# Recreate the process so it starts from a clean environment and reads everything from .env.
pm2 kill >/dev/null 2>&1 || true
env -i HOME="$HOME" PATH="$PATH" pm2 start server.js --name ladies-backend --kill-timeout 300000
pm2 save >/dev/null
sudo env PATH="$PATH" pm2 startup systemd -u ec2-user --hp /home/ec2-user >/dev/null

echo "==> Frontend build"
cd "$APP/frontend" && npm ci --no-audit --no-fund --loglevel=error && npm run build
sudo mkdir -p "$WEB" && sudo rm -rf "$WEB"/* && sudo cp -r dist/* "$WEB"/

echo "==> nginx"
sudo tee /etc/nginx/conf.d/ladies-planet.conf >/dev/null <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN _;
    root $WEB;
    index index.html;
    client_max_body_size 200M;

    location /api/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # PWA: the service worker, manifest and app shell must be revalidated on every load,
    # or tablets keep running an old version; hashed build assets can be cached forever.
    location = /sw.js {
        add_header Cache-Control "no-cache";
        try_files \$uri =404;
    }
    location = /manifest.webmanifest {
        default_type application/manifest+json;
        add_header Cache-Control "no-cache";
        try_files \$uri =404;
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
# The stock nginx.conf server block also claims port 80; drop its default_server flag if present.
sudo sed -i 's/listen\(\s\+\)\(\[::\]:\)\?80 default_server;/listen\1\280;/' /etc/nginx/nginx.conf
command -v setsebool >/dev/null && sudo setsebool -P httpd_can_network_connect 1 2>/dev/null || true
sudo nginx -t
sudo systemctl enable --now nginx >/dev/null && sudo systemctl reload nginx

echo "==> HTTPS for $DOMAIN"
if ! command -v certbot >/dev/null; then
  sudo dnf install -y -q augeas-libs python3 >/dev/null
  sudo python3 -m venv /opt/certbot
  sudo /opt/certbot/bin/pip install -q certbot certbot-nginx
  sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
fi
# Obtains the cert on first run; on redeploys it reuses it and re-adds the SSL block nginx.conf rewrite removed.
if [ -n "$CERT_EMAIL" ]; then CONTACT=(-m "$CERT_EMAIL"); else CONTACT=(--register-unsafely-without-email); fi
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos "${CONTACT[@]}" --redirect --keep-until-expiring
command -v crond >/dev/null || sudo dnf install -y -q cronie >/dev/null
echo "0 3 * * * root /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot-renew >/dev/null
sudo systemctl enable --now crond >/dev/null
# Certbot's port-80 block 404s any host but $DOMAIN; send the bare IP to the HTTPS site instead.
sudo sed -i "s|return 404; # managed by Certbot|return 301 https://$DOMAIN\$request_uri;|" /etc/nginx/conf.d/ladies-planet.conf
sudo nginx -t -q && sudo systemctl reload nginx

echo "==> Health check"
sleep 3
pm2 status ladies-backend --no-color | tail -n +1
curl -s -o /dev/null -w "frontend https %{http_code}\n" "https://$DOMAIN/"
curl -s -o /dev/null -w "api https %{http_code}\n" "https://$DOMAIN/api/pricing"
echo "Done: https://$DOMAIN/studio/cinematic"
