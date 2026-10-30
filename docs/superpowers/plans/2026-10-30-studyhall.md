# StudyHall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Track steps below.

**Goal:** Build a local-documentation PWA for Chrome/Edge desktop, hosted at studyhall.skttl.dev through GitHub Pages.

**Architecture:** A static TypeScript/Vite application reads saved browser filesystem handles. Separate modules handle source validation/loading, Markdown rendering, document navigation, translations and persistence. Only references/settings persist; content stays in memory.

**Tech Stack:** TypeScript, Vite, Vitest/jsdom, marked, DOMPurify, Mermaid, zip.js; native IndexedDB and File System Access API.

**Spec:** ../specs/2026-10-30-studyhall-design.md

## Global Constraints

- English default, complete Danish and German UI dictionaries; documents stay in their original language.
- Read-only folder/zip handles, multiple collections, query-based document URLs and fragment headings.
- GitBook-inspired neutral design, system theme, Lucide library-big icon; no GitBook source reuse.
- Cache application assets only. Source data and search index stay in memory. No backend or analytics.
- Custom domain studyhall.skttl.dev means base `/`, CNAME, manifest/service-worker scope `/`.
- Resource limits: 100 MiB compressed zip, 250 MiB total uncompressed data, 10,000 entries; count actual streamed bytes. Reject encrypted/symlink/traversal/duplicate entries.

## Review Focus

- Relative paths with encoded spaces, Unicode, duplicate headings and escaping the root.
- A changed, removed or atomically replaced source after tab refocus; preserve prior valid view on failure.
- Untrusted raw HTML, Mermaid and SVG; no executable links or content.
- Fresh/offline deep links and waiting PWA updates must not discard collection registration.
- Missing permissions/unknown IDs and long German strings must remain actionable.

## Files and interfaces

- `src/model.ts`: `Snapshot { files: Map<string, File>, stamp: string }`, `Collection { id, name, kind, handle }`; document/link/tree utilities.
- `src/sources.ts`: `loadSource(handle): Promise<Snapshot>`; bounded folder/zip scanning; no persistence.
- `src/storage.ts`: `getCollections/saveCollection/removeCollection`; native IndexedDB structured cloning of handles.
- `src/i18n.ts`: dictionaries `en/da/de`, `t(key, params)` and persisted `setLanguage`.
- `src/render.ts`: `renderMarkdown(text): { html, headings }`, `renderDiagrams(container)`; sanitization/anchors; local URL resolution is in the UI.
- `src/main.ts`, `src/style.css`, `index.html`: complete UI and source lifecycle; native dialogs, focus, search, history, reauthorization/relinking, object-URL cleanup.
- `scripts/build-sw.mjs`, `public/*`: offline manifest/icons/worker and CNAME; cache hashed renderer chunks with the app.
- `.github/workflows/pages.yml`, `README.md`: checks, deploy and domain setup.

### Task 1: Validated sources and document model

- [ ] Add package/config and tests before production modules. Test `resolveLocal` with Unicode/encoded path, traversal, external links; `documents` sorting/README/title; `loadZip` with safe and malicious archives, actual-byte and entry boundaries; folder limits.
- [ ] Run `npm test -- src/model.test.ts src/sources.test.ts`; observe missing implementations fail.
- [ ] Implement model utilities, types, folder and streaming zip readers. Use zip.js metadata to reject symlinks and stream actual-byte limits.
- [ ] Run the focused tests and `npm run typecheck`; commit the working source layer.

### Task 2: Translatable and safe rendering

- [ ] Add tests for complete locale keys/interpolation, sanitized Markdown, repeated heading anchors, GFM, blocked scripts/URLs/active SVG, and source errors as message keys.
- [ ] Run `npm test -- src/render.test.ts src/i18n.test.ts`; observe missing behavior fail.
- [ ] Implement typed dictionaries and Markdown/sanitization pipeline. Mermaid is dynamically imported, strict, themed, and isolated from render races; keep source on errors.
- [ ] Run tests and typecheck; commit.

### Task 3: Working reader and filesystem lifecycle

- [ ] Add integration tests for persistence, query/fragment bookmark restoration, source refresh failure retention, search routing and locale switching where feasible in jsdom. Test actual source mutations separately from browser permission boundaries.
- [ ] Run new tests red, then build shell/styles and lifecycle. Use `loadSource`, `renderMarkdown`, persisted collections and translated messages.
- [ ] Support pickers/drop handles, recent collections, relink/authorize/forget, generated overview, folder tree, TOC, search with excerpts, Back/Forward, loading/errors, update on focus, and read-position preservation.
- [ ] Verify UI in Chrome-like browser using a synthetic folder and zip, and read-only real docs if permission API allows. Check dark UI, English/Danish/German, search, hierarchy and broken links. Commit.

### Task 4: Offline PWA and custom-domain hosting

- [ ] Add build/service-worker self-checks for query-insensitive offline navigation, cache-only-app-assets behavior, explicit waiting update activation, manifest icons and CNAME.
- [ ] Build a cache version from output content; emit service worker that precaches complete local dependency graph and only handles same-origin GETs in scope. Keep saved handles untouched.
- [ ] Add GitHub Actions checks/build/deploy for main plus manual dispatch; PR runs checks only. Validate workflow using actionlint.
- [ ] Run `npm test`, `npm run build`, built-artifact checks; inspect install/offline/update behavior and domain DNS. Commit.

### Task 5: Review and delivery

- [ ] Review implementation against every spec section. A fresh reviewer examines source/zip security, permission flow, UI, offline routing and workflow.
- [ ] Fix important findings with a failing regression test first. Run full tests, typecheck and build after fixes.
- [ ] Save validation report with exact tested behavior and remaining platform boundaries. Open working app for user and provide reviewable changes; do not claim DNS/deployment or OS-wide checks without evidence.

## Execution decisions

User explicitly asked to start building, so execute locally without an additional plan-approval round. The custom-domain instruction supersedes the original `/studyhall/` base path. Use this new standalone checkout rather than creating another worktree. Keep execution ledger in `../work/studyhall-progress.md` outside Git. Source repository was empty, so there is no existing branch history to preserve.
