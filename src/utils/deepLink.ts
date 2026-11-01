import { TOOLS_CATALOG } from '@/data/toolsCatalog';
import { ToolDefinition } from '@/types/tools';

export interface DeepLinkResult {
  /** Matching tool for ?tool=<id> or /<tool-id>, or null when absent/unknown. */
  tool: ToolDefinition | null;
  /** Query string with the consumed `tool` or `p` param removed (e.g. '' or '?x=1'). */
  cleaned: string;
}

const TOOL_PATH_ALIASES: Record<string, string> = {
  'pdf-to-word': 'pdf-to-word-doc',
  'jpg-to-pdf': 'image-to-pdf-tool',
  'handwriting': 'handwriting-generator',
  'resizer': 'target-kb-resizer',
};

/**
 * Parse a location search string for a per-tool deep link (?tool=<id>).
 * Unknown ids resolve to null so stale/crafted URLs never crash the launcher.
 */
export function getToolFromSearch(search: string): DeepLinkResult {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const id = params.get('tool');
  if (!id) return { tool: null, cleaned: search ? (search.startsWith('?') ? search : `?${search}`) : '' };

  const resolvedId = TOOL_PATH_ALIASES[id] || id;
  const tool = TOOLS_CATALOG.find((t) => t.id === resolvedId) ?? null;
  params.delete('tool');
  const qs = params.toString();
  return { tool, cleaned: qs ? `?${qs}` : '' };
}

/**
 * Enhanced URL resolver that handles clean pathname routing (e.g. /merge-pdf),
 * GitHub Pages SPA redirect trampoline (?p=/merge-pdf), as well as standard ?tool=<id>.
 */
export function getToolFromUrl(pathname: string, search: string): DeepLinkResult {
  // 1. Check query parameter ?tool=<id>
  const fromSearch = getToolFromSearch(search);
  if (fromSearch.tool) return fromSearch;

  // 2. Check SPA trampoline parameter ?p=/<tool-id>
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const trampolinePath = params.get('p');
  if (trampolinePath) {
    const cleanId = decodeURIComponent(trampolinePath).replace(/^\/+|\/+$/g, '');
    const resolvedId = TOOL_PATH_ALIASES[cleanId] || cleanId;
    const tool = TOOLS_CATALOG.find((t) => t.id === resolvedId) ?? null;
    params.delete('p');
    const qs = params.toString();
    return { tool, cleaned: qs ? `?${qs}` : '' };
  }

  // 3. Check direct pathname e.g. /merge-pdf or /compress-pdf
  const pathId = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (pathId && pathId !== 'index.html') {
    const resolvedId = TOOL_PATH_ALIASES[pathId] || pathId;
    const tool = TOOLS_CATALOG.find((t) => t.id === resolvedId) ?? null;
    if (tool) {
      return { tool, cleaned: search ? (search.startsWith('?') ? search : `?${search}`) : '' };
    }
  }

  return { tool: null, cleaned: search ? (search.startsWith('?') ? search : `?${search}`) : '' };
}
