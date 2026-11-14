-- CORE DIVE: spelerstellingen per (vraag, antwoord).
-- Plak dit één keer in Supabase → SQL Editor → New query → Run.

create table if not exists public.answer_counts (
  prompt_id text not null,
  answer_id text not null,
  n integer not null default 0,
  primary key (prompt_id, answer_id)
);

-- Iedereen mag de tellingen lezen; niemand mag de tabel rechtstreeks wijzigen.
alter table public.answer_counts enable row level security;

drop policy if exists "anyone can read counts" on public.answer_counts;
create policy "anyone can read counts"
  on public.answer_counts for select
  to anon, authenticated
  using (true);

-- Tellen gaat alleen via deze functie: precies +1, met nette invoer.
create or replace function public.record_answer(p_prompt text, p_answer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_prompt !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'invalid prompt id';
  end if;
  if p_answer !~ '^Q[0-9]{1,12}$' then
    raise exception 'invalid answer id';
  end if;
  insert into answer_counts (prompt_id, answer_id, n)
  values (p_prompt, p_answer, 1)
  on conflict (prompt_id, answer_id)
  do update set n = answer_counts.n + 1;
end;
$$;

revoke all on function public.record_answer(text, text) from public;
grant execute on function public.record_answer(text, text) to anon, authenticated;
