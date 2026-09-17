#!/bin/sh

set -eu

extension_name="album-archive.js"
release_tag="spicetify-v0.2.0-beta.2"
default_url="https://github.com/Ashtroyd/bazcario-album-archive/releases/download/${release_tag}/${extension_name}"
extension_url="${ALBUM_ARCHIVE_EXTENSION_URL:-$default_url}"

if ! command -v spicetify >/dev/null 2>&1; then
  echo "Spicetify is not installed or is not available on PATH." >&2
  echo "Install it from https://spicetify.app/docs/getting-started/ first." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download Album Archive." >&2
  exit 1
fi

config_path="$(spicetify -c)"
config_dir="$(dirname "$config_path")"
extensions_dir="$config_dir/Extensions"
destination="$extensions_dir/$extension_name"
temporary_file="$(mktemp "${TMPDIR:-/tmp}/album-archive.XXXXXX")"
trap 'rm -f "$temporary_file"' EXIT HUP INT TERM

mkdir -p "$extensions_dir"
echo "Downloading Album Archive for Spicetify..."
curl -fsSL "$extension_url" -o "$temporary_file"

if ! grep -q "Album Archive" "$temporary_file"; then
  echo "The downloaded file does not look like the Album Archive extension." >&2
  exit 1
fi

chmod 0644 "$temporary_file"
mv "$temporary_file" "$destination"
trap - EXIT HUP INT TERM

enabled_extensions="$(spicetify config extensions)"
case "|$enabled_extensions|" in
  *"|$extension_name|"*) ;;
  *) spicetify config extensions "$extension_name" ;;
esac

spicetify apply

echo
echo "Album Archive is installed."
echo "Open Spotify, select Album Archive, and connect with a token from:"
echo "https://bazcario-album-archive.vercel.app/profile"
