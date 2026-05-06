#!/usr/bin/env bash
# ============================================================
# Build + publish the client shipping package
# Usage:
#   ./deploy/build-package.sh          # build only
#   ./deploy/build-package.sh --release  # build + push GitHub Release
# Requires: gh CLI logged in for --release
# ============================================================

set -e

RELEASE=false
for arg in "$@"; do [[ "$arg" == "--release" ]] && RELEASE=true; done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PKG_DIR="$SCRIPT_DIR/package"
OUT="$PKG_DIR/KaterinaERP-Setup"
ZIP="$PKG_DIR/KaterinaERP-Setup.zip"

# ── Build Nuxt ───────────────────────────────────────────────
echo "▶ Building Nuxt app..."
cd "$PROJECT_DIR"
npm run build

# ── Assemble package folder ──────────────────────────────────
echo "▶ Assembling package..."
rm -rf "$OUT"
mkdir -p "$OUT/app/.output"
mkdir -p "$OUT/app/migrations"

cp -r "$PROJECT_DIR/.output/"*              "$OUT/app/.output/"
cp "$PROJECT_DIR/server/db/migrations/"*.sql "$OUT/app/migrations/" 2>/dev/null || true
cp "$SCRIPT_DIR/install.ps1"                "$OUT/"
cp "$SCRIPT_DIR/update.ps1"                 "$OUT/"

# ── Zip ──────────────────────────────────────────────────────
echo "▶ Zipping..."
rm -f "$ZIP"
cd "$PKG_DIR"
zip -r "KaterinaERP-Setup.zip" "KaterinaERP-Setup/" -x "*.DS_Store"

echo ""
echo "✓ Package: $ZIP"
echo "  Size: $(du -sh "$ZIP" | cut -f1)"

# ── GitHub Release ───────────────────────────────────────────
if [ "$RELEASE" = true ]; then
  echo ""
  echo "▶ Publishing GitHub Release..."

  # Auto-generate version tag: v + date (e.g. v2026.05.06)
  TAG="v$(date +%Y.%m.%d)"

  # Delete tag if it already exists (re-release same day)
  gh release delete "$TAG" --yes 2>/dev/null || true
  git tag -d "$TAG" 2>/dev/null || true
  git push origin ":refs/tags/$TAG" 2>/dev/null || true

  gh release create "$TAG" "$ZIP" "$SCRIPT_DIR/launch.bat" \
    --title "Katerina ERP $TAG" \
    --notes "Internal release $TAG — install by running launch.bat" \
    --latest

  echo ""
  echo "✓ Released: $TAG"
  echo ""
  echo "Share this link with the client:"
  echo "  $(gh release view "$TAG" --json url -q .url)"
  echo ""
  echo "Direct download for launch.bat:"
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  echo "  https://github.com/$REPO/releases/latest/download/launch.bat"
fi

echo ""
echo "Done."
