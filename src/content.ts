import { parseDocument } from 'yaml';
export function parseContent(text: string): { body: string; metadata: Record<string, unknown>; invalid: boolean } {
  const match = text.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
  if (!match) return { body: text, metadata: {}, invalid: false };
  const body = text.slice(match[0].length);
  try {
    if (match[1].length > 65536) throw new Error('Metadata too large');
    const doc = parseDocument(match[1], { schema: 'core', uniqueKeys: true });
    if (doc.errors.length) throw new Error('Invalid metadata');
    const value: unknown = doc.toJS({ maxAliasCount: 20 });
    if (value === null) return { body, metadata: {}, invalid: false };
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Metadata must be a mapping');
    return { body, metadata: value as Record<string, unknown>, invalid: false };
  } catch { return { body, metadata: {}, invalid: true }; }
}
export function metadataText(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = Object.hasOwn(metadata, key) ? metadata[key] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
