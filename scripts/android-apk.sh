#!/bin/zsh
# Android Release APK üretir (arm64, debug anahtarıyla imzalı — telefona doğrudan kurulabilir).
# Kullanım: ./scripts/android-apk.sh
set -e
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
cd "$(dirname "$0")/.."
[ -d android ] || CI=1 npx expo prebuild --platform android --no-install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android
[ -d . ] && ./gradlew assembleRelease -x lint -PreactNativeArchitectures=arm64-v8a
APK=app/build/outputs/apk/release/app-release.apk
cp "$APK" ../Mezatonline.apk
echo "✓ APK hazır: $(cd .. && pwd)/Mezatonline.apk"
