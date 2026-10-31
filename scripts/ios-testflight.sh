#!/usr/bin/env bash
# Xcode ile TestFlight arşivi oluşturur; --upload verilirse Apple'a yükler.
set -euo pipefail

DESTINATION=export
if [[ $# -gt 1 ]]; then
  printf 'Kullanım: %s [--upload | --help]\n' "$0" >&2
  exit 2
fi
case "${1:-}" in
  --help|-h)
    printf 'Kullanım: %s [--upload]\n' "$0"
    printf 'Varsayılan: Xcode ile Release arşivi ve App Store Connect için yerel IPA oluşturur.\n'
    printf '%s\n' '--upload: Arşivi oluşturur ve App Store Connect / TestFlight’a yükler.'
    printf 'Xcode Apple hesabı ve ücretli Apple Developer üyeliği gerekir. Expo/EAS hesabı ve Expo Go gerekmez.\n'
    exit 0
    ;;
  --upload) DESTINATION=upload ;;
  '') ;;
  *)
    printf 'Bilinmeyen argüman. Yardım: %s --help\n' "$0" >&2
    exit 2
    ;;
esac

cd "$(dirname "${BASH_SOURCE[0]}")/.."
PROJECT_DIR="$PWD"
WORKSPACE="$PROJECT_DIR/ios/Mezatonline.xcworkspace"

if [[ ! -d "$WORKSPACE" ]]; then
  printf 'iOS workspace bulunamadı: %s\n' "$WORKSPACE" >&2
  exit 1
fi

BUNDLE_ID="$(node -p 'require("./app.json").expo.ios.bundleIdentifier ?? ""')"
TEAM_ID="$(node -p 'require("./app.json").expo.ios.appleTeamId ?? ""')"
APP_VERSION="$(node -p 'require("./app.json").expo.version ?? ""')"
BUILD_NUMBER="$(node -p 'require("./app.json").expo.ios.buildNumber ?? ""')"

if [[ ! "$BUNDLE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ || ! "$TEAM_ID" =~ ^[A-Z0-9]{10}$ || ! "$APP_VERSION" =~ ^[0-9]+(\.[0-9]+){0,2}$ || ! "$BUILD_NUMBER" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]]; then
  printf 'app.json içindeki iOS bundleIdentifier, appleTeamId, version ve buildNumber değerlerini kontrol et.\n' >&2
  exit 1
fi

ARCHIVE_DIR="$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)"
ARCHIVE_NAME="Mezatonline-$(date +%H%M%S)-$$"
ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_NAME.xcarchive"
EXPORT_PATH="$ARCHIVE_DIR/$ARCHIVE_NAME-export"
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/Mezatonline-device"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mezatonline-testflight.XXXXXX")"
EXPORT_OPTIONS="$TEMP_DIR/ExportOptions.plist"
trap 'rm -f "$EXPORT_OPTIONS"; rmdir "$TEMP_DIR" 2>/dev/null || true' EXIT

cat > "$EXPORT_OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$DESTINATION</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>testFlightInternalTestingOnly</key><false/>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><true/>
</dict>
</plist>
PLIST

mkdir -p "$ARCHIVE_DIR"
printf '▶ Xcode Release arşivi oluşturuluyor: %s (%s)…\n' "$APP_VERSION" "$BUILD_NUMBER"
xcodebuild -workspace "$WORKSPACE" -scheme Mezatonline -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED_DATA" -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION="$APP_VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" archive

ARCHIVED_APP="$(/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:ApplicationPath' "$ARCHIVE_PATH/Info.plist")"
APP_INFO="$ARCHIVE_PATH/Products/$ARCHIVED_APP/Info.plist"
ARCHIVED_BUNDLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_INFO")"
ARCHIVED_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_INFO")"
ARCHIVED_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_INFO")"
if [[ "$ARCHIVED_BUNDLE" != "$BUNDLE_ID" || "$ARCHIVED_VERSION" != "$APP_VERSION" || "$ARCHIVED_BUILD" != "$BUILD_NUMBER" ]]; then
  printf 'Arşiv bundle/sürüm bilgileri app.json ile eşleşmiyor; yerel iOS yapılandırmasını eşitleyip yeniden dene.\n' >&2
  exit 1
fi

printf '▶ App Store Connect dağıtımı hazırlanıyor (%s)…\n' "$DESTINATION"
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" -exportOptionsPlist "$EXPORT_OPTIONS" -allowProvisioningUpdates

printf '\n✓ Arşiv: %s\n' "$ARCHIVE_PATH"
if [[ "$DESTINATION" == upload ]]; then
  printf '✓ App Store Connect yüklemesi tamamlandı. TestFlight bölümünde Apple işlemesini bekle.\n'
  printf 'Dış test grubuna ekleyip ilk beta incelemesinden sonra davet bağlantısını paylaş.\n'
  printf 'Bu işlem uygulamayı App Store’da herkese açık yayımlamaz.\n'
else
  printf '✓ Yerel dağıtım dosyaları: %s\n' "$EXPORT_PATH"
  printf 'Henüz Apple’a yüklenmedi. Arşivi Xcode Organizer ile veya IPA dosyasını Transporter ile yükleyebilirsin.\n'
fi
