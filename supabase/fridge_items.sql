-- 냉장고 (장바구니에서 산 걸 체크하면 여기로 들어와요)
create table if not exists public.fridge_items (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.tables(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  amount      text not null default '' check (char_length(amount) <= 30),
  place       text not null default 'fridge' check (place in ('fridge', 'freezer', 'room')),
  expires     date,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists fridge_table on public.fridge_items (table_id);
alter table public.fridge_items enable row level security;
create policy "fridge_items read"   on public.fridge_items for select to authenticated using (public.can_read(table_id));
create policy "fridge_items write"  on public.fridge_items for insert to authenticated with check (public.can_write(table_id));
create policy "fridge_items update" on public.fridge_items for update to authenticated using (public.can_write(table_id)) with check (public.can_write(table_id));
create policy "fridge_items delete" on public.fridge_items for delete to authenticated using (public.can_write(table_id));
alter table public.fridge_items replica identity full;
alter publication supabase_realtime add table public.fridge_items;

-- 한줄평: 한 사람이 여러 개 남길 수 있게
alter table public.reviews add column if not exists id uuid not null default gen_random_uuid();
alter table public.reviews add column if not exists created_at timestamptz not null default now();
alter table public.reviews drop constraint if exists reviews_pkey;
alter table public.reviews add constraint reviews_pkey primary key (id);
create index if not exists reviews_dish on public.reviews (recipe_id, dish_id);
alter table public.reviews replica identity full;

-- 하루 안 메뉴 순서
alter table public.events add column if not exists pos integer;
