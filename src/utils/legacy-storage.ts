/**
 * One-time migration of legacy brand localStorage keys.
 *
 * JustPDFCraft went through two earlier brand names (swifteditoo -> swiftpdf ->
 * justpdfcraft). Users who used the site under an older brand still have their
 * data under the old keys in their browser. These helpers copy that data onto
 * the current justpdfcraft_* keys and then delete the stale legacy entries.
 *
 * Rules:
 *  - The new key always wins: if it already has a value, legacy data is
 *    discarded (never overwritten by older data).
 *  - When several legacy keys map to the same new key, pass them oldest-last /
 *    newest-first so the freshest brand's data is migrated first.
 *  - Legacy values are copied verbatim after optional validation; invalid or
 *    unreadable values are simply deleted, never copied.
 *  - All storage access is best-effort: restricted environments never crash.
 */

export type LegacyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function migrateLegacyStorageKey(
  legacyKeys: string | string[],
  newKey: string,
  options?: {
    validate?: (raw: string) => boolean;
    storage?: LegacyStorage | null;
  }
): void {
  const storage =
    options?.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return;
  const keys = Array.isArray(legacyKeys) ? legacyKeys : [legacyKeys];
  try {
    for (const legacy of keys) {
      const raw = storage.getItem(legacy);
      if (raw === null) continue;
      try {
        if (
          storage.getItem(newKey) === null &&
          (!options?.validate || options.validate(raw))
        ) {
          storage.setItem(newKey, raw);
        }
      } catch {
        // write failed (quota, private mode); fall through and still delete legacy
      }
      storage.removeItem(legacy);
    }
  } catch {
    // storage itself threw; migration is best-effort, never block app startup
  }
}

/** Validates a stored JSON payload that must be an array of strings. */
export function isJsonStringArray(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string');
  } catch {
    return false;
  }
}

/** Builds a validator for a stored JSON payload that must be an array of guarded objects. */
export function isJsonArrayOf<T>(guard: (item: unknown) => item is T): (raw: string) => boolean {
  return (raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.every(guard);
    } catch {
      return false;
    }
  };
}
