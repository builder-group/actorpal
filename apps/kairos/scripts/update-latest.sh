#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Note: Not using `pnpm update --latest` here.
# Expo SDK upgrades need the Expo package bumped first, then Expo CLI must realign the rest
# of the Expo/RN dependency set for that SDK via `expo install --fix`.
pnpm add expo@latest
npx expo install --fix
npx expo-doctor

if [[ -d ios ]]; then
	npx pod-install
fi
