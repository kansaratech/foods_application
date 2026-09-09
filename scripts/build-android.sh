#!/usr/bin/env bash
# Local Android build for a LocalSell app.
#
#   scripts/build-android.sh <app> [abis] [gradleTask]
#     <app>       customer | store | rider
#     [abis]      comma list, default "arm64-v8a" (add armeabi-v7a for old phones,
#                 x86_64 for emulators). "all" = arm64-v8a,armeabi-v7a,x86,x86_64.
#     [gradleTask] default "assembleRelease" (.apk). Use "bundleRelease" for a
#                 Play .aab.
#
# Sources <app>/.env.production for the build. Gradle cache is forced onto D:
# (GRADLE_USER_HOME) so it doesn't fill the C: system drive — override by
# exporting GRADLE_USER_HOME before calling.
set -euo pipefail

APP="${1:?usage: build-android.sh <customer|store|rider> [abis] [gradleTask]}"
ABIS="${2:-arm64-v8a}"
TASK="${3:-assembleRelease}"
[ "$ABIS" = "all" ] && ABIS="arm64-v8a,armeabi-v7a,x86,x86_64"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/localsell-$APP"
[ -d "$DIR" ] || { echo "no such app: $DIR" >&2; exit 1; }

export GRADLE_USER_HOME="${GRADLE_USER_HOME:-D:/gradle-home}"
echo "app=$APP  abis=$ABIS  task=$TASK  GRADLE_USER_HOME=$GRADLE_USER_HOME"

cd "$DIR"
set -a; . ./.env.production; set +a
echo "API: ${EXPO_PUBLIC_GRAPHQL_URL:-<unset>}"

npx expo prebuild --clean -p android

cd android
./gradlew "$TASK" -PreactNativeArchitectures="$ABIS" --console=plain

echo
find app/build/outputs -name "*.apk" -o -name "*.aab" | while read -r f; do
  printf '  %s  (%s)\n' "$f" "$(du -h "$f" | cut -f1)"
done
