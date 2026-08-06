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

escaped_url="$(escape_json_string "$SUPABASE_PUBLIC_URL")"
escaped_key="$(escape_json_string "$SUPABASE_ANON_KEY")"

cat > /usr/share/nginx/html/app-config.js <<EOF
window.__YANKI_CONFIG__ = {
  supabaseUrl: "$escaped_url",
  supabaseAnonKey: "$escaped_key"
};
EOF
