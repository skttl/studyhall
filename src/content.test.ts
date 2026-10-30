import { expect, it } from 'vitest';
import { parseContent } from './content';
it('reads title description and unknown frontmatter without putting YAML in the body', () => {
  const result = parseContent('---\ntitle: "Project guide"\ndescription: A short guide\nweight: 4\n---\n# Introduction\n\nText');
  expect(result.metadata).toEqual({ title: 'Project guide', description: 'A short guide', weight: 4 });
  expect(result.body).toBe('# Introduction\n\nText');
});
it('leaves ordinary Markdown alone and contains malformed metadata', () => {
  expect(parseContent('# Hello').body).toBe('# Hello');
  const result = parseContent('---\ntitle: [broken\n---\n# Still readable');
  expect(result.invalid).toBe(true);
  expect(result.body).toBe('# Still readable');
});
