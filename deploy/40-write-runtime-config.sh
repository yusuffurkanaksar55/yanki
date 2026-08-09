#!/bin/sh
set -eu

require_value() {
  variable_name="$1"
  variable_value="$2"

  if [ -z "$variable_value" ]; then
    echo "$variable_name is required." >&2
    exit 1
  fi

  line_count="$(printf '%s\n' "$variable_value" | wc -l | tr -d ' ')"

  if [ "$line_count" -ne 1 ]; then
    echo "$variable_name must be a single-line value." >&2
    exit 1
  fi

  case "$variable_value" in
    *"$(printf '\r')"*|*"$(printf '\t')"*)
      echo "$variable_name contains an unsupported control character." >&2
      exit 1
      ;;
  esac
}

escape_json_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

require_value SUPABASE_PUBLIC_URL "${SUPABASE_PUBLIC_URL:-}"
require_value SUPABASE_ANON_KEY "${SUPABASE_ANON_KEY:-}"
require_value SUPABASE_UPSTREAM_URL "${SUPABASE_UPSTREAM_URL:-}"
require_value YANKI_SENSITIVE_GATEWAY_TOKEN "${YANKI_SENSITIVE_GATEWAY_TOKEN:-}"

if [ "${#YANKI_SENSITIVE_GATEWAY_TOKEN}" -lt 32 ]; then
  echo "YANKI_SENSITIVE_GATEWAY_TOKEN must contain at least 32 characters." >&2
  exit 1
fi

if [ "${#YANKI_SENSITIVE_GATEWAY_TOKEN}" -gt 256 ]; then
  echo "YANKI_SENSITIVE_GATEWAY_TOKEN must contain at most 256 characters." >&2
  exit 1
fi

case "$YANKI_SENSITIVE_GATEWAY_TOKEN" in
  *[!A-Za-z0-9_-]*)
    echo "YANKI_SENSITIVE_GATEWAY_TOKEN must use base64url characters only." >&2
    exit 1
    ;;
esac

case "$SUPABASE_PUBLIC_URL" in
  http://localhost*/supabase|http://127.0.0.1*/supabase|https://*/supabase)
    ;;
  *)
    echo "SUPABASE_PUBLIC_URL must be an HTTPS same-origin /supabase URL or a loopback development URL." >&2
    exit 1
    ;;
esac

case "$SUPABASE_UPSTREAM_URL" in
  http://*)
    upstream_authority="${SUPABASE_UPSTREAM_URL#http://}"
    ;;
  https://*)
    upstream_authority="${SUPABASE_UPSTREAM_URL#https://}"
    ;;
  *)
    echo "SUPABASE_UPSTREAM_URL must be an HTTP or HTTPS host origin." >&2
    exit 1
    ;;
esac

case "$upstream_authority" in
  ""|*[!A-Za-z0-9._:-]*)
    echo "SUPABASE_UPSTREAM_URL must contain only a host and optional port." >&2
    exit 1
    ;;
esac

escaped_url="$(escape_json_string "$SUPABASE_PUBLIC_URL")"
escaped_key="$(escape_json_string "$SUPABASE_ANON_KEY")"

cat > /usr/share/nginx/html/app-config.js <<EOF
window.__YANKI_CONFIG__ = {
  supabaseUrl: "$escaped_url",
  supabaseAnonKey: "$escaped_key"
};
EOF
