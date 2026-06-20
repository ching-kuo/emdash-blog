This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
npx emdash dev        # Start dev server (runs migrations, seeds, generates types)
npx emdash types      # Regenerate TypeScript types from schema
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout: header (wordmark, nav, live search, theme toggle), footer (about, social, navigate, widgets), EmDash wiring |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |
| `src/components/`        | Presentational components: Avatar, Byline, Button, Tag, Callout, CodeBlock, PostCard, TableOfContents, SocialLinks |
| `src/styles/`            | `tokens.css` (palette, type scale, spacing, light+dark), `base.css` (element + `.prose` styles), `theme.css` (the override surface) |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This template ships with `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Template

A blog with posts, pages, categories, tags, full-text search, and RSS. Designed for personal writing, technical writing, indie newsletters, and anything where the writing is the product. Warm editorial aesthetic ("Gene's Workspace"): Source Serif 4 body + headings, a single sienna accent on warm paper, Apple-HIG dark mode, real article structure with bylines and reading time. Bilingual zh-TW / en with CJK-aware fonts.

## Pages

| Page        | Path               | What it shows                                                                                          |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| Home        | `/`                | Featured post hero (large image + excerpt), latest posts grid                                          |
| All posts   | `/posts`           | Article count, full post list (PostCard rows: category chip, byline, date, excerpt, thumbnail)        |
| Post detail | `/posts/[slug]`    | Inline header (category + date + title + excerpt + byline), full-width hero, centred 680px serif `.prose` body, sticky right TOC rail (+ sidebar widgets), tags, author block, comments, continue-reading |
| Search      | `/search`          | Full-text search UI                                                                                    |
| Page        | `/pages/[slug]`    | Static page content (Portable Text)                                                                    |
| Category    | `/category/[slug]` | Posts filtered by category                                                                             |
| Tag         | `/tag/[slug]`      | Posts filtered by tag                                                                                  |
| RSS         | `/rss.xml`         | Generated feed                                                                                         |

## Schema

- `posts` collection: `title`, `featured_image`, `content` (Portable Text), `excerpt` (text).
- `pages` collection: `title`, `content` (Portable Text). Used for `/about` etc.
- Taxonomies: `category`, `tag`.
- Single `primary` menu (Home, About, Posts by default).

Site settings have `title` and `tagline`. The title is the header wordmark (the part after the first space takes the accent colour) and the footer brand; the tagline is the header sub-label and footer bio. The header also has live search (⌘K) and a light/dark/system theme toggle. Post cards lead with the post's primary **category** chip (links to `/category/…`); the full **tag** list shows on the article and at `/tag/…`.

## Visual character

Warm, editorial, text-forward. **Source Serif 4** (with **Noto Serif TC** for Han) on `--font-serif` carries body *and* headings; **Hanken Grotesk** (+ Noto Sans TC) on `--font-sans` is for nav, meta, tags, buttons; **JetBrains Mono** on `--font-mono` for code. Body is 18px (`--text-prose`) at 1.85 line-height on a ~680px measure (`--measure`).

Light is warm paper (`--bg` `#F5F0E8`) with warm ink; dark follows Apple HIG (warm true-dark base, elevation via progressively lighter surfaces, soft near-white text) -- a hand-tuned pair, not auto-inverted. A single restrained **sienna** accent: `--accent` `#AC4E2A` light, `#E2926A` dark. Don't add a second accent. Semantic hues (`--info`/`--warn`/`--success`/`--danger`) are reserved for callouts.

The article is the standout: a two-column reading view -- a centred body column capped at `--measure-wide` (~832px) with a sticky right **TOC rail** (table of contents + sidebar widgets). Category, date, and author byline sit inline above the title; the full tag list and an author block close the piece. Don't collapse the TOC rail on desktop -- the layout signals "this is something to read".

## Customisation

`src/styles/theme.css` is the only file to edit for visual changes -- it lists every design token as a commented default; uncomment and change to override (it is unlayered, so it always wins over the `@layer base` defaults). The canonical tokens live in `src/styles/tokens.css` (palette + type scale + spacing, light + dark) and the element/`.prose` styles in `src/styles/base.css`.

Dark mode is **class-based**: the header toggle cycles system → light → dark, setting a `theme` cookie and toggling `.dark` / `.light` on `<html>` (with `prefers-color-scheme` for first paint). To retheme dark mode, override a token inside `:root.dark { ... }` in `theme.css` (and `@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }` to also affect OS-dark first paint).

Fonts are configured in `astro.config.mjs` under `fonts:` (self-hosted via Astro's `<Font>` API; the build needs egress to `fonts.google.com`). To swap the body face, change the `name:` of the entry bound to `cssVariable: "--font-serif"` and keep its Noto Serif TC fallback for CJK. `--font-sans` is the UI face, `--font-mono` the code face.

Tokens worth knowing (full list in `theme.css`):

- Surfaces/borders: `--bg`, `--bg-deep`, `--surface-card`, `--surface-code`, `--surface-inline`, `--surface-raised`, `--border`, `--border-strong` (colour), `--border-hairline` / `--border-thick` (widths)
- Text colours: `--text-strong`, `--text-body`, `--text-muted`, `--text-faint`, `--text-code`
- Accent: `--accent`, `--accent-strong`, `--accent-soft`, `--on-accent`, `--link`, `--link-hover`; semantic `--info`/`--warn`/`--success`/`--danger` (+ `-soft`)
- `--font-serif`, `--font-sans`, `--font-mono`
- Type sizes: `--text-xs/sm/base/prose/lg/h3/h2/h1/display` -- **the body size is `--text-prose`** (because `--text-body` is a colour)
- Layout: `--measure` (680px body), `--measure-wide` (832px), `--wide-width` (1080px shell), `--header-height`
- `--space-1..9`, `--flow-gap`; `--radius-sm/md/lg/pill`; `--dur-fast/base/slow`, `--ease-out`; `--tracking-tight/label`

## What not to do

- Don't add a second accent colour or coloured section backgrounds. The palette is warm paper/ink and one sienna.
- Don't set body text in the sans face -- the serif (`--font-serif`) is the reading voice; sans is for UI/meta only. Don't swap a display face onto headings.
- Don't use `--text-body` as a font-size or `--border-strong` as a width -- those are colour tokens; use `--text-prose` and `--border-thick` / `--border-hairline`.
- Don't collapse the article's TOC rail on desktop -- it's part of the reading experience.
- Don't use stock blog copy ("Welcome to my blog", "Stay tuned for more"). Write a real tagline that says what this blog is about.
- Don't seed the home page with three identical placeholder posts. If you only have one real post, show one real post.
- Don't enable comments without a plan to moderate them.
