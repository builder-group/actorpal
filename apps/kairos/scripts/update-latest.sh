#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Update packages outside Expo's native compatibility matrix first
pnpm update --latest \
	'!typescript' \
	'!@expo/*' \
	'!expo' \
	'!expo-*' \
	'!react' \
	'!react-dom' \
	'!react-native' \
	'!react-native-*' \
	'!@react-native-async-storage/async-storage'

# Bump Expo separately, then let Expo align React and every native module
# https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
pnpm add expo@latest
pnpm exec expo install --fix
pnpm dlx expo-doctor@latest

if [[ -d ios ]]; then
	pnpm dlx pod-install@latest
fi
