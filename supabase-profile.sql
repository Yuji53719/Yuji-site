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
