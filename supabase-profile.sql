-- 在 Supabase 的 SQL Editor 執行一次；供個人介紹的富文字內容保存使用。
create table if not exists public.site_profile (
  id text primary key default 'main' check (id = 'main'),
  content text not null,
  updated_at timestamptz not null default now()
);

insert into public.site_profile (id, content)
values ('main', '我是甲魚！我不知道你是否認識我，我甚至不知道你是誰！<br><br>但是歡迎光臨！')
on conflict (id) do nothing;

create table if not exists public.site_comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('thought', 'memory')),
  entity_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 40),
  content text not null check (char_length(content) between 1 and 1200),
  created_at timestamptz not null default now()
);

create index if not exists site_comments_entity_created_at_idx
  on public.site_comments (entity_type, entity_id, created_at);

-- 管理員可在網站內建立投稿帳號；密碼僅保存雜湊值，不保存明文。
create table if not exists public.site_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[A-Za-z0-9_-]{3,40}$'),
  password_hash text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  display_name text not null default '投稿者',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_accounts_username_idx
  on public.site_accounts (username);

-- 內容投稿會以伺服器端 service_role 查詢管理員資料；不對瀏覽器公開此權限。
do $$
begin
  if to_regclass('public.profiles') is not null then
    grant select on table public.profiles to service_role;
  end if;
end $$;

create table if not exists public.series_posts (
  id uuid primary key default gen_random_uuid(),
  author_username text not null,
  author_name text not null,
  title text not null check (char_length(title) between 1 and 120),
  content text not null,
  cover_path text,
  published_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists series_posts_published_at_idx
  on public.series_posts (published_at desc, created_at desc);

-- 網站所有資料寫入均由 Netlify／Vercel 的伺服器函式使用 service_role 完成。
-- 此權限不會暴露給瀏覽器；它只補足伺服器讀寫投稿、記憶與帳號所需的資料表權限。
grant usage on schema public to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'thoughts',
    'memories',
    'memory_images',
    'site_profile',
    'site_comments',
    'series_posts',
    'site_accounts'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to service_role',
        table_name
      );
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;

-- 發布隨想、記憶、連載與上傳圖片前，也請執行根目錄的
-- supabase-permissions.sql；它只補足 service_role 權限，不會刪除資料。
