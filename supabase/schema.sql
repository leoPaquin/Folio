-- Run in the Supabase SQL Editor. Does not import or delete existing portfolios.
create table if not exists public.portfolio_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_state enable row level security;
revoke all on public.portfolio_state from anon;
grant select, insert, update on public.portfolio_state to authenticated;

drop policy if exists "Read own portfolio" on public.portfolio_state;
create policy "Read own portfolio" on public.portfolio_state
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own portfolio" on public.portfolio_state;
create policy "Insert own portfolio" on public.portfolio_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own portfolio" on public.portfolio_state;
create policy "Update own portfolio" on public.portfolio_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
