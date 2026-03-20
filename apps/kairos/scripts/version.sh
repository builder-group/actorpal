#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

BUMP_TYPE="${1:-patch}"

case "${BUMP_TYPE}" in
	patch|minor|major)
		;;
	*)
		printf 'Usage: %s [patch|minor|major]\n' "${0##*/}" >&2
		exit 1
		;;
esac

BUMP_TYPE="${BUMP_TYPE}" node <<'NODE'
const fs = require('node:fs');

const packageJsonPath = './package.json';
const appJsonPath = './app.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const currentAppVersion = appJson?.expo?.version;
const bumpType = process.env.BUMP_TYPE;

if (typeof currentVersion !== 'string') {
	throw new Error('package.json version must be a string');
}

if (appJson?.expo == null || typeof appJson.expo.version !== 'string') {
	throw new Error('app.json expo.version must be a string');
}

const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);

if (!match) {
	throw new Error(`Unsupported version format: ${currentVersion}`);
}

let [major, minor, patch] = match.slice(1).map(Number);

switch (bumpType) {
	case 'major':
		major += 1;
		minor = 0;
		patch = 0;
		break;
	case 'minor':
		minor += 1;
		patch = 0;
		break;
	case 'patch':
		patch += 1;
		break;
	default:
		throw new Error(`Unsupported bump type: ${bumpType}`);
}

const nextVersion = `${major}.${minor}.${patch}`;

packageJson.version = nextVersion;
appJson.expo.version = nextVersion;

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, '\t')}\n`);
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, '\t')}\n`);

console.log(`package.json: ${currentVersion} -> ${nextVersion}`);
console.log(`app.json: ${currentAppVersion} -> ${nextVersion}`);
NODE
