-- 날짜별 한마디 + 먹고싶어요 (2026-11 추가)
create table if not exists public.day_notes (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  date date not null,
  user_id uuid not null default auth.uid(),
  text text not null check (char_length(text) between 1 and 200),
  likes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists day_notes_table_date on public.day_notes(table_id, date);
alter table public.day_notes enable row level security;
alter table public.day_notes replica identity full;
create policy "day_notes read" on public.day_notes for select using (can_read(table_id));
create policy "day_notes write own" on public.day_notes for insert with check (user_id = auth.uid() and can_read(table_id));
create policy "day_notes like" on public.day_notes for update using (can_read(table_id)) with check (can_read(table_id));
create policy "day_notes delete own" on public.day_notes for delete using (user_id = auth.uid() or can_write(table_id));

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  period text not null default 'month' check (period in ('week','month','someday')),
  period_key text not null default '',
  created_by uuid not null default auth.uid(),
  votes uuid[] not null default '{}',
  done_date date,
  recipe_id uuid,
  dish_id text,
  created_at timestamptz not null default now()
);
create index if not exists wishes_table on public.wishes(table_id);
alter table public.wishes enable row level security;
alter table public.wishes replica identity full;
create policy "wishes read" on public.wishes for select using (can_read(table_id));
create policy "wishes write" on public.wishes for insert with check (created_by = auth.uid() and can_read(table_id));
create policy "wishes update" on public.wishes for update using (can_read(table_id)) with check (can_read(table_id));
create policy "wishes delete" on public.wishes for delete using (created_by = auth.uid() or can_write(table_id));

alter publication supabase_realtime add table public.day_notes, public.wishes;
