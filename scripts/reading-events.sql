-- Stellar Tarot · reading_events
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
--
-- One row per reading pulled, by anyone, signed in or not. Nothing personal:
-- a deck slug, a kind, a timestamp. No user id, no question, no cards.
--
-- RLS is ON with NO POLICIES on purpose. That makes the table unreachable from
-- any browser, anonymous or signed in. Only /api/readings-count touches it, and
-- that runs with the service role, which bypasses RLS. Nobody can read the rows,
-- spam the table, or scrape it.

create table if not exists public.reading_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  deck_slug   text not null default 'base',
  kind        text not null default 'spread'
);

alter table public.reading_events enable row level security;
-- deliberately no policies: the service role is the only way in

create index if not exists reading_events_created_idx on public.reading_events (created_at desc);
create index if not exists reading_events_deck_idx    on public.reading_events (deck_slug);

-- Carry the history over: every reading already saved becomes an event, keeping
-- its original date and deck, so the count starts from the real total instead of
-- zero. Guarded so re-running this file cannot double up.
insert into public.reading_events (deck_slug, kind, created_at)
select coalesce(deck_slug, 'base'), coalesce(kind, 'spread'), created_at
from public.tarot_readings
where not exists (select 1 from public.reading_events);

-- What you should see afterwards:
select count(*) as total,
       count(*) filter (where kind = 'spread') as spreads,
       count(*) filter (where kind = 'ask')    as questions,
       min(created_at) as first_reading
from public.reading_events;
