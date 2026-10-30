// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('safe document rendering', () => {
  it('renders GFM and stable duplicate heading anchors', () => {
    const result = renderMarkdown('# Hello\n\n## Æble\n\n## Æble\n\n| A | B |\n| - | - |\n| x | y |\n\n- [x] Done');
    expect(result.headings.map(h => h.id)).toEqual(['æble', 'æble-1']);
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('type="checkbox"');
    expect(result.html).toContain('id="document-æble-1"');
  });
  it('removes scripts, event handlers, active SVG and executable links', () => {
    const result = renderMarkdown('<script>alert(1)</script><img src="x" onerror="alert(1)"><svg onload="alert(1)"></svg>\n\n[x](javascript:alert%281%29)');
    const el = document.createElement('div'); el.innerHTML = result.html;
    expect(el.querySelector('script,svg,[onerror],[onload]')).toBeNull();
    expect(el.querySelector('a')?.getAttribute('href')).toBeNull();
  });
  it('keeps Mermaid source inert until explicitly rendered', () => {
    const result = renderMarkdown('```mermaid\ngraph LR\nA-->B\n```');
    const el = document.createElement('div'); el.innerHTML = result.html;
    expect(el.querySelector('.mermaid-source')?.textContent).toContain('A-->B');
    expect(el.querySelector('svg,script')).toBeNull();
  });
  it('does not request local images from the hosting server before resolving them', () => {
    const el = document.createElement('div'); el.innerHTML = renderMarkdown('![Local](images/private.png)').html;
    expect(el.querySelector('img')?.hasAttribute('src')).toBe(false);
    expect(el.querySelector('img')?.getAttribute('data-studyhall-image')).toBe('images/private.png');
  });
});
