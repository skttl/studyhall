import { marked } from 'marked';
import DOMPurify from 'dompurify';
import GithubSlugger from 'github-slugger';
import { t } from './i18n';
import { parseContent, metadataText } from './content';
export interface Heading { id: string; title: string; level: number }
export const escapeHTML = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.nodeName === 'IMG') {
    const source = node.getAttribute('src');
    if (source) node.setAttribute('data-studyhall-image', source);
    node.removeAttribute('src');
  }
});

export function renderMarkdown(text: string): { html: string; headings: Heading[] } {
  const content = parseContent(text);
  const html = marked.parse(content.body, { async: false, gfm: true });
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed', 'video', 'audio', 'source'],
    FORBID_ATTR: ['id', 'name', 'style', 'srcset', 'autofocus'], ALLOW_DATA_ATTR: false,
  });
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
    const id = slugger.slug(el.textContent || '');
    el.id = 'document-' + id;
    el.setAttribute('data-anchor', id);
    if (el.tagName === 'H2' || el.tagName === 'H3') headings.push({ id, title: el.textContent || '', level: Number(el.tagName[1]) });
  });
  const title = metadataText(content.metadata, 'title');
  let firstHeading = root.querySelector('h1');
  if (title) {
    if (!firstHeading) { firstHeading = document.createElement('h1'); firstHeading.id = 'document-' + slugger.slug(title); root.prepend(firstHeading); }
    firstHeading.textContent = title;
  }
  const description = metadataText(content.metadata, 'description');
  if (description) { const lead = document.createElement('p'); lead.className = 'lead'; lead.textContent = description; if (firstHeading) firstHeading.after(lead); else root.prepend(lead); }
  if (content.invalid) { const warning = document.createElement('p'); warning.className = 'notice'; warning.textContent = t('invalidFrontmatter'); root.prepend(warning); }
  root.querySelectorAll('pre > code.language-mermaid').forEach(code => {
    const pre = code.parentElement!;
    pre.classList.add('mermaid-source');
    pre.setAttribute('data-source', code.textContent || '');
  });
  root.querySelectorAll('input').forEach(input => { input.disabled = true; input.removeAttribute('name'); });
  return { html: root.innerHTML, headings };
}

let diagramSequence = 0;
let rendering: Promise<unknown> = Promise.resolve();
export async function renderDiagrams(container: HTMLElement) {
  const sources = [...container.querySelectorAll<HTMLElement>('.mermaid-source')];
  if (!sources.length) return;
  const mermaid = (await import('mermaid')).default;
  for (const source of sources) {
    // Mermaid has shared configuration, so theme and rendering must run in one queue.
    rendering = rendering.catch(() => {}).then(async () => {
      if (!container.isConnected || !source.isConnected) return;
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default', htmlLabels: false, maxTextSize: 50000, suppressErrorRendering: true });
      try {
        const result = await mermaid.render('studyhall-diagram-' + ++diagramSequence, source.dataset.source || '');
        if (!source.isConnected) return;
        const diagram = document.createElement('div'); diagram.className = 'diagram';
        diagram.dataset.source = source.dataset.source;
        diagram.innerHTML = DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['a', 'foreignObject'], FORBID_ATTR: ['href', 'xlink:href'] });
        source.replaceWith(diagram);
      } catch {
        if (!source.isConnected) return;
        const error = document.createElement('p'); error.className = 'diagram-error'; error.textContent = t('diagramError');
        source.before(error);
      }
    });
    await rendering;
  }
}
