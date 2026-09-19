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
COPY apps/admin/package.json apps/admin/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/validators/package.json packages/validators/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --filter @repo/admin...

FROM dependencies AS build

ARG VITE_API_URL

ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.json ./tsconfig.json
COPY apps/admin apps/admin
COPY packages packages
COPY deploy/tanstack-start-server.mjs deploy/tanstack-start-server.mjs

RUN pnpm --filter @repo/admin build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm deploy --legacy --filter @repo/admin --prod /output

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3003

WORKDIR /app

COPY --from=build --chown=node:node /output/package.json ./package.json
COPY --from=build --chown=node:node /output/node_modules ./node_modules
COPY --from=build --chown=node:node /output/dist ./dist
COPY --from=build --chown=node:node /workspace/deploy/tanstack-start-server.mjs ./server.mjs

USER node

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3003/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.mjs"]
