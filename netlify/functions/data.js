const { adminAuthorId, currentUser, filePath, json, supabase, supabaseBaseUrl, supabaseHeaders } = require("./_shared");

const parse = event => JSON.parse(event.body || "{}");
const publicImageUrl = path => `${supabaseBaseUrl()}/storage/v1/object/public/memories/${filePath(path)}`;

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

async function readProfile() {
  const rows = await supabase("/rest/v1/site_profile?id=eq.main&select=content,updated_at");
  return rows[0] || { content: "", updated_at: null };
}

async function readSeries() {
  const posts = await supabase("/rest/v1/series_posts?select=id,title,content,cover_path,published_at,created_at,author_username,author_name&order=published_at.desc,created_at.desc");
  return posts.map(post => ({ id: post.id, title: post.title, content: post.content || "", cover: post.cover_path ? publicImageUrl(post.cover_path) : "", publishedAt: post.published_at, createdAt: post.created_at, author: post.author_name, owner: post.author_username, _cloud: true }));
}

async function readMedicines() {
  const [materials, relations] = await Promise.all([
    supabase("/rest/v1/medicine_materials?select=id,name,nature,flavor,notes,image_path,created_at,updated_at&order=name.asc"),
    supabase("/rest/v1/medicine_relations?select=id,source_id,target_id,relation_type,note&order=created_at.asc")
  ]);
  return materials.map(material => ({
    id: material.id,
    name: material.name,
    nature: material.nature || "",
    flavor: material.flavor || "",
    notes: material.notes || "",
    image: material.image_path ? publicImageUrl(material.image_path) : "",
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    relations: relations.filter(relation => relation.source_id === material.id).map(relation => ({ id: relation.id, targetId: relation.target_id, type: relation.relation_type, note: relation.note || "" }))
  }));
}

function medicineInput(body) {
  const name = String(body.name || "").trim();
  const nature = String(body.nature || "").trim();
  const flavor = String(body.flavor || "").trim();
  const notes = String(body.notes || "").trim();
  if (!name) throw new Error("請填寫藥材名稱。");
  if (name.length > 80 || nature.length > 80 || flavor.length > 120 || notes.length > 5000) throw new Error("藥材資料過長。");
  return { name, nature, flavor, notes };
}

function medicineRelations(relations, sourceId) {
  if (!Array.isArray(relations)) return [];
  const allowed = new Set(["compatible", "avoid", "similar", "complementary"]);
  const unique = new Set();
  return relations.map(relation => ({
    source_id: sourceId,
    target_id: String(relation.targetId || "").trim(),
    relation_type: String(relation.type || "").trim(),
    note: String(relation.note || "").trim().slice(0, 1000)
  })).filter(relation => {
    const key = `${relation.target_id}:${relation.relation_type}`;
    if (!relation.target_id || relation.target_id === sourceId || !allowed.has(relation.relation_type) || unique.has(key)) return false;
    unique.add(key);
    return true;
  });
}

async function addMedicine(body) {
  const rows = await supabase("/rest/v1/medicine_materials", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(medicineInput(body)) });
  const medicine = rows[0];
  const relations = medicineRelations(body.relations, medicine.id);
  if (relations.length) await supabase("/rest/v1/medicine_relations", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(relations) });
  return medicine;
}

async function updateMedicine(body) {
  const identifier = String(body.id || "");
  const existing = await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(identifier)}&select=id`);
  if (!existing[0]) throw new Error("找不到這味藥材。");
  await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(identifier)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ ...medicineInput(body), updated_at: new Date().toISOString() }) });
  await supabase(`/rest/v1/medicine_relations?source_id=eq.${encodeURIComponent(identifier)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  const relations = medicineRelations(body.relations, identifier);
  if (relations.length) await supabase("/rest/v1/medicine_relations", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(relations) });
}

async function addMedicineImage(event, query) {
  const medicineId = String(query.medicineId || "");
  const rows = await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(medicineId)}&select=id,image_path`);
  if (!rows[0]) throw new Error("找不到這味藥材。");
  let filename = String(event.headers["x-file-name"] || "image");
  try { filename = decodeURIComponent(filename); } catch (_) { /* 保留原檔名 */ }
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `medicine/${medicineId}/${Date.now()}-${filename}`;
  const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  const response = await fetch(`${supabaseBaseUrl()}/storage/v1/object/memories/${filePath(path)}`, { method: "POST", headers: supabaseHeaders({ "Content-Type": event.headers["content-type"] || "application/octet-stream", "x-upsert": "false" }), body: bytes });
  if (!response.ok) throw new Error((await response.text()) || "藥材圖片上傳失敗。");
  await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(medicineId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ image_path: path, updated_at: new Date().toISOString() }) });
  if (rows[0].image_path) await supabase("/storage/v1/object/memories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [rows[0].image_path] }) });
}

async function removeMedicine(identifier) {
  const rows = await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(identifier)}&select=id,image_path`);
  if (!rows[0]) throw new Error("找不到這味藥材。");
  await supabase(`/rest/v1/medicine_materials?id=eq.${encodeURIComponent(identifier)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (rows[0].image_path) await supabase("/storage/v1/object/memories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [rows[0].image_path] }) });
}

async function saveProfile(body) {
  const content = String(body.content || "").trim();
  if (!content) throw new Error("介紹不能留空。");
  const rows = await supabase("/rest/v1/site_profile", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: "main", content, updated_at: new Date().toISOString() }) });
  return rows[0];
}

async function readComments(query) {
  const entityType = String(query.entityType || "");
  const entityId = String(query.entityId || "");
  if (!['thought', 'memory'].includes(entityType) || !entityId) throw new Error("留言目標無效。");
  return await supabase(`/rest/v1/site_comments?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&select=id,nickname,content,created_at&order=created_at.asc`);
}

async function addComment(body) {
  const entityType = String(body.entityType || "");
  const entityId = String(body.entityId || "").trim();
  const nickname = String(body.nickname || "").trim();
  const content = String(body.content || "").trim();
  if (!['thought', 'memory'].includes(entityType) || !entityId) throw new Error("留言目標無效。");
  if (!nickname) throw new Error("請填寫暱稱。");
  if (!content) throw new Error("請填寫留言內容。");
  if (nickname.length > 40 || content.length > 1200) throw new Error("留言內容過長。");
  const rows = await supabase("/rest/v1/site_comments", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ entity_type: entityType, entity_id: entityId, nickname, content }) });
  return rows[0];
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

async function addSeries(body, user) {
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title || !content) throw new Error("請填寫標題與正文。");
  const rows = await supabase("/rest/v1/series_posts", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ title, content, author_username: user.username, author_name: user.displayName, published_at: new Date().toISOString().slice(0, 10) }) });
  return rows[0];
}

async function addSeriesCover(event, query, user) {
  const postId = String(query.postId || "");
  const filename = String(event.headers["x-file-name"] || "cover").replace(/[^a-zA-Z0-9._-]/g, "-");
  const posts = await supabase(`/rest/v1/series_posts?id=eq.${encodeURIComponent(postId)}&select=id,author_username`);
  if (!posts[0]) throw new Error("找不到這篇連載。 ");
  if (user.role !== "admin" && posts[0].author_username !== user.username) throw new Error("你只能上傳自己的連載封面。 ");
  const path = `series/${postId}/cover-${Date.now()}-${filename}`;
  const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  const response = await fetch(`${supabaseBaseUrl()}/storage/v1/object/memories/${filePath(path)}`, { method: "POST", headers: supabaseHeaders({ "Content-Type": event.headers["content-type"] || "application/octet-stream", "x-upsert": "false" }), body: bytes });
  if (!response.ok) throw new Error((await response.text()) || "封面上傳失敗。");
  await supabase(`/rest/v1/series_posts?id=eq.${encodeURIComponent(postId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ cover_path: path }) });
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
  const response = await fetch(`${supabaseBaseUrl()}/storage/v1/object/memories/${filePath(path)}`, { method: "POST", headers: supabaseHeaders({ "Content-Type": event.headers["content-type"] || "application/octet-stream", "x-upsert": "false" }), body: bytes });
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

async function updateThought(body, user) {
  const identifier = String(body.id || "");
  const rows = await supabase(`/rest/v1/thoughts?id=eq.${encodeURIComponent(identifier)}&select=id,author_username`);
  const thought = rows[0];
  if (!thought) throw new Error("找不到這則隨想。");
  if (user.role !== "admin" && thought.author_username !== user.username) throw new Error("你只能編輯自己發布的隨想。");
  const content = String(body.content || "").trim();
  if (!content) throw new Error("正文不能留空。");
  await supabase(`/rest/v1/thoughts?id=eq.${encodeURIComponent(identifier)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ title: String(body.title || "").trim(), content }) });
}

async function updateMemory(body, user) {
  const identifier = String(body.id || "");
  const rows = await supabase(`/rest/v1/memories?id=eq.${encodeURIComponent(identifier)}&select=id,author_username`);
  const memory = rows[0];
  if (!memory) throw new Error("找不到這段記憶。");
  if (user.role !== "admin" && memory.author_username !== user.username) throw new Error("你只能編輯自己的記憶。");
  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("請選擇記憶日期。");
  await supabase(`/rest/v1/memories?id=eq.${encodeURIComponent(identifier)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ memory_date: date, note: String(body.note || "").trim(), story: String(body.story || "").trim() }) });
}

exports.handler = async event => {
  try {
    const query = event.queryStringParameters || {};
    if (event.httpMethod === "GET") {
      if (query.type === "thoughts") return json(200, await readThoughts());
      if (query.type === "memories") return json(200, await readMemories());
      if (query.type === "profile") return json(200, await readProfile());
      if (query.type === "series") return json(200, await readSeries());
      if (query.type === "medicines") return json(200, await readMedicines());
      if (query.type === "comments") return json(200, await readComments(query));
      return json(400, { error: "未知資料類型。" });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    if (query.action === "memory-image" || query.action === "series-cover" || query.action === "medicine-image") {
      const user = currentUser(event);
      if (!user) return json(401, { error: "請先登入。" });
      if (query.action === "medicine-image") {
        if (user.role !== "admin") return json(403, { error: "只有管理員可以上傳藥材圖片。" });
        await addMedicineImage(event, query);
        return json(201, { ok: true });
      }
      if (query.action === "memory-image") { await addMemoryImage(event, query, user); return json(201, { ok: true }); }
      await addSeriesCover(event, query, user);
      return json(201, { ok: true });
    }
    const body = parse(event);
    if (body.action === "comment") return json(201, await addComment(body));
    const user = currentUser(event);
    if (!user) return json(401, { error: "請先登入。" });
    if (body.action === "profile") {
      if (user.role !== "admin") return json(403, { error: "只有管理員可以修改自我介紹。" });
      return json(200, await saveProfile(body));
    }
    if (["medicine", "update-medicine", "delete-medicine"].includes(body.action) && user.role !== "admin") return json(403, { error: "只有管理員可以整理中藥資料。" });
    if (body.action === "medicine") return json(201, await addMedicine(body));
    if (body.action === "update-medicine") { await updateMedicine(body); return json(200, { ok: true }); }
    if (body.action === "delete-medicine") { await removeMedicine(String(body.id || "")); return json(200, { ok: true }); }
    if (body.action === "thought") { await addThought(body, user); return json(201, { ok: true }); }
    if (body.action === "memory") return json(201, await addMemory(body, user));
    if (body.action === "series") return json(201, await addSeries(body, user));
    if (body.action === "delete-thought") { await removeThought(body.id, user); return json(200, { ok: true }); }
    if (body.action === "delete-memory") { await removeMemory(body.id, user); return json(200, { ok: true }); }
    if (body.action === "update-thought") { await updateThought(body, user); return json(200, { ok: true }); }
    if (body.action === "update-memory") { await updateMemory(body, user); return json(200, { ok: true }); }
    return json(400, { error: "未知操作。" });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || "伺服器發生錯誤。" });
  }
};
