import investment from '../../data/examples/investment.json';
import cashflow from '../../data/examples/cashflow.json';
import familyAssets from '../../data/examples/family-assets.json';
import insurance from '../../data/examples/insurance.json';
import health from '../../data/examples/health.json';
import { parseModule, type ModuleData, type ModuleId } from '@/data/schema';

export const examples = { investment, cashflow, 'family-assets': familyAssets, insurance, health };
export type LoadedModule = { origin: 'local' | 'example'; data: ModuleData };
export async function loadModule(id: ModuleId, fetcher: typeof fetch = fetch): Promise<LoadedModule> {
  const response = await fetcher(`/api/data/${id}`, { cache: 'no-store' });
  // Plain static hosting has no runtime endpoint. It can only display examples.
  if (response.status === 404 || (response.ok && response.headers.get('content-type')?.includes('text/html'))) {
    return { origin: 'example', data: parseModule(id, examples[id]) };
  }
  if (!response.ok) throw new Error('本地数据无法读取或不符合契约；请检查后刷新。');
  const payload = await response.json();
  if (payload.origin === 'example') return { origin: 'example', data: parseModule(id, examples[id]) };
  if (payload.origin !== 'local') throw new Error('未知的数据来源');
  const data = parseModule(id, payload.data);
  if (data.meta.status === 'example') throw new Error('本地文件不能标为示例');
  return { origin: 'local', data };
}
