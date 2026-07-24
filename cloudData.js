import { supabase } from "./auth.js";

export const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
export const localName = user => (user && user.email ? user.email.split("@")[0] : "匿名");

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) window.alert("請先使用右上角的「登入」完成登入。");
  return user;
}

async function rows(query) {
  const { data, error } = await query;
  if (error) {
    console.warn("雲端資料暫時無法讀取：", error.message);
    return null;
  }
  return data || [];
}

async function profileNames(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const profiles = await rows(supabase.from("profiles").select("id,display_name").in("id", ids));
  return new Map((profiles || []).map(profile => [profile.id, profile.display_name]));
}

export async function fetchThoughts() {
  const data = await rows(supabase.from("thoughts").select("id,author_id,title,content,published_at,created_at").order("published_at", { ascending: false }));
  if (data === null) return null;
  const names = await profileNames(data.map(thought => thought.author_id));
  const user = await currentUser();
  const likedIds = user ? await rows(supabase.from("likes").select("entity_id").eq("entity_type", "thought").eq("user_id", user.id)) : [];
  const liked = new Set((likedIds || []).map(item => item.entity_id));
  return data.map(thought => ({
    id: thought.id,
    author: names.get(thought.author_id) || "讀者",
    title: thought.title || "",
    content: thought.content || "",
    publishedAt: thought.published_at,
    createdAt: thought.created_at,
    _cloud: true,
    _owner: user && user.id === thought.author_id,
    _liked: liked.has(thought.id)
  }));
}

export async function createThought({ author, title, content }) {
  const user = await requireUser();
  if (!user) return null;
  await supabase.from("profiles").upsert({ id: user.id, display_name: author || localName(user) }, { onConflict: "id" });
  const { data, error } = await supabase.from("thoughts").insert({ author_id: user.id, title: title || null, content, published_at: new Date().toISOString().slice(0, 10) }).select().single();
  if (error) { window.alert(`發布失敗：${error.message}`); return null; }
  return data;
}

export async function deleteThought(identifier) {
  const { error } = await supabase.from("thoughts").delete().eq("id", identifier);
  if (error) { window.alert(`刪除失敗：${error.message}`); return false; }
  return true;
}

export async function toggleLike(entityType, entityId) {
  const user = await requireUser();
  if (!user || !isUuid(entityId)) return null;
  const existing = await rows(supabase.from("likes").select("id").eq("entity_type", entityType).eq("entity_id", entityId).eq("user_id", user.id).limit(1));
  if (existing && existing.length) {
    const { error } = await supabase.from("likes").delete().eq("id", existing[0].id);
    return error ? null : false;
  }
  const { error } = await supabase.from("likes").insert({ entity_type: entityType, entity_id: entityId, user_id: user.id });
  return error ? null : true;
}

export async function fetchComments(entityType, entityId) {
  if (!isUuid(entityId)) return null;
  const data = await rows(supabase.from("comments").select("id,entity_type,entity_id,parent_id,author_id,content,created_at").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: true }));
  if (data === null) return null;
  const user = await currentUser();
  const names = await profileNames(data.map(comment => comment.author_id));
  const likes = user && data.length ? await rows(supabase.from("likes").select("entity_id").eq("entity_type", "comment").eq("user_id", user.id).in("entity_id", data.map(comment => comment.id))) : [];
  const liked = new Set((likes || []).map(item => item.entity_id));
  const byParent = new Map();
  data.forEach(comment => {
    const parent = comment.parent_id || "root";
    const list = byParent.get(parent) || [];
    list.push({ id: comment.id, name: names.get(comment.author_id) || "讀者", text: comment.content, createdAt: comment.created_at, liked: liked.has(comment.id), owner: Boolean(user && user.id === comment.author_id), replies: [] });
    byParent.set(parent, list);
  });
  const attach = parentId => (byParent.get(parentId || "root") || []).map(comment => ({ ...comment, replies: attach(comment.id) }));
  return attach(null);
}

export async function createComment({ entityType, entityId, parentId, text, name }) {
  const user = await requireUser();
  if (!user || !isUuid(entityId)) return false;
  await supabase.from("profiles").upsert({ id: user.id, display_name: name || localName(user) }, { onConflict: "id" });
  const { error } = await supabase.from("comments").insert({ entity_type: entityType, entity_id: entityId, parent_id: parentId || null, author_id: user.id, content: text });
  if (error) window.alert(`留言失敗：${error.message}`);
  return !error;
}

export async function deleteComment(identifier) {
  const { error } = await supabase.from("comments").delete().eq("id", identifier);
  if (error) { window.alert(`刪除失敗：${error.message}`); return false; }
  return true;
}

export async function fetchMemories() {
  const memories = await rows(supabase.from("memories").select("id,author_id,memory_date,note,story,created_at").order("memory_date", { ascending: false }));
  if (memories === null) return null;
  const images = await rows(supabase.from("memory_images").select("id,memory_id,storage_path,position").order("position", { ascending: true }));
  const user = await currentUser();
  return memories.map(memory => ({
    id: memory.id,
    date: memory.memory_date,
    note: memory.note || "",
    story: memory.story || "",
    createdAt: memory.created_at,
    _cloud: true,
    _owner: Boolean(user && user.id === memory.author_id),
    images: (images || []).filter(image => image.memory_id === memory.id).sort((a, b) => a.position - b.position).map(image => supabase.storage.from("memories").getPublicUrl(image.storage_path).data.publicUrl)
  }));
}

export async function createMemory({ files, note, date, story }) {
  const user = await requireUser();
  if (!user) return null;
  const { data: memory, error } = await supabase.from("memories").insert({ author_id: user.id, memory_date: date, note: note || null, story: story || null }).select().single();
  if (error) { window.alert(`保存失敗：${error.message}`); return null; }
  const imageRows = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const path = `${user.id}/${memory.id}/${String(index).padStart(2, "0")}-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("memories").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (upload.error) { await supabase.from("memories").delete().eq("id", memory.id); window.alert(`圖片上傳失敗：${upload.error.message}`); return null; }
    imageRows.push({ memory_id: memory.id, storage_path: path, position: index });
  }
  const savedImages = await supabase.from("memory_images").insert(imageRows);
  if (savedImages.error) { window.alert(`圖片資料保存失敗：${savedImages.error.message}`); return null; }
  return memory;
}

export async function deleteMemory(memory) {
  if (!memory || !memory._cloud) return false;
  const imageRows = await rows(supabase.from("memory_images").select("storage_path").eq("memory_id", memory.id));
  if (imageRows && imageRows.length) await supabase.storage.from("memories").remove(imageRows.map(image => image.storage_path));
  const { error } = await supabase.from("memories").delete().eq("id", memory.id);
  if (error) { window.alert(`刪除失敗：${error.message}`); return false; }
  return true;
}
