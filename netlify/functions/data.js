const { adminAuthorId, currentUser, filePath, json, required, supabase, supabaseHeaders } = require("./_shared");

const parse = event => JSON.parse(event.body || "{}");
const publicImageUrl = path => `${required("SUPABASE_URL")}/storage/v1/object/public/memories/${filePath(path)}`;

async function readThoughts() {
  const thoughts = await supabase("/rest/v1/thoughts?select=id,title,content,published_at,created_at,author_username,author_name&order=published_at.desc");
  return thoughts.map(thought => ({ id: thought.id, author: thought.author_name || "甲魚", owner: thought.author_username || "admin", title: thought.title || "", content: thought.content || "", publishedAt: thought.published_at, createdAt: thought.created_at, _cloud: true }));
}

async function readMemories() {
  const [memories, images] = await Promise.all([
    supabase("/rest/v1/memories?select=id,memory_date,note,story,created_at,author_username,author_name&order=memory_date.desc"),
    supabase("/rest/v1/memory_images?select=memory_id,storage_path,position&order=position.asc")
  ]);
  return memories.map(memory => ({
    id: memory.id,
    date: memory.memory_date,
    note: memory.note || "",
    story: memory.story || "",
    createdAt: memory.created_at,
    author: memory.author_name || "甲魚",
    owner: memory.author_username || "admin",
    _cloud: true,
    images: images.filter(image => image.memory_id === memory.id).sort((a, b) => a.position - b.position).map(image => publicImageUrl(image.storage_path))
  }));
}

async function addThought(body, user) {
  const authorId = await adminAuthorId();
  await supabase("/rest/v1/thoughts", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ author_id: authorId, author_username: user.username, author_name: user.displayName, title: String(body.title || ""), content: String(body.content || ""), published_at: new Date().toISOString().slice(0, 10) }) });
}

async function addMemory(body, user) {
  const authorId = await adminAuthorId();
  const memory = await supabase("/rest/v1/memories", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ author_id: authorId, author_username: user.username, author_name: user.displayName, memory_date: body.date, note: String(body.note || ""), story: String(body.story || "") }) });
  return memory[0];
}

async function addMemoryImage(event, query, user) {
  const memoryId = String(query.memoryId || "");
  const position = Number(query.position || 0);
  const filename = String(event.headers["x-file-name"] || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!memoryId || !filename) throw new Error("缺少圖片資料。");
  const memories = await supabase(`/rest/v1/memories?id=eq.${encodeURIComponent(memoryId)}&select=author_username`);
  if (!memories[0]) throw new Error("找不到這段記憶。");
  if (user.role !== "admin" && memories[0].author_username !== user.username) throw new Error("你只能上傳自己的記憶照片。");
  const path = `admin/${memoryId}/${position}-${Date.now()}-${filename}`;
  const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  const response = await fetch(`${required("SUPABASE_URL")}/storage/v1/object/memories/${filePath(path)}`, { method: "POST", headers: supabaseHeaders({ "Content-Type": event.headers["content-type"] || "application/octet-stream", "x-upsert": "false" }), body: bytes });
  if (!response.ok) throw new Error((await response.text()) || "圖片上傳失敗。");
  await supabase("/rest/v1/memory_images", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ memory_id: memoryId, storage_path: path, position }) });
}

async function removeThought(identifier, user) {
  const rows = await supabase(`/rest/v1/thoughts?id=eq.${encodeURIComponent(identifier)}&select=id,author_username`);
  const thought = rows[0];
  if (!thought) throw new Error("找不到這則隨想。");
  if (user.role !== "admin" && thought.author_username !== user.username) throw new Error("你只能刪除自己發布的隨想。");
  await supabase(`/rest/v1/thoughts?id=eq.${encodeURIComponent(identifier)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

async function removeMemory(identifier, user) {
  const rows = await supabase(`/rest/v1/memories?id=eq.${encodeURIComponent(identifier)}&select=id,author_username`);
  const memory = rows[0];
  if (!memory) throw new Error("找不到這段記憶。");
  if (user.role !== "admin" && memory.author_username !== user.username) throw new Error("你只能刪除自己發布的記憶。");
  const images = await supabase(`/rest/v1/memory_images?memory_id=eq.${encodeURIComponent(identifier)}&select=storage_path`);
  await supabase(`/rest/v1/memories?id=eq.${encodeURIComponent(identifier)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (images.length) await supabase("/storage/v1/object/memories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: images.map(image => image.storage_path) }) });
}

exports.handler = async event => {
  try {
    const query = event.queryStringParameters || {};
    if (event.httpMethod === "GET") {
      if (query.type === "thoughts") return json(200, await readThoughts());
      if (query.type === "memories") return json(200, await readMemories());
      return json(400, { error: "未知資料類型。" });
    }
    const user = currentUser(event);
    if (!user) return json(401, { error: "請先登入。" });
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    if (query.action === "memory-image") { await addMemoryImage(event, query, user); return json(201, { ok: true }); }
    const body = parse(event);
    if (body.action === "thought") { await addThought(body, user); return json(201, { ok: true }); }
    if (body.action === "memory") return json(201, await addMemory(body, user));
    if (body.action === "delete-thought") { await removeThought(body.id, user); return json(200, { ok: true }); }
    if (body.action === "delete-memory") { await removeMemory(body.id, user); return json(200, { ok: true }); }
    return json(400, { error: "未知操作。" });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || "伺服器發生錯誤。" });
  }
};
