// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { File } from 'node:buffer';
import { expect, it, vi } from 'vitest';
it('opens a local folder, searches its content and switches UI language without translating documents', async () => {
  vi.stubGlobal('File', File);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  vi.stubGlobal('scrollTo', () => {});
  const scrollTargets: string[] = [];
  HTMLElement.prototype.scrollIntoView = function () { scrollTargets.push(this.id); };
  history.replaceState({}, '', '/?collection=bookmark&doc=README.md#setup');
  let content = '---\ntitle: Project notes\ndescription: Our project documentation\n---\n# Introduction\n\n## Setup\n\nInstall the tools.\n\n[Other](guide.md)';
  window.showDirectoryPicker = vi.fn(async () => ({ kind: 'directory', name: 'Test docs',
    queryPermission: async () => 'granted', async *values() {
      yield { kind: 'file', name: 'README.md', getFile: async () => new File([content], 'README.md', { lastModified: content.length }) };
      yield { kind: 'file', name: 'guide.md', getFile: async () => new File(['# Guide\n\nA special keyword: wombat'], 'guide.md') };
    },
  })) as unknown as typeof window.showDirectoryPicker;
  document.body.innerHTML = '<div id="app"></div>';
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const { ready } = await import('./main'); await ready;
  document.querySelector<HTMLButtonElement>('[data-open="directory"]')!.click();
  await vi.waitFor(() => expect(document.querySelector('article')?.textContent).toContain('Install the tools.'));
  expect(scrollTargets).toContain('document-setup');
  expect(location.search).toContain('collection=');
  expect(document.querySelector('header #collection')).not.toBeNull();
  expect(document.querySelector('.sidebar #collection')).toBeNull();
  document.querySelector<HTMLButtonElement>('[data-action="rename"]')!.click();
  const name = document.querySelector<HTMLInputElement>('#collection-name')!;
  name.value = '   ';
  document.querySelector<HTMLFormElement>('#rename-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(name.validity.customError).toBe(true);
  name.value = 'Project Atlas';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector<HTMLFormElement>('#rename-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(document.querySelector<HTMLSelectElement>('header #collection')?.selectedOptions[0].textContent).toBe('Project Atlas'));
  expect(location.search).toContain('collection=bookmark');
  document.querySelector<HTMLButtonElement>('#search-open')!.click();
  const search = document.querySelector<HTMLInputElement>('#search-input')!;
  search.value = 'wombat'; search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('#search-results')?.textContent).toContain('Guide');
  expect(document.querySelector('#search-results')?.textContent).not.toContain('Project notes');
  document.querySelector<HTMLButtonElement>('[data-action="closeSearch"]')!.click();
  const language = document.querySelector<HTMLSelectElement>('#language')!;
  language.value = 'de'; language.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.documentElement.lang).toBe('de');
  await vi.waitFor(() => expect(document.querySelector('article')?.textContent).toContain('Project notes'));
  content = '# Project notes\n\n## Setup\n\nChanged on disk.';
  document.querySelector<HTMLButtonElement>('#refresh')!.click();
  await vi.waitFor(() => expect(document.querySelector('article')?.textContent).toContain('Changed on disk.'));
});
