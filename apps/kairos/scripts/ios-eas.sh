#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

VERSION="$(node -p "require('./app.json').expo.version")"
ARTIFACT_DIR="build/${VERSION}"
ARTIFACT_PATH="${ARTIFACT_DIR}/kairos-ios.ipa"

print_artifact_path() {
	printf '%s\n' "${ARTIFACT_PATH}"
}

ensure_command() {
	local command_name="$1"
	local install_hint="$2"

	if ! command -v "${command_name}" >/dev/null 2>&1; then
		printf 'Missing required command: %s\n' "${command_name}" >&2
		printf '%s\n' "${install_hint}" >&2
		exit 1
	fi
}

ensure_ios_build_prereqs() {
	ensure_command "fastlane" "Local EAS iOS builds require Fastlane. Install it with 'brew install fastlane' or 'gem install fastlane -NV', then restart your shell."
}

build_local_ios() {
	ensure_ios_build_prereqs
	mkdir -p "${ARTIFACT_DIR}"
	exec pnpm dlx eas-cli@latest build --platform ios --profile production --local --output "${ARTIFACT_PATH}"
}

submit_local_ios() {
	if [[ ! -f "${ARTIFACT_PATH}" ]]; then
		printf 'Missing local iOS artifact: %s\n' "${ARTIFACT_PATH}" >&2
		printf 'Run `pnpm run ios:build:local` first.\n' >&2
		exit 1
	fi

	exec pnpm dlx eas-cli@latest submit --platform ios --profile production --path "${ARTIFACT_PATH}"
}

case "${1:-}" in
	artifact-path)
		print_artifact_path
		;;
	build)
		build_local_ios
		;;
	submit)
		submit_local_ios
		;;
	*)
		printf 'Usage: %s <artifact-path|build|submit>\n' "${0##*/}" >&2
		exit 1
		;;
esac
