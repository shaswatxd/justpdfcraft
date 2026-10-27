import { TOOLS_CATALOG } from '@/data/toolsCatalog';
import { ToolDefinition } from '@/types/tools';

export interface DeepLinkResult {
  /** Matching tool for ?tool=<id>, or null when absent/unknown. */
  tool: ToolDefinition | null;
  /** Query string with the consumed `tool` param removed (e.g. '' or '?x=1'). */
  cleaned: string;
}

/**
 * Parse a location search string for a per-tool deep link (?tool=<id>).
 * Unknown ids resolve to null so stale/crafted URLs never crash the launcher.
 */
export function getToolFromSearch(search: string): DeepLinkResult {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const id = params.get('tool');
  if (!id) return { tool: null, cleaned: search ? (search.startsWith('?') ? search : `?${search}`) : '' };

  const tool = TOOLS_CATALOG.find((t) => t.id === id) ?? null;
  params.delete('tool');
  const qs = params.toString();
  return { tool, cleaned: qs ? `?${qs}` : '' };
}
