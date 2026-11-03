import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { moduleIds, parseModule, type ModuleId } from '../src/data/schema';

// Read on each request: private files are never imported into the client graph.
export async function readLocalModule(root: string, id: ModuleId) {
  try {
    const raw: unknown = JSON.parse(await readFile(resolve(root, 'data/local', `${id}.json`), 'utf8'));
    const data = parseModule(id, raw);
    if (data.meta.status === 'example') throw new Error('Local files must be draft or confirmed');
    return { origin: 'local' as const, data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    // Do not echo private file contents, names, numbers, or parser input.
    throw new Error('本地数据不符合契约，请由 Muse 检查对应 JSON；未回退示例。');
  }
}

export function localDataPlugin(root: string): Plugin {
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    if (!path.startsWith('/api/data/')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const id = path.slice('/api/data/'.length);
    if (req.method !== 'GET' || !moduleIds.includes(id as ModuleId)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: '未知数据槽位' }));
      return;
    }
    try {
      const local = await readLocalModule(root, id as ModuleId);
      res.end(JSON.stringify(local ?? { origin: 'example' }));
    } catch {
      res.statusCode = 422;
      res.end(JSON.stringify({ error: '本地数据不符合契约，请由 Muse 检查对应 JSON；未回退示例。' }));
    }
  };
  return {
    name: 'private-local-data',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
