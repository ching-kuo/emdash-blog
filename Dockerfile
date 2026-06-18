# node:22-slim (Debian/glibc), NOT alpine: emdash depends on better-sqlite3,
# whose prebuilt binaries target glibc. Alpine (musl) would force a source
# compile and need a full build toolchain. slim uses the prebuild directly.
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# astro build downloads fonts from fonts.google.com -- the build environment
# needs outbound HTTPS. No runtime secrets are required at build time.
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/seed ./seed
COPY --from=builder /app/astro.config.mjs ./

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

# `npx emdash init` runs schema migrations against DATABASE_URL (Postgres/CNPG)
# on every start. It is idempotent.
CMD ["sh", "-c", "npx emdash init && node ./dist/server/entry.mjs"]
