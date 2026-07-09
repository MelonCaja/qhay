-- ═══════════════════════════════════════════════════════════════════════════
-- QHAY — Esquema relacional PostgreSQL (Supabase)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: usa IF NOT EXISTS / OR REPLACE donde aplica.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  name                  text not null default '',
  plan_type             text not null default 'gratuito' check (plan_type in ('gratuito', 'premium')),
  dietary_restrictions  text[] not null default '{}',
  kitchen_utensils      text[] not null default '{}',
  is_baes_verified      boolean not null default false,
  created_at            timestamptz not null default now()
);

-- Sprint 2 — Auth + Onboarding: columnas de perfil (idempotente en BDs ya creadas)
alter table public.profiles add column if not exists avatar_url            text;
alter table public.profiles add column if not exists onboarding_completed  boolean not null default false;
alter table public.profiles add column if not exists is_student            boolean not null default false;
alter table public.profiles add column if not exists tastes                text[] not null default '{}';
alter table public.profiles add column if not exists weekly_budget         integer;
alter table public.profiles add column if not exists cooking_time_minutes  integer not null default 45;
alter table public.profiles add column if not exists terms_version         text;
alter table public.profiles add column if not exists terms_accepted_at     timestamptz;

-- Sprint 7 — Límites plan Free + BAES (idempotente)
alter table public.profiles add column if not exists favorite_supermarket  text;
alter table public.profiles add column if not exists scan_month_ref        text not null default '';    -- 'YYYY-MM'
alter table public.profiles add column if not exists monthly_scan_count    integer not null default 0;
alter table public.profiles add column if not exists cached_recipes_count  integer not null default 0;
alter table public.profiles add column if not exists baes_active           boolean not null default false;
alter table public.profiles add column if not exists baes_daily_amount     integer;                     -- CLP
alter table public.profiles add column if not exists baes_institution      text;

-- Registra un escaneo de boleta de forma atómica (lock FOR UPDATE): resetea el
-- contador al cambiar de mes y devuelve false si el plan Free agotó su cuota.
-- SECURITY INVOKER + auth.uid() → RLS own-row aplica.
create or replace function public.registrar_escaneo(limite integer default 4)
returns boolean
language plpgsql
as $$
declare
  mes text := to_char(now(), 'YYYY-MM');
  p record;
begin
  select plan_type, scan_month_ref, monthly_scan_count
    into p
    from public.profiles
   where id = auth.uid()
     for update;

  if not found then
    return false;
  end if;

  if p.scan_month_ref is distinct from mes then
    update public.profiles
       set scan_month_ref = mes, monthly_scan_count = 1
     where id = auth.uid();
    return true;
  end if;

  if p.plan_type = 'gratuito' and p.monthly_scan_count >= limite then
    return false;
  end if;

  update public.profiles
     set monthly_scan_count = monthly_scan_count + 1
   where id = auth.uid();
  return true;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Perfil automático al registrarse (Google/Email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url, terms_version, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.raw_user_meta_data->>'terms_version',
    case when new.raw_user_meta_data->>'terms_version' is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── PANTRIES (despensa) ─────────────────────────────────────────────────────
create table if not exists public.pantries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  product_name  text not null,
  brand         text,
  quantity      numeric not null default 1,
  unit          text not null default 'unidad',
  expires_at    date,
  created_at    timestamptz not null default now()
);

-- Sprint 3 — Despensa: columnas del dominio Ingrediente (idempotente)
alter table public.pantries add column if not exists category     text;
alter table public.pantries add column if not exists image_url    text;
alter table public.pantries add column if not exists unit_price   integer;              -- CLP
alter table public.pantries add column if not exists supermarket  text;
alter table public.pantries add column if not exists added_by     text not null default 'manual';
alter table public.pantries add column if not exists usage_count  integer not null default 1;
alter table public.pantries add column if not exists updated_at   timestamptz not null default now();

create index if not exists pantries_user_idx on public.pantries (user_id);
create index if not exists pantries_expires_idx on public.pantries (user_id, expires_at);

-- "Receta realizada": aplica todos los descuentos en 1 round trip atómico.
-- SECURITY INVOKER (default) → RLS de pantries sigue aplicando (own-row).
-- payload: [{ "item_id": uuid, "cantidad_restante": numeric }, …]
create or replace function public.descontar_receta(descuentos jsonb)
returns void
language plpgsql
as $$
declare
  d jsonb;
begin
  for d in select jsonb_array_elements(descuentos) loop
    if (d->>'cantidad_restante')::numeric <= 0 then
      delete from public.pantries where id = (d->>'item_id')::uuid;
    else
      update public.pantries
         set quantity    = (d->>'cantidad_restante')::numeric,
             usage_count = usage_count + 1,
             updated_at  = now()
       where id = (d->>'item_id')::uuid;
    end if;
  end loop;
end;
$$;

alter table public.pantries enable row level security;

drop policy if exists "pantries_all_own" on public.pantries;
create policy "pantries_all_own" on public.pantries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── RECIPES ─────────────────────────────────────────────────────────────────
create table if not exists public.recipes (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  instructions       text[] not null default '{}',
  utensils_required  text[] not null default '{}',
  calories           integer,
  created_at         timestamptz not null default now()
);

-- Sprint 4 — Motor de Recetas: columnas del dominio Receta (idempotente)
alter table public.recipes add column if not exists description        text not null default '';
alter table public.recipes add column if not exists image_url          text;
alter table public.recipes add column if not exists steps              jsonb not null default '[]';  -- [{numero,descripcion,timerSegundos?,foto?}]
alter table public.recipes add column if not exists prep_time_minutes  integer not null default 30;
alter table public.recipes add column if not exists difficulty         text not null default 'facil'; -- facil | media | dificil
alter table public.recipes add column if not exists servings           integer not null default 2;
alter table public.recipes add column if not exists macros             jsonb;                         -- {proteinas,carbohidratos,grasas}
alter table public.recipes add column if not exists is_fitness         boolean not null default false;
alter table public.recipes add column if not exists is_student         boolean not null default false; -- económica / BAES
alter table public.recipes add column if not exists restrictions       text[] not null default '{}';
alter table public.recipes add column if not exists seasons            text[] not null default '{}';

alter table public.recipes enable row level security;

drop policy if exists "recipes_public_read" on public.recipes;
create policy "recipes_public_read" on public.recipes
  for select using (true);
-- Escritura solo desde backend (service_role bypassa RLS): sin políticas de insert/update.

-- ─── RECIPE_INGREDIENTS ──────────────────────────────────────────────────────
create table if not exists public.recipe_ingredients (
  id               uuid primary key default gen_random_uuid(),
  recipe_id        uuid not null references public.recipes (id) on delete cascade,
  ingredient_name  text not null,
  quantity         numeric not null default 1,
  unit             text not null default 'unidad'
);

alter table public.recipe_ingredients add column if not exists no_scale_equivalent text;    -- '1 taza', '2 puñados'
alter table public.recipe_ingredients add column if not exists is_optional         boolean not null default false;

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- Motor de sugerencias: JOIN recipe_ingredients × pantries del usuario en UNA
-- petición. Scoring en SQL: % coincidencia + boost por vencimiento (<=2 días:
-- +30, <=7: +15, cap 60). SECURITY INVOKER + filtro auth.uid() → RLS aplica.
create extension if not exists unaccent;

create or replace function public.sugerir_recetas()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  steps jsonb,
  utensils_required text[],
  prep_time_minutes integer,
  difficulty text,
  servings integer,
  calories integer,
  macros jsonb,
  is_fitness boolean,
  is_student boolean,
  restrictions text[],
  seasons text[],
  ingredients jsonb,   -- [{nombre,cantidad,unidad,equivalenciaSinBalanza,opcional,disponibleEnDespensa}]
  match_pct integer,
  score integer,
  expiring text[],     -- items de despensa usados por la receta que vencen <=7 días
  missing text[]       -- ingredientes de la receta sin match en despensa
)
language sql
stable
as $$
  with despensa as (
    select product_name,
           lower(unaccent(product_name)) as nombre_norm,
           (expires_at - current_date)   as dias
    from public.pantries
    where user_id = auth.uid()
  ),
  cruce as (
    select
      ri.recipe_id,
      ri.ingredient_name,
      ri.quantity,
      ri.unit,
      ri.no_scale_equivalent,
      ri.is_optional,
      d.product_name as en_despensa,
      d.dias
    from public.recipe_ingredients ri
    left join lateral (
      -- Match por inclusión normalizada en ambos sentidos (misma regla del cliente)
      select dd.product_name, dd.dias
      from despensa dd
      where dd.nombre_norm like '%' || lower(unaccent(ri.ingredient_name)) || '%'
         or lower(unaccent(ri.ingredient_name)) like '%' || dd.nombre_norm || '%'
      order by dd.dias asc nulls last  -- prioriza el que vence antes
      limit 1
    ) d on true
  ),
  agregado as (
    select
      c.recipe_id,
      jsonb_agg(jsonb_build_object(
        'nombre',                c.ingredient_name,
        'cantidad',              c.quantity,
        'unidad',                c.unit,
        'equivalenciaSinBalanza', c.no_scale_equivalent,
        'opcional',              c.is_optional,
        'disponibleEnDespensa',  c.en_despensa is not null
      )) as ingredients,
      count(*)::integer          as total,
      count(c.en_despensa)::integer as aciertos,
      array_remove(array_agg(case when c.dias between 0 and 7 then c.en_despensa end), null) as expiring,
      array_remove(array_agg(case when c.en_despensa is null then c.ingredient_name end), null) as missing,
      least(coalesce(sum(case when c.dias between 0 and 2 then 30
                              when c.dias between 3 and 7 then 15 end), 0), 60)::integer as boost
    from cruce c
    group by c.recipe_id
  )
  select
    r.id, r.title, r.description, r.image_url, r.steps, r.utensils_required,
    r.prep_time_minutes, r.difficulty, r.servings, r.calories, r.macros,
    r.is_fitness, r.is_student, r.restrictions, r.seasons,
    coalesce(a.ingredients, '[]'::jsonb)                                as ingredients,
    coalesce(round(a.aciertos * 100.0 / nullif(a.total, 0)), 0)::integer as match_pct,
    (coalesce(round(a.aciertos * 100.0 / nullif(a.total, 0)), 0)
      + coalesce(a.boost, 0))::integer                                  as score,
    coalesce(a.expiring, '{}')                                          as expiring,
    coalesce(a.missing, '{}')                                           as missing
  from public.recipes r
  left join agregado a on a.recipe_id = r.id
  order by score desc;
$$;

alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipe_ingredients_public_read" on public.recipe_ingredients;
create policy "recipe_ingredients_public_read" on public.recipe_ingredients
  for select using (true);

-- ─── PRODUCTS_SCRAPED (caché de precios + Full-Text Search) ─────────────────
create table if not exists public.products_scraped (
  id            uuid primary key default gen_random_uuid(),
  supermarket   text not null,
  brand         text not null default '',
  product_name  text not null,
  format        text not null default '',
  price         integer not null,
  updated_at    timestamptz not null default now(),
  -- Columna generada para FTS nativo en español sobre nombre + marca
  fts tsvector generated always as (
    to_tsvector('spanish', coalesce(product_name, '') || ' ' || coalesce(brand, ''))
  ) stored,
  -- Un registro por producto+supermercado: el re-scraping actualiza (upsert)
  unique (supermarket, product_name, brand, format)
);

-- Sprint 5 — Buscador: columnas del dominio PrecioSupermercado (idempotente)
alter table public.products_scraped add column if not exists image_url   text;
alter table public.products_scraped add column if not exists category    text not null default '';
alter table public.products_scraped add column if not exists list_price  integer;               -- precio sin oferta
alter table public.products_scraped add column if not exists on_sale     boolean not null default false;
alter table public.products_scraped add column if not exists certainty   boolean not null default true; -- scrapeado en ese local

create index if not exists products_scraped_fts_idx on public.products_scraped using gin (fts);
create index if not exists products_scraped_updated_idx on public.products_scraped (updated_at);

alter table public.products_scraped enable row level security;

drop policy if exists "products_read_auth" on public.products_scraped;
create policy "products_read_auth" on public.products_scraped
  for select using (auth.role() = 'authenticated');

-- Caché colaborativo: clientes autenticados persisten resultados del scraping
drop policy if exists "products_write_auth" on public.products_scraped;
create policy "products_write_auth" on public.products_scraped
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "products_update_auth" on public.products_scraped;
create policy "products_update_auth" on public.products_scraped
  for update using (auth.role() = 'authenticated');

-- ─── SHOPPING_LISTS (lista universal) ────────────────────────────────────────
create table if not exists public.shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  list_name   text not null default 'Lista del súper',
  created_at  timestamptz not null default now()
);

create index if not exists shopping_lists_user_idx on public.shopping_lists (user_id);

alter table public.shopping_lists enable row level security;

drop policy if exists "shopping_lists_all_own" on public.shopping_lists;
create policy "shopping_lists_all_own" on public.shopping_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── SHOPPING_LIST_ITEMS ─────────────────────────────────────────────────────
create table if not exists public.shopping_list_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references public.shopping_lists (id) on delete cascade,
  product_name  text not null,
  quantity      integer not null default 1,
  is_checked    boolean not null default false,
  store_name    text not null default 'generic',
  created_at    timestamptz not null default now()
);

-- Sprint 6 — Listas: campos opcionales del dominio ShoppingItem (idempotente)
alter table public.shopping_list_items add column if not exists brand text;    -- null = genérico, cualquier marca
alter table public.shopping_list_items add column if not exists price integer; -- CLP, se resuelve al comprar

-- Sprint 7 — Lista con comparador (ItemLista legacy converge aquí)
alter table public.shopping_list_items add column if not exists unit        text not null default 'unidad';
alter table public.shopping_list_items add column if not exists category    text;
alter table public.shopping_list_items add column if not exists product_ref text;   -- idGenerico → products_scraped
alter table public.shopping_list_items add column if not exists all_prices  jsonb;  -- PrecioSupermercado[] para el comparador

create index if not exists shopping_list_items_list_idx on public.shopping_list_items (list_id);

alter table public.shopping_list_items enable row level security;

-- Acceso vía propiedad de la lista padre
drop policy if exists "shopping_list_items_all_own" on public.shopping_list_items;
create policy "shopping_list_items_all_own" on public.shopping_list_items
  for all using (
    exists (
      select 1 from public.shopping_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.shopping_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
  );
