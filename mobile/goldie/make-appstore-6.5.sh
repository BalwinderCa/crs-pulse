#!/usr/bin/env bash
# Regenerate 6.5-inch App Store screenshots from goldie's 6.9-inch tiles.
#
# WHY: goldie only defines iphone-6.9 (1320x2868) and pixel-10-pro. App Store
# Connect's 6.5" slot rejects that, accepting only 1242x2688 / 2688x1242 /
# 1284x2778 / 2778x1284. This rescales to 1284x2778.
#
# The aspect ratios differ very slightly (1320/2868 = 0.46025 vs
# 1284/2778 = 0.46220), so a straight resize would stretch by ~0.4%. Instead we
# scale to 1284x2790 and centre-crop 6px off the top and bottom - no distortion,
# and the trim lands in the flat gradient margin, never on the device or copy.
#
# Alpha is stripped (-pix_fmt rgb24): App Store Connect rejects transparency.
#
# Re-run after ANY restyle in the studio, since it reads the rendered tiles.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="goldie/out/screenshots/iphone-6.9/en-US"
OUT="goldie/out/screenshots/app-store-6.5/en-US"

[ -d "$SRC" ] || { echo "No 6.9in tiles at $SRC - run 'goldie frame' first." >&2; exit 1; }
rm -rf "$OUT"; mkdir -p "$OUT"

for f in "$SRC"/*.png; do
  ffmpeg -y -loglevel error -i "$f" \
    -vf "scale=1284:2790:flags=lanczos,crop=1284:2778:0:6" \
    -pix_fmt rgb24 "$OUT/$(basename "$f")"
done

echo "Wrote $(ls -1 "$OUT" | wc -l | tr -d ' ') tiles to $OUT"
for f in "$OUT"/*.png; do
  printf '  %s  %s\n' "$(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{printf "%sx", $2}' | sed 's/x$//')" "$(basename "$f")"
done
