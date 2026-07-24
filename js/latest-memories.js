const host = document.getElementById("latest-memories");
function loadMemories() { try { return JSON.parse(localStorage.getItem("jiayu-memories") || "[]"); } catch (_) { return []; } }
function dateLabel(value) { if (!value) return "未標記日期"; const date = new Date(`${value}T00:00:00`); return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]); }
function imagesOf(memory) { return memory.images || (memory.image ? [memory.image] : []); }
function memoryDate(memory) { return String(memory.date || ""); }
function render() { if (!host) return; const memories = loadMemories().sort((first, second) => memoryDate(second).localeCompare(memoryDate(first))).slice(0, 2); host.innerHTML = memories.length ? memories.map(memory => { const cover = imagesOf(memory)[0]; return `<a class="memory-preview-card" href="./memories.html?memory=${encodeURIComponent(memory.id)}">${cover ? `<img class="memory-preview-cover" src="${cover}" alt="${escapeHtml(memory.note || "一段記憶")}">` : ""}<div class="memory-preview-info"><p class="latest-date">${dateLabel(memoryDate(memory))}</p>${memory.note ? `<p>${escapeHtml(memory.note)}</p>` : ""}<span>翻閱記憶 →</span></div></a>`; }).join("") : `<div class="latest-empty">還沒有值得收藏的記憶。</div>`; }
render();
