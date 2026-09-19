# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable

FROM base AS dependencies

ENV CI=true \
    HUSKY=0

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validators/package.json packages/validators/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --filter @repo/api...

FROM dependencies AS source

COPY tsconfig.json ./tsconfig.json
COPY apps/api apps/api
COPY packages packages

FROM source AS api-build

RUN pnpm --filter @repo/api build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm deploy --legacy --filter @repo/api --prod /output \
    && find /output/dist -type f -name '*.d.ts' -delete

FROM source AS migrator-build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm deploy --legacy --filter @repo/db /output

FROM node:24-bookworm-slim AS migrator

ENV NODE_ENV=production

WORKDIR /app

COPY --from=migrator-build --chown=node:node /output/package.json ./package.json
COPY --from=migrator-build --chown=node:node /output/node_modules ./node_modules
COPY --from=migrator-build --chown=node:node /output/drizzle.config.ts ./drizzle.config.ts
COPY --from=migrator-build --chown=node:node /output/src/config ./src/config
COPY --from=migrator-build --chown=node:node /output/src/migrations-postgresql ./src/migrations-postgresql

USER node

CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate", "--config=drizzle.config.ts"]

FROM source AS db-tools

USER node

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=api-build --chown=node:node /output/package.json ./package.json
COPY --from=api-build --chown=node:node /output/node_modules ./node_modules
COPY --from=api-build --chown=node:node /output/dist ./dist
COPY --from=api-build --chown=node:node /workspace/tsconfig.json ./tsconfig.json

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "--import", "tsx", "dist/main.js"]
