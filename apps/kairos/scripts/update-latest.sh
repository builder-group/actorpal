#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Note: Not using `pnpm update --latest`; Expo SDKs expect a compatible version set.
# Bump `expo` first, then let `expo install --fix` align the rest.
# https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
pnpm add expo@latest
npx expo install --fix
npx expo-doctor

if [[ -d ios ]]; then
	npx pod-install
fi
