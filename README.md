# StudyHall

A local Markdown documentation reader for Chrome and Edge on desktop. Open a folder or ZIP, browse its directory tree, search its documents, and bookmark pages and headings. English UI with Danish and German translations. System light/dark theme. Installable PWA with offline reading after the first complete app download.

Files stay on your device. StudyHall persists browser filesystem handles and preferences, not copies of your documentation. No account, upload, analytics or backend. Remote images still contact their hosts and need a network connection.

## Development

Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Use the production preview to check the service worker. Development intentionally does not register it.

## Using StudyHall

- Open a folder or ZIP using the picker, or drop a source onto the app.
- Switch between remembered collections in the top bar. Rename a collection through Collection actions to distinguish sources with the same folder name. Its bookmark ID stays the same. Bookmarks work in the same browser profile after access is granted again if necessary.
- Search with the button or Ctrl/Cmd+K. UI language can be changed independently of document language.
- The app checks for disk changes when you return, and when you select Refresh.
- Reconnect a moved/replaced source through Collection actions. This keeps its collection ID and existing bookmarks. Forget removes only the reference.
- A folder's README.md or index.md is the start page; otherwise StudyHall builds an overview in memory. An overview link is always available.

Supported: Markdown/GFM, local images, relative links, GitHub-style heading slugs and Mermaid. MDX, wikilinks, editing and source files outside the chosen root are not supported. Arbitrary HTML is sanitized. Other local file types receive a descriptive message instead of opening an editor.

YAML frontmatter is read as metadata rather than rendered as text. `title` controls the page title and navigation label; `description` becomes an introduction. Other fields are retained as metadata. Malformed frontmatter produces a notice while the document body remains readable. Unambiguous extensionless links resolve to their Markdown file.

ZIP limits: 100 MiB compressed, 250 MiB actually expanded, 10,000 entries. Folder scans also stop at 250 MiB or 10,000 entries. Symbolic links, encrypted ZIP entries, path traversal and duplicate archive paths are rejected. A common enclosing ZIP folder is removed from the display root.

Change detection uses path, size and modification time. A rewrite preserving both size and modification time is not detected. Atomic replacement of a ZIP may invalidate its browser handle; reconnect it if prompted. Cleared browser storage removes saved references. Bookmarks do not contain documents or filesystem permissions.

## GitHub Pages and studyhall.skttl.dev

The build uses base `/` for the custom domain. The workflow checks PRs and publishes successful main-branch builds. Before the first deployment:

1. In repository Settings → Pages, select **GitHub Actions** as the publishing source.
2. Set **Custom domain** to `studyhall.skttl.dev` in GitHub Pages settings. With an Actions deployment, the `public/CNAME` file documents intent but does not set this repository setting by itself.
3. At the DNS provider, create a CNAME record named `studyhall` under `skttl.dev`, targeting `skttl.github.io` without a repository path. Add the domain in GitHub before pointing DNS at it.
4. After GitHub provisions its certificate, enable **Enforce HTTPS**. HTTPS is needed for filesystem access, service workers and installation.

Use the final domain from the beginning for persistent collections. Moving to a different origin does not migrate stored handles. Do not use the unconfigured project URL as a permanent installation: this build expects the custom domain's root.

GitHub guide: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Architecture

- `src/sources.ts`: read-only scanning and bounded ZIP extraction.
- `src/model.ts`: documents, paths, search and bookmark URLs.
- `src/render.ts`: Markdown sanitization, heading IDs and queued Mermaid rendering.
- `src/storage.ts`: IndexedDB collection references.
- `src/i18n.ts`: typed locale dictionaries. Add a dictionary and language label to add a language.
- `src/main.ts`: reader UI, source permissions/reconnection, focus refresh and PWA notifications.
- `scripts/build-sw.mjs`: offline asset list and dependency license notices; the service worker only caches application files.

Design and implementation plan are in `docs/superpowers/`. The original sketch was a visual reference only; this app uses no GitBook source or translations. The app icon is Lucide `library-big`; see `THIRD_PARTY_NOTICES.md`. This repository has not yet selected a license for StudyHall's own source.
