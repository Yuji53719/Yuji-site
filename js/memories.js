import "./auth.js";
import "./font.js";
import { createIdentifier, supportsDialog } from "../utils/browserCompatibility.js";
import { createMemory, deleteMemory, fetchMemories } from "./cloudData.js";
import { articleCommentButton, bindCommentInteractions, commentSection, mountCommentComposer, primeComments } from "../components/CommentSection.js";
import { confirmDelete as confirmCommentDeletion, mountDeleteConfirmModal } from "../components/DeleteConfirmModal.js";

const storageKey = "jiayu-memories";
const grid = document.getElementById("memory-grid");
const empty = document.getElementById("memory-empty");
const imageInput = document.getElementById("image-input");
const editorModal = document.getElementById("editor-modal");
const deleteModal = document.getElementById("delete-memory-modal");
const detailModal = document.getElementById("detail-modal");
let pendingImages = [];
let memories = [];
let dragIndex = null;
let selectedId = null;
let detailMemory = null;
let detailIndex = 0;
let touchStartX = 0;

const previewStyle = document.createElement("style");
previewStyle.textContent = ".selected-preview{position:relative;flex:none;width:82px;height:82px;cursor:grab}.selected-preview.dragging{opacity:.4}.selected-preview img{width:82px;height:82px;object-fit:cover;border-radius:10px}.remove-preview{position:absolute;right:-5px;top:-5px;width:24px;height:24px;border:0;border-radius:50%;background:rgb(255 255 255 / .75);color:#bd3446;opacity:0;transform:scale(.85);cursor:pointer;transition:.18s}.selected-preview:hover .remove-preview{opacity:1;transform:none}.empty[hidden]{display:none!important}footer{padding:30px 0 42px;color:var(--muted);font-size:14px;line-height:1.65}";
document.head.appendChild(previewStyle);

function loadLocal() { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (_) { return []; } }
function saveLocal(items) { localStorage.setItem(storageKey, JSON.stringify(items)); }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]); }
function dateLabel(value) { if (!value) return "未標記日期"; const date = new Date(`${value}T00:00:00`); return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`; }
function imagesOf(memory) { return memory.images || (memory.image ? [memory.image] : []); }
function memoryDate(memory) { return String(memory.date || ""); }
function sortMemories(items) { return [...items].sort((first, second) => memoryDate(second).localeCompare(memoryDate(first))); }
function trashButton(memory) { return memory._cloud && !memory._owner ? "" : `<button class="delete-memory" type="button" data-delete-memory="${memory.id}" aria-label="刪除這段記憶"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>`; }

function render() {
  const ordered = sortMemories(memories);
  grid.innerHTML = ordered.map(memory => { const images = imagesOf(memory); return `<article class="memory-card" data-memory="${memory.id}"><img src="${images[0] || ""}" alt="${escapeHtml(memory.note || "一段記憶")}"><div class="memory-info"><p class="memory-date">${dateLabel(memoryDate(memory))}</p><p class="memory-note">${escapeHtml(memory.note || "未留下備註")}</p>${images.length > 1 ? `<span class="memory-count">${images.length} 張照片</span>` : ""}</div>${trashButton(memory)}</article>`; }).join("");
  empty.hidden = ordered.length > 0;
}

async function refresh() {
  const cloud = await fetchMemories();
  const local = loadLocal();
  memories = sortMemories([...(cloud || []), ...local]);
  render();
}

function openPicker() { imageInput.click(); }
function toPendingImages(files) { return Promise.all(Array.from(files).map(file => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve({ file, src: reader.result }); reader.readAsDataURL(file); }))); }
function renderPreviews() { const host = document.getElementById("selected-previews"); host.innerHTML = pendingImages.map((image, index) => `<div class="selected-preview" draggable="true" data-preview-index="${index}"><img src="${image.src}" alt="已選擇照片"><button class="remove-preview" type="button" data-remove-preview="${index}" aria-label="移除圖片">×</button></div>`).join(""); }
function todayValue() { const today = new Date(); const offset = today.getTimezoneOffset() * 60000; return new Date(today.getTime() - offset).toISOString().slice(0, 10); }
function openEditor(images) { pendingImages = images; renderPreviews(); document.getElementById("memory-note").value = ""; document.getElementById("memory-story").value = ""; document.getElementById("memory-date").value = todayValue(); editorModal.querySelector("h2").textContent = "抽離記憶"; if (supportsDialog()) editorModal.showModal(); }

async function persistMemory() {
  const note = document.getElementById("memory-note").value.trim();
  if (!note || !pendingImages.length) return;
  const date = document.getElementById("memory-date").value;
  const story = document.getElementById("memory-story").value.trim();
  const files = pendingImages.map(item => item.file).filter(Boolean);
  if (files.length === pendingImages.length) {
    const saved = await createMemory({ files, note, date, story });
    if (!saved) return;
  } else {
    const local = loadLocal();
    local.push({ id: createIdentifier(), images: pendingImages.map(item => item.src), note, date, story, createdAt: new Date().toISOString() });
    saveLocal(local);
  }
  pendingImages = [];
  await refresh();
}

async function renderDetail() {
  const images = imagesOf(detailMemory);
  document.getElementById("detail-image").src = images[detailIndex] || "";
  document.getElementById("detail-index").textContent = images.length > 1 ? `${detailIndex + 1} / ${images.length}` : "";
  document.getElementById("previous-image").hidden = images.length < 2;
  document.getElementById("next-image").hidden = images.length < 2;
  document.getElementById("detail-date").textContent = dateLabel(memoryDate(detailMemory));
  document.getElementById("detail-note").textContent = detailMemory.note || "未留下備註";
  document.getElementById("memory-comment-actions").innerHTML = articleCommentButton("memory", detailMemory.id);
  const story = document.getElementById("detail-story");
  story.hidden = !detailMemory.story;
  story.textContent = detailMemory.story || "";
  await primeComments("memory", detailMemory.id);
  document.getElementById("memory-comments").innerHTML = commentSection("memory", detailMemory.id);
}

async function openDetail(identifier) { detailMemory = memories.find(memory => memory.id === identifier); if (!detailMemory) return; detailIndex = 0; await renderDetail(); if (supportsDialog()) detailModal.showModal(); }
function moveDetail(direction) { const images = imagesOf(detailMemory); if (!images.length) return; detailIndex = (detailIndex + direction + images.length) % images.length; renderDetail(); }
function confirmDelete() { if (!supportsDialog()) return Promise.resolve(window.confirm("抹去記憶？")); return new Promise(resolve => { deleteModal.addEventListener("close", () => resolve(deleteModal.returnValue === "confirm"), { once: true }); deleteModal.showModal(); }); }

const memoryCommentActions = document.createElement("div");
memoryCommentActions.id = "memory-comment-actions";
memoryCommentActions.className = "thought-primary-actions memory-comment-actions";
const detailStory = document.getElementById("detail-story");
detailStory.parentNode.insertBefore(memoryCommentActions, detailStory);
const memoryCommentHost = document.createElement("div");
memoryCommentHost.id = "memory-comments";
detailStory.parentNode.insertBefore(memoryCommentHost, detailStory.nextSibling);
const commentDeleteModal = mountDeleteConfirmModal("delete-memory-comment-modal", { title: "剪掉新枝？", cancel: "恣意生長", confirm: "咔嚓" });
mountCommentComposer();
bindCommentInteractions(() => { if (detailMemory) renderDetail(); }, () => confirmCommentDeletion(commentDeleteModal));

document.querySelector(".subtitle").textContent = "不管是魚眼還是珍珠，我們都把它撿起來，收起來。";
document.getElementById("extract").addEventListener("click", openPicker);
imageInput.addEventListener("change", async event => { if (!event.target.files.length) return; openEditor(await toPendingImages(event.target.files)); event.target.value = ""; });
editorModal.addEventListener("close", async () => { if (editorModal.returnValue === "confirm") await persistMemory(); else pendingImages = []; });
document.getElementById("selected-previews").addEventListener("click", event => { const button = event.target.closest("[data-remove-preview]"); if (!button) return; pendingImages.splice(Number(button.dataset.removePreview), 1); if (!pendingImages.length) { editorModal.close(); return; } renderPreviews(); });
document.getElementById("selected-previews").addEventListener("dragstart", event => { const item = event.target.closest("[data-preview-index]"); if (!item) return; dragIndex = Number(item.dataset.previewIndex); item.classList.add("dragging"); });
document.getElementById("selected-previews").addEventListener("dragover", event => event.preventDefault());
document.getElementById("selected-previews").addEventListener("drop", event => { event.preventDefault(); const item = event.target.closest("[data-preview-index]"); if (!item || dragIndex === null) return; const targetIndex = Number(item.dataset.previewIndex); const moved = pendingImages.splice(dragIndex, 1)[0]; pendingImages.splice(targetIndex, 0, moved); dragIndex = null; renderPreviews(); });
document.getElementById("selected-previews").addEventListener("dragend", () => { dragIndex = null; document.querySelectorAll(".selected-preview").forEach(item => item.classList.remove("dragging")); });
grid.addEventListener("click", async event => { const remove = event.target.closest("[data-delete-memory]"); if (remove) { event.stopPropagation(); selectedId = remove.dataset.deleteMemory; if (await confirmDelete()) { const memory = memories.find(item => item.id === selectedId); if (memory && memory._cloud) await deleteMemory(memory); else { saveLocal(loadLocal().filter(item => item.id !== selectedId)); } await refresh(); } return; } const card = event.target.closest("[data-memory]"); if (card) openDetail(card.dataset.memory); });
grid.addEventListener("touchstart", event => { const card = event.target.closest(".memory-card"); if (card) { touchStartX = event.touches[0].clientX; card._pressTimer = window.setTimeout(() => card.classList.add("show-delete"), 550); } }, { passive: true });
grid.addEventListener("touchend", event => { const card = event.target.closest(".memory-card"); if (card && card._pressTimer) window.clearTimeout(card._pressTimer); });
document.getElementById("detail-close").addEventListener("click", () => detailModal.close());
document.getElementById("previous-image").addEventListener("click", () => moveDetail(-1));
document.getElementById("next-image").addEventListener("click", () => moveDetail(1));
detailModal.addEventListener("touchstart", event => { touchStartX = event.touches[0].clientX; }, { passive: true });
detailModal.addEventListener("touchend", event => { const delta = event.changedTouches[0].clientX - touchStartX; if (Math.abs(delta) > 45) moveDetail(delta < 0 ? 1 : -1); });
window.addEventListener("jiayu-auth-change", refresh);
refresh().then(() => { const requestedMemory = new URLSearchParams(window.location.search).get("memory"); if (requestedMemory) openDetail(requestedMemory); });
