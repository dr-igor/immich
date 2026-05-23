# Fork-local task runner. Mirrors immich-app/immich's upstream
# .github/workflows/test.yml so `just test` passes locally iff the same code
# would pass upstream CI. Lives only on fork-main; never touch upstream files.

export CI := "true"

set shell := ["bash", "-cu"]
set dotenv-load := false

default:
    @just --list

# Check node version being used by commands
node:
    @which node
    @node --version

# ---- setup ---------------------------------------------------------------

# Build the typescript SDK that cli/web/e2e all depend on.
sdk:
    cd open-api/typescript-sdk && pnpm install --frozen-lockfile && pnpm build

install: sdk
    cd server && pnpm install --frozen-lockfile
    cd cli    && pnpm install --frozen-lockfile
    cd web    && pnpm install --frozen-lockfile
    cd e2e    && pnpm install --frozen-lockfile

# ---- per-package CI-parity recipes ---------------------------------------
# Recipe names match upstream job names in test.yml; when the workflow drifts
# upstream, a diff against this file shows what's new/missing.

server-unit-tests: sdk
    cd server && pnpm lint && pnpm format && pnpm check && pnpm test

test-server: sdk
    cd server && pnpm test:cov

cli-unit-tests: sdk
    cd cli && pnpm lint && pnpm format && pnpm check && pnpm test

test-cli: sdk
    cd cli && pnpm test

web-lint: sdk
    cd web && pnpm lint && pnpm format && pnpm check:svelte

web-unit-tests: sdk
    cd web && pnpm check:typescript && pnpm test

test-web: sdk
    cd web && pnpm test:cov

e2e-tests-lint: sdk
    cd e2e && pnpm lint && pnpm format && pnpm check

# Needs the libvips workaround at install time. Not in default `test`.
server-medium-tests:
    cd server && SHARP_IGNORE_GLOBAL_LIBVIPS=true pnpm install --frozen-lockfile && pnpm test:medium

i18n-tests:
    pnpm --filter=immich-i18n install --frozen-lockfile
    pnpm --filter=immich-i18n format:fix
    git diff --exit-code -- i18n/

# ---- aggregates ----------------------------------------------------------

check-and-test: server-unit-tests cli-unit-tests web-lint web-unit-tests e2e-tests-lint i18n-tests

test: test-server test-web test-cli

test-full: test server-medium-tests
