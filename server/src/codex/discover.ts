import { readdir, stat } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { join } from 'node:path';

export async function discover(root: string, lookback: number) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files = await Promise.all(entries.filter(e => e.isFile() && e.name.endsWith('.jsonl')).map(async e => {
    const file = join(e.parentPath, e.name);
    try { return { file, info: await stat(file) }; }
    catch { return null; }
  }));
  return files.filter(f => f !== null && Date.now() - f.info.mtimeMs <= lookback)
    .sort((a, b) => a!.file.localeCompare(b!.file)) as { file: string; info: Stats }[];
}
