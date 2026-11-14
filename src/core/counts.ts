import type { AnswerCounts } from './rarity';

/**
 * Spelerstellingen: hoe vaak elk antwoord op een vraag gegeven is. Leeft op een server
 * (Supabase), maar het spel werkt ook zonder: dan zijn alle tellingen leeg en bepaalt alleen de
 * bekendheid (prior) de zeldzaamheid.
 */
export interface CountsBackend {
  /** true als er echt een server achter zit. */
  readonly live: boolean;
  get(promptId: string): Promise<AnswerCounts>;
  record(promptId: string, answerId: string): Promise<void>;
}

export function noBackend(): CountsBackend {
  return { live: false, get: async () => ({}), record: async () => {} };
}

/** In-memory, voor tests. */
export function memoryBackend(): CountsBackend & { data: Map<string, Record<string, number>> } {
  const data = new Map<string, Record<string, number>>();
  return {
    live: true,
    data,
    get: async (promptId) => ({ ...(data.get(promptId) ?? {}) }),
    record: async (promptId, answerId) => {
      const counts = data.get(promptId) ?? {};
      counts[answerId] = (counts[answerId] ?? 0) + 1;
      data.set(promptId, counts);
    },
  };
}

/**
 * Supabase via de REST-API (geen SDK nodig). Verwacht een tabel `answer_counts` met
 * (prompt_id, answer_id, n) en een functie `record_answer(p_prompt, p_answer)`; zie
 * supabase/schema.sql. Elke fout of time-out wordt stil opgevangen: het spel valt dan terug
 * op lege tellingen.
 */
export function supabaseBackend(
  url: string,
  key: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  timeoutMs = 3000,
): CountsBackend {
  const base = url.replace(/\/+$/, '');
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  // Oude "anon"-sleutels zijn JWT's en mogen ook als Bearer mee; nieuwe publishable keys niet.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  async function call(path: string, init: RequestInit = {}): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${base}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      return res.ok ? res : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    live: true,
    async get(promptId) {
      const res = await call(
        `/rest/v1/answer_counts?select=answer_id,n&prompt_id=eq.${encodeURIComponent(promptId)}`,
      );
      if (!res) return {};
      try {
        const rows = (await res.json()) as { answer_id: string; n: number }[];
        return Object.fromEntries(rows.map((r) => [r.answer_id, Number(r.n) || 0]));
      } catch {
        return {};
      }
    },
    async record(promptId, answerId) {
      await call('/rest/v1/rpc/record_answer', {
        method: 'POST',
        body: JSON.stringify({ p_prompt: promptId, p_answer: answerId }),
      });
    },
  };
}
