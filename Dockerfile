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
# The Noto Sans TC (zh-TW) subset pulls ~120 CJK woff2 chunks from gstatic; a
# single transient fetch failure aborts the build. Astro caches already-fetched
# files on disk within this RUN, so one retry resumes from cache and rides out
# a flaky chunk. ponytail: retry-once; add actions/cache if CI flakes persist.
RUN npm run build || (echo "build retry (font fetch)" && npm run build)

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

# Astro session store (configured as fs-lite base=/app/sessions in astro.config).
# Pre-create and hand it to uid 1000 (the node user we run as in k8s) so login
# can persist sessions; node_modules/.astro is root-owned and not writable.
RUN mkdir -p /app/sessions && chown 1000:1000 /app/sessions

# SQLite database dir (database: sqlite file:/app/data/emdash.db). A RWO PVC
# mounts over this at runtime; the mountpoint must exist and be writable by
# uid 1000 (pod fsGroup also grants the volume to gid 1000). better-sqlite3
# needs write on the DIR too, for the -wal/-shm sidecar files.
RUN mkdir -p /app/data && chown 1000:1000 /app/data

# EmDash runs schema migrations automatically on the first request for every
# dialect including Postgres (per the emdash deployment docs), so the server is
# the only entrypoint. `emdash init` is SQLite-only (--database takes a file
# path) and must NOT run here -- it would create a stray ./data.db and crash.
CMD ["node", "./dist/server/entry.mjs"]
