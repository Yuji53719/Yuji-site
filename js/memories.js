import "./font.js";
import { fetchMemories } from "./cloudData.js";

const storageKey = "jiayu-memories";
const grid = document.getElementById("memory-grid");
const empty = document.getElementById("memory-empty");
const detailModal = document.getElementById("detail-modal");
let memories = [];
let detailMemory = null;
let detailIndex = 0;
let touchStartX = 0;

function loadLocal() { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (_) { return []; } }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]); }
function dateLabel(value) { if (!value) return "未標記日期"; const date = new Date(`${value}T00:00:00`); return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`; }
function imagesOf(memory) { return memory.images || (memory.image ? [memory.image] : []); }
function memoryDate(memory) { return String(memory.date || ""); }
function sortMemories(items) { return [...items].sort((first, second) => memoryDate(second).localeCompare(memoryDate(first))); }

function render() {
  const ordered = sortMemories(memories);
  grid.innerHTML = ordered.map(memory => { const images = imagesOf(memory); return `<article class="memory-card" data-memory="${memory.id}"><img src="${images[0] || ""}" alt="${escapeHtml(memory.note || "一段記憶")}"><div class="memory-info"><p class="memory-date">${dateLabel(memoryDate(memory))}</p><p class="memory-note">${escapeHtml(memory.note || "未留下備註")}</p>${images.length > 1 ? `<span class="memory-count">${images.length} 張照片</span>` : ""}</div></article>`; }).join("");
  empty.hidden = ordered.length > 0;
}

async function refresh() {
  const cloud = await fetchMemories();
  memories = sortMemories([...(cloud || []), ...loadLocal()]);
  render();
}

function renderDetail() {
  const images = imagesOf(detailMemory);
  document.getElementById("detail-image").src = images[detailIndex] || "";
  document.getElementById("detail-index").textContent = images.length > 1 ? `${detailIndex + 1} / ${images.length}` : "";
  document.getElementById("previous-image").hidden = images.length < 2;
  document.getElementById("next-image").hidden = images.length < 2;
  document.getElementById("detail-date").textContent = dateLabel(memoryDate(detailMemory));
  document.getElementById("detail-note").textContent = detailMemory.note || "未留下備註";
  const story = document.getElementById("detail-story");
  story.hidden = !detailMemory.story;
  story.textContent = detailMemory.story || "";
}

function openDetail(identifier) {
  detailMemory = memories.find(memory => memory.id === identifier);
  if (!detailMemory) return;
  detailIndex = 0;
  renderDetail();
  if (typeof detailModal.showModal === "function") detailModal.showModal();
}

function moveDetail(direction) {
  const images = imagesOf(detailMemory);
  if (!images.length) return;
  detailIndex = (detailIndex + direction + images.length) % images.length;
  renderDetail();
}

grid.addEventListener("click", event => { const card = event.target.closest("[data-memory]"); if (card) openDetail(card.dataset.memory); });
document.getElementById("detail-close").addEventListener("click", () => detailModal.close());
document.getElementById("previous-image").addEventListener("click", () => moveDetail(-1));
document.getElementById("next-image").addEventListener("click", () => moveDetail(1));
detailModal.addEventListener("touchstart", event => { touchStartX = event.touches[0].clientX; }, { passive: true });
detailModal.addEventListener("touchend", event => { const delta = event.changedTouches[0].clientX - touchStartX; if (Math.abs(delta) > 45) moveDetail(delta < 0 ? 1 : -1); });
refresh();
