import node from "@astrojs/node";
import react from "@astrojs/react";
import auditLog from "@emdash-cms/plugin-audit-log";
import { defineConfig, fontProviders, sessionDrivers } from "astro/config";
import emdash, { s3 } from "emdash/astro";
import { sqlite } from "emdash/db";

// cdn.igene.tw -- WordPress -> EmDash migration target.
// Runtime config is read from environment variables injected by the k8s
// deployment (SOPS-managed secrets); nothing secret lives in this repo.
// See the k8s-infra repo: emdash/migration-procedure.md.
export default defineConfig({
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	// Bilingual blog. zh-TW is the default locale (no URL prefix); en lives
	// under /en/. EmDash content is locale-aware at the data layer.
	i18n: {
		defaultLocale: "zh-TW",
		locales: ["zh-TW", "en"],
		fallback: { en: "zh-TW" },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	// The Node adapter defaults Astro session storage to a filesystem dir under the
	// project cacheDir (.astro/...), which does not exist and is not writable in the
	// production image (we run as the non-root uid 1000). Login writes a session ->
	// ENOENT. Point the store at a dedicated dir the Dockerfile creates and chowns to
	// uid 1000. Astro 6 takes a driver FACTORY (sessionDrivers.fsLite), not a string;
	// fsLite skips file-watching, which is pointless server-side. base is inlined at
	// build time, so it must be a fixed path, not an env var.
	// ponytail: fs sessions are per-pod and reset on restart -- fine at replicas: 1.
	// For multi-replica, switch to a shared driver (e.g. redis) so logins don't bounce.
	session: {
		driver: sessionDrivers.fsLite({ base: "/app/sessions" }),
	},
	integrations: [
		react(),
		emdash({
			// Required behind a TLS-terminating reverse proxy (the shared Cilium
			// gateway). Drives passkeys, CSRF, OAuth redirects, structured data.
			// Locked after the first setup call -- set before bootstrapping.
			siteUrl: process.env.EMDASH_SITE_URL,
			// SQLite (better-sqlite3) on a RWO PVC mounted at /app/data. EmDash's
			// Postgres dialect is buggy in 0.21.0 (json-column DISTINCT, 404-log
			// ambiguous `hits`, plugin-storage `text ->>`); SQLite is the primary,
			// well-tested backend and sidesteps all of it. The path is build-frozen
			// (EmDash bakes `database` config at build time), so it must be a fixed
			// absolute path, not an env var. Single-writer is fine at replicas: 1.
			database: sqlite({ url: "file:/app/data/emdash.db" }),
			// s3() reads S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY/REGION/
			// PUBLIC_URL from env at runtime. forcePathStyle is hardcoded on inside
			// the adapter, so Ceph RGW works without any toggle. With S3_PUBLIC_URL
			// unset, media is proxied via /_emdash/api/media/file/{key}.
			storage: s3(),
			// Required for working per-IP rate limits behind the Cilium Gateway /
			// Envoy (which populates x-forwarded-for). Without it, auth and comment
			// rate limits collapse to one shared bucket.
			trustedProxyHeaders: (process.env.EMDASH_TRUSTED_PROXY_HEADERS ?? "x-forwarded-for")
				.split(",")
				.map((h) => h.trim())
				.filter(Boolean),
			// Cap uploads to match the ingress / proxy body-size limit (50 MiB).
			maxUploadSize: 50 * 1024 * 1024,
			plugins: [auditLog],
		}),
	],
	// Build-time fonts via Astro's native font API (downloads from Google during
	// `astro build` -- the build/CI environment needs egress to fonts.google.com).
	// Editorial pairing: Source Serif 4 for body + headings (long-form reading),
	// Hanken Grotesk for UI/meta, JetBrains Mono for code. Each Latin face lists
	// its Traditional Chinese companion in `fallbacks`, so Han codepoints fall
	// through to the matching Noto TC face while Latin glyphs stay in the Latin
	// font. The TC faces are registered (loaded) but not preloaded -- CJK files
	// are large and load on demand via the fallback chain.
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Source Serif 4",
			cssVariable: "--font-serif",
			weights: [400, 500, 600, 700],
			fallbacks: [
				"Noto Serif TC",
				"Songti TC",
				"PingFang TC",
				"Georgia",
				"serif",
			],
		},
		{
			// Traditional Chinese serif companion for --font-serif (body + headings).
			provider: fontProviders.google(),
			name: "Noto Serif TC",
			cssVariable: "--font-serif-tc",
			weights: [400, 500, 600, 700],
			subsets: ["latin", "chinese-traditional"],
			fallbacks: ["serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Hanken Grotesk",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			// Latin renders in Hanken; Han characters fall through to Noto Sans TC.
			fallbacks: [
				"Noto Sans TC",
				"-apple-system",
				"BlinkMacSystemFont",
				"Segoe UI",
				"sans-serif",
			],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500, 700],
			fallbacks: ["Noto Sans TC", "monospace"],
		},
		{
			// Traditional Chinese (zh-TW) UI/meta companion for --font-sans. CJK
			// glyph sets are large, so we keep to three weights and the
			// chinese-traditional + latin subsets, and do NOT preload (loaded on
			// demand via the fallback chain rather than by referencing it directly).
			provider: fontProviders.google(),
			name: "Noto Sans TC",
			cssVariable: "--font-sans-tc",
			weights: [400, 500, 700],
			subsets: ["latin", "chinese-traditional"],
			fallbacks: ["sans-serif"],
		},
	],
	devToolbar: { enabled: false },
});
