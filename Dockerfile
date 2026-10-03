# Zaczyn app + worker image (same image, different command).
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN BUILDING=1 pnpm i18n:compile && BUILDING=1 pnpm build && pnpm prune --prod --config.ignore-scripts=true

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/data ./data
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
EXPOSE 3000
# app: node build   ·   worker: node --import tsx src/worker.ts
CMD ["node", "build"]
