#!/bin/zsh
# Mezatonline'ı bağlı iPhone'a Release (Metro gerektirmeyen) olarak derleyip yükler.
# Kullanım: ./scripts/ios-device.sh
set -e
cd "$(dirname "$0")/../ios"
TEAM=4N6B7MPCY3
DD=~/Library/Developer/Xcode/DerivedData/Mezatonline-device   # Masaüstü (iCloud) dışında olmalı
APP=$DD/Build/Products/Release-iphoneos/Mezatonline.app

echo "▶ iOS Release derleniyor…"
xcodebuild -workspace Mezatonline.xcworkspace -scheme Mezatonline -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$DD" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=$TEAM CODE_SIGN_STYLE=Automatic build | tail -2

DEVICE=$(xcrun devicectl list devices 2>/dev/null | awk '/iPhone/ && $4 == "available" {print $3; exit}')
if [ -z "$DEVICE" ]; then
  echo "✗ Bağlı iPhone bulunamadı. Telefonu kabloyla bağla, kilidini aç ve tekrar dene."
  exit 1
fi
echo "▶ $DEVICE cihazına yükleniyor…"
xcrun devicectl device install app --device "$DEVICE" "$APP"
echo "✓ Kuruldu. Telefonda Mezatonline'ı aç."
