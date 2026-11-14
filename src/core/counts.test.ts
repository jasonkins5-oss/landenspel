import { describe, expect, it } from 'vitest';
import { memoryBackend, noBackend, supabaseBackend } from './counts';

describe('noBackend en memoryBackend', () => {
  it('noBackend geeft altijd lege tellingen', async () => {
    const b = noBackend();
    await b.record('dog-breed', 'Q1');
    expect(await b.get('dog-breed')).toEqual({});
    expect(b.live).toBe(false);
  });

  it('memoryBackend telt per vraag', async () => {
    const b = memoryBackend();
    await b.record('dog-breed', 'Q1');
    await b.record('dog-breed', 'Q1');
    await b.record('cheese', 'Q2');
    expect(await b.get('dog-breed')).toEqual({ Q1: 2 });
    expect(await b.get('cheese')).toEqual({ Q2: 1 });
  });
});

describe('supabaseBackend', () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fakeFetch = (response: unknown, ok = true) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return { ok, json: async () => response } as Response;
    }) as typeof fetch;

  it('leest tellingen via de REST-API', async () => {
    calls.length = 0;
    const b = supabaseBackend(
      'https://x.supabase.co/',
      'sb_publishable_abc',
      fakeFetch([{ answer_id: 'Q1', n: 3 }]),
    );
    expect(await b.get('dog-breed')).toEqual({ Q1: 3 });
    expect(calls[0]!.url).toBe(
      'https://x.supabase.co/rest/v1/answer_counts?select=answer_id,n&prompt_id=eq.dog-breed',
    );
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_publishable_abc');
    expect(headers.Authorization).toBeUndefined();
  });

  it('telt een antwoord via de databasefunctie en stuurt een JWT ook als Bearer', async () => {
    calls.length = 0;
    const b = supabaseBackend('https://x.supabase.co', 'eyJhbGciOi', fakeFetch(null));
    await b.record('dog-breed', 'Q38978');
    expect(calls[0]!.url).toBe('https://x.supabase.co/rest/v1/rpc/record_answer');
    expect(calls[0]!.init!.body).toBe(
      JSON.stringify({ p_prompt: 'dog-breed', p_answer: 'Q38978' }),
    );
    expect((calls[0]!.init!.headers as Record<string, string>).Authorization).toBe(
      'Bearer eyJhbGciOi',
    );
  });

  it('valt bij een fout terug op lege tellingen', async () => {
    const failing = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    expect(await supabaseBackend('https://x', 'k', failing).get('p')).toEqual({});
    expect(await supabaseBackend('https://x', 'k', fakeFetch([], false)).get('p')).toEqual({});
  });
});
