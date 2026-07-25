const { adminAuthorId, filePath, isAdmin, json, required, supabase, supabaseHeaders } = require("./_shared");

const parse = event => JSON.parse(event.body || "{}");
const publicImageUrl = path => `${required("SUPABASE_URL")}/storage/v1/object/public/memories/${filePath(path)}`;

async function readThoughts() {
  const thoughts = await supabase("/rest/v1/thoughts?select=id,title,content,published_at,created_at&order=published_at.desc");
  return thoughts.map(thought => ({ id: thought.id, author: "甲魚", title: thought.title || "", content: thought.content || "", publishedAt: thought.published_at, createdAt: thought.created_at }));
}

async function readMemories() {
  const [memories, images] = await Promise.all([
    supabase("/rest/v1/memories?select=id,memory_date,note,story,created_at&order=memory_date.desc"),
    supabase("/rest/v1/memory_images?select=memory_id,storage_path,position&order=position.asc")
  ]);
  return memories.map(memory => ({
    id: memory.id,
    date: memory.memory_date,
    note: memory.note || "",
    story: memory.story || "",
    createdAt: memory.created_at,
    images: images.filter(image => image.memory_id === memory.id).sort((a, b) => a.position - b.position).map(image => publicImageUrl(image.storage_path))
  }));
}

async function addThought(body) {
  const authorId = await adminAuthorId();
  await supabase("/rest/v1/thoughts", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ author_id: authorId, title: String(body.title || ""), content: String(body.content || ""), published_at: new Date().toISOString().slice(0, 10) }) });
}

async function addMemory(body) {
  const authorId = await adminAuthorId();
  const memory = await supabase("/rest/v1/memories", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ author_id: authorId, memory_date: body.date, note: String(body.note || ""), story: String(body.story || "") }) });
  return memory[0];
}

async function addMemoryImage(event, query) {
  const memoryId = String(query.memoryId || "");
  const position = Number(query.position || 0);
  const filename = String(event.headers["x-file-name"] || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!memoryId || !filename) throw new Error("缺少圖片資料。");
  const path = `admin/${memoryId}/${position}-${Date.now()}-${filename}`;
  const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  const response = await fetch(`${required("SUPABASE_URL")}/storage/v1/object/memories/${filePath(path)}`, { method: "POST", headers: supabaseHeaders({ "Content-Type": event.headers["content-type"] || "application/octet-stream", "x-upsert": "false" }), body: bytes });
  if (!response.ok) throw new Error((await response.text()) || "圖片上傳失敗。");
  await supabase("/rest/v1/memory_images", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ memory_id: memoryId, storage_path: path, position }) });
}

exports.handler = async event => {
  try {
    const query = event.queryStringParameters || {};
    if (event.httpMethod === "GET") {
      if (query.type === "thoughts") return json(200, await readThoughts());
      if (query.type === "memories") return json(200, await readMemories());
      return json(400, { error: "未知資料類型。" });
    }
    if (!isAdmin(event)) return json(401, { error: "請先以管理員身分登入。" });
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    if (query.action === "memory-image") { await addMemoryImage(event, query); return json(201, { ok: true }); }
    const body = parse(event);
    if (body.action === "thought") { await addThought(body); return json(201, { ok: true }); }
    if (body.action === "memory") return json(201, await addMemory(body));
    return json(400, { error: "未知操作。" });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || "伺服器發生錯誤。" });
  }
};
