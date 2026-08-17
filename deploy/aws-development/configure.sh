#!/bin/sh

set -eu

confirmation="${AWS_DEVELOPMENT_WEB_CONFIRM:-}"
public_host="${YANKI_PUBLIC_HOST:-}"
app_source_dir="${YANKI_APP_SOURCE_DIR:-/home/ubuntu/yanki-app}"
supabase_dir="${YANKI_SUPABASE_DIR:-/home/ubuntu/yanki-supabase}"

read_environment_value() {
  key="$1"
  file="$2"

  awk -v key="$key" '
    index($0, key "=") == 1 {
      print substr($0, length(key) + 2)
      exit
    }
  ' "$file"
}

set_environment_value() {
  key="$1"
  value="$2"
  file="$3"
  temporary_file="$(mktemp "${file}.XXXXXX")"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (updated == 0) {
        print key "=" value
      }
    }
  ' "$file" > "$temporary_file"

  chown --reference="$file" "$temporary_file"
  chmod --reference="$file" "$temporary_file"
  mv "$temporary_file" "$file"
}

if [ "$confirmation" != "CONFIGURE_AWS_DEVELOPMENT_WEB" ]; then
  echo "AWS_DEVELOPMENT_WEB_CONFIRM=CONFIGURE_AWS_DEVELOPMENT_WEB is required." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root so secret snapshots and Docker changes stay protected." >&2
  exit 1
fi

case "$public_host" in
  ""|*/*|*:*|*[!A-Za-z0-9.-]*)
    echo "YANKI_PUBLIC_HOST must be a DNS hostname without a scheme, path, or port." >&2
    exit 1
    ;;
  *.supabase.co)
    echo "YANKI_PUBLIC_HOST must not target the former Supabase Cloud project." >&2
    exit 1
    ;;
esac

if [ ! -d "$app_source_dir/.git" ] || [ ! -f "$app_source_dir/Dockerfile" ]; then
  echo "YANKI_APP_SOURCE_DIR must be a checked-out Yanki repository." >&2
  exit 1
fi

if [ ! -f "$supabase_dir/docker-compose.yml" ] || [ ! -f "$supabase_dir/.env" ]; then
  echo "YANKI_SUPABASE_DIR must contain the self-hosted Supabase stack." >&2
  exit 1
fi

if ! getent ahostsv4 "$public_host" >/dev/null 2>&1; then
  echo "YANKI_PUBLIC_HOST must resolve before TLS deployment." >&2
  exit 1
fi

if [ "$(git -C "$app_source_dir" status --porcelain --untracked-files=no)" ]; then
  echo "The deployed Yanki repository must not contain tracked working-tree changes." >&2
  exit 1
fi

revision="$(git -C "$app_source_dir" rev-parse HEAD)"
short_revision="$(printf '%s' "$revision" | cut -c1-12)"
web_image="yanki-web:aws-development-${short_revision}"
environment_file="$supabase_dir/.env"
override_target="$supabase_dir/docker-compose.yanki.override.yml"
snapshot_root="/root/yanki-secret-snapshots"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

if ! systemctl cat yanki-backup.service >/dev/null 2>&1; then
  echo "The verified yanki-backup.service is required before deployment." >&2
  exit 1
fi

systemctl daemon-reload
systemctl start yanki-backup.service

if [ "$(systemctl show yanki-backup.service --property=Result --value)" != "success" ]; then
  echo "The pre-deployment backup did not complete successfully." >&2
  exit 1
fi

mkdir -p "$snapshot_root"
chmod 700 "$snapshot_root"
cp "$environment_file" "$snapshot_root/.env.pre-web-${stamp}"
chmod 600 "$snapshot_root/.env.pre-web-${stamp}"

if [ -f "$override_target" ]; then
  cp "$override_target" "$snapshot_root/docker-compose.yanki.override.yml.pre-web-${stamp}"
  chmod 600 "$snapshot_root/docker-compose.yanki.override.yml.pre-web-${stamp}"
fi

gateway_token="$(read_environment_value YANKI_SENSITIVE_GATEWAY_TOKEN "$environment_file")"

case "$gateway_token" in
  ""|*[!A-Za-z0-9_-]*)
    gateway_token="$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n')"
    ;;
esac

if [ "${#gateway_token}" -lt 32 ] || [ "${#gateway_token}" -gt 256 ]; then
  echo "The generated or existing gateway token is outside the supported length." >&2
  exit 1
fi

install -m 0644 \
  "$app_source_dir/deploy/aws-development/docker-compose.override.yml" \
  "$override_target"

set_environment_value ADDITIONAL_REDIRECT_URLS "https://${public_host}" "$environment_file"
set_environment_value API_EXTERNAL_URL "https://${public_host}/supabase/auth/v1" "$environment_file"
set_environment_value COMPOSE_FILE "docker-compose.yml:docker-compose.yanki.override.yml" "$environment_file"
set_environment_value SITE_URL "https://${public_host}" "$environment_file"
set_environment_value SUPABASE_PUBLIC_URL "https://${public_host}/supabase" "$environment_file"
set_environment_value YANKI_APP_SOURCE_DIR "$app_source_dir" "$environment_file"
set_environment_value YANKI_PUBLIC_HOST "$public_host" "$environment_file"
set_environment_value YANKI_SENSITIVE_GATEWAY_REQUIRED "true" "$environment_file"
set_environment_value YANKI_SENSITIVE_GATEWAY_TOKEN "$gateway_token" "$environment_file"
set_environment_value YANKI_WEB_IMAGE "$web_image" "$environment_file"
set_environment_value YANKI_WEB_OCI_REVISION "$revision" "$environment_file"
chmod 600 "$environment_file"

cd "$supabase_dir"
docker compose config --quiet
docker compose build yanki-web
docker compose pull caddy
docker compose up -d --wait api-gw supavisor auth functions yanki-web caddy

attempt=0
until curl \
  --fail \
  --silent \
  --show-error \
  --resolve "${public_host}:443:127.0.0.1" \
  "https://${public_host}/healthz" >/dev/null
do
  attempt=$((attempt + 1))

  if [ "$attempt" -ge 24 ]; then
    echo "The HTTPS application endpoint did not become healthy." >&2
    exit 1
  fi

  sleep 5
done

printf '%s\n' \
  "AWS_DEVELOPMENT_WEB=CONFIGURED" \
  "BACKUP=PASS" \
  "PUBLIC_ORIGIN=https://${public_host}" \
  "DEPLOYED_REVISION=${revision}" \
  "GATEWAY_REQUIRED=true" \
  "INTERNAL_PORTS=LOOPBACK" \
  "SECRET_VALUES_LOGGED=false" \
  "PRE_CHANGE_ENV_SNAPSHOT=.env.pre-web-${stamp}"
