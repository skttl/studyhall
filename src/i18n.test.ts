// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { dictionaries, setLanguage, t } from './i18n';
it('provides complete languages and safely interpolates messages', () => {
  for (const lang of ['en', 'da', 'de'] as const) {
    expect(Object.keys(dictionaries[lang]).sort()).toEqual(Object.keys(dictionaries.en).sort());
    setLanguage(lang);
    expect(t('notFound', { path: 'guides/README.md' })).toContain('guides/README.md');
    expect(document.documentElement.lang).toBe(lang);
    expect(localStorage.getItem('studyhall-language')).toBe(lang);
  }
  setLanguage('en'); expect(t('openFolder')).toBe('Open folder');
  setLanguage('da'); expect(t('openFolder')).toBe('Åbn mappe');
  setLanguage('de'); expect(t('openFolder')).toBe('Ordner öffnen');
});
