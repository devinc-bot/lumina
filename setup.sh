#!/usr/bin/env bash

set -euo pipefail

# Requires a Bash environment with nvm installed, such as Git Bash or WSL.
nvm install lts
nvm use lts

corepack cache clean
corepack enable pnpm
corepack install -g pnpm@12.4.2
pnpm -v
