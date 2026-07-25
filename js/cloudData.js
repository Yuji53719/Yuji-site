import { supabase } from "./supabaseClient.js";

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
  return data.map(thought => ({
    id: thought.id,
    author: names.get(thought.author_id) || "甲魚",
    title: thought.title || "",
    content: thought.content || "",
    publishedAt: thought.published_at,
    createdAt: thought.created_at
  }));
}

export async function fetchMemories() {
  const memories = await rows(supabase.from("memories").select("id,memory_date,note,story,created_at").order("memory_date", { ascending: false }));
  if (memories === null) return null;
  const images = await rows(supabase.from("memory_images").select("memory_id,storage_path,position").order("position", { ascending: true }));
  return memories.map(memory => ({
    id: memory.id,
    date: memory.memory_date,
    note: memory.note || "",
    story: memory.story || "",
    createdAt: memory.created_at,
    images: (images || [])
      .filter(image => image.memory_id === memory.id)
      .sort((first, second) => first.position - second.position)
      .map(image => supabase.storage.from("memories").getPublicUrl(image.storage_path).data.publicUrl)
  }));
}

export async function createThought({ title, content }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("請先登入。");
  const { error } = await supabase.from("thoughts").insert({ author_id: user.id, title, content, published_at: new Date().toISOString().slice(0, 10) });
  if (error) throw error;
}

export async function createMemory({ date, note, story, files }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("請先登入。");
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .insert({ author_id: user.id, memory_date: date, note, story })
    .select("id")
    .single();
  if (memoryError) throw memoryError;
  const imageRows = [];
  for (const [position, file] of files.entries()) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${memory.id}/${position}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("memories").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    imageRows.push({ memory_id: memory.id, storage_path: storagePath, position });
  }
  const { error: imageError } = await supabase.from("memory_images").insert(imageRows);
  if (imageError) throw imageError;
}
