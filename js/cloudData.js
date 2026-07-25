const endpoint = "/.netlify/functions/data";

async function request(path = "", options = {}) {
  const response = await fetch(`${endpoint}${path}`, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "資料服務暫時無法使用。");
  return data;
}

export async function fetchThoughts() {
  try { return await request("?type=thoughts"); } catch (error) { console.warn(error.message); return null; }
}

export async function fetchMemories() {
  try { return await request("?type=memories"); } catch (error) { console.warn(error.message); return null; }
}

export async function fetchProfile() {
  return await request("?type=profile");
}

export async function updateProfile(content) {
  return await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "profile", content }) });
}

export async function fetchComments(entityType, entityId) {
  return await request(`?type=comments&entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
}

export async function createComment({ entityType, entityId, nickname, content }) {
  return await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", entityType, entityId, nickname, content }) });
}

export async function createThought({ title, content }) {
  await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "thought", title, content }) });
}

export async function createMemory({ date, note, story, files }) {
  const memory = await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "memory", date, note, story }) });
  for (const [position, file] of files.entries()) {
    await request(`?action=memory-image&memoryId=${encodeURIComponent(memory.id)}&position=${position}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
  }
}

export async function deleteThought(id) {
  await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-thought", id }) });
}

export async function deleteMemory(id) {
  await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-memory", id }) });
}

export async function updateThought({ id, title, content }) {
  await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-thought", id, title, content }) });
}

export async function updateMemory({ id, date, note, story }) {
  await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-memory", id, date, note, story }) });
}
