-- 發布／上傳權限修復
-- 請以 Supabase 專案擁有者身分，在 SQL Editor 完整執行一次。
-- 可安全重複執行；不會刪除既有隨想、記憶、連載、留言或帳號資料。

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
    'site_accounts',
    'medicine_materials',
    'medicine_relations'
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

-- 圖片使用 Supabase Storage 的 memories bucket；服務端需要操作其物件記錄。
grant usage on schema storage to service_role;
grant select, insert, update, delete on table storage.objects to service_role;
