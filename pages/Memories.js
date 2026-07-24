import { createIdentifier, supportsDialog } from "../utils/browserCompatibility.js";

const storageKey = "jiayu-memories";
const gallery = document.getElementById("memory-gallery");
const sourceSheet = document.getElementById("source-sheet");
const captionDialog = document.getElementById("caption-dialog");
const deleteDialog = document.getElementById("delete-dialog");
const fileInput = document.getElementById("memory-file");
let pendingImage = null;
let deletingId = null;
const readMemories = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (_) { return []; } };
const writeMemories = memories => localStorage.setItem(storageKey, JSON.stringify(memories));
const date = value => { if (!value) return "未標記日期"; const entry = new Date(`${value}T00:00:00`); return `${entry.getFullYear()}年${String(entry.getMonth() + 1).padStart(2, "0")}月${String(entry.getDate()).padStart(2, "0")}日`; };
const trash = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>`;
function render() { const memories = readMemories().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))); if (!memories.length) { gallery.innerHTML = `<div class="empty">還沒有值得收藏的記憶。</div>`; return; } gallery.innerHTML = memories.map(memory => `<article class="memory" data-id="${memory.id}"><img src="${memory.image}" alt="${memory.caption || "記憶"}"><button class="delete-memory" data-delete="${memory.id}" aria-label="刪除記憶">${trash}</button><div class="memory-info"><p class="memory-date">${date(memory.date)}</p><p class="memory-caption">${memory.caption || "未留下備註"}</p></div></article>`).join(""); }
function openDialog(dialog) { if (supportsDialog()) dialog.showModal(); }
function selectSource(source) { if (source === "camera") fileInput.setAttribute("capture", "environment"); else fileInput.removeAttribute("capture"); fileInput.click(); }
function beginExtract() { if (supportsDialog()) openDialog(sourceSheet); else selectSource("files"); }
function savePending() { if (!pendingImage) return; const now = new Date(); const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); const memories = readMemories(); memories.push({ id: createIdentifier(), image: pendingImage, caption: document.getElementById("caption-input").value.trim(), date: localDate, createdAt: now.toISOString() }); try { writeMemories(memories); pendingImage = null; render(); } catch (_) { window.alert("圖片過大，請選擇較小的檔案。"); } }
render();
document.getElementById("extract-button").addEventListener("click", beginExtract);
gallery.addEventListener("click", event => { if (event.target.closest("[data-start]")) { beginExtract(); return; } const button = event.target.closest("[data-delete]"); if (!button) return; deletingId = button.dataset.delete; if (supportsDialog()) openDialog(deleteDialog); else if (window.confirm("抹去記憶？")) { writeMemories(readMemories().filter(memory => memory.id !== deletingId)); render(); } });
gallery.addEventListener("pointerdown", event => { const card = event.target.closest(".memory"); if (!card || event.pointerType === "mouse") return; const timer = window.setTimeout(() => card.classList.add("show-delete"), 550); card.addEventListener("pointerup", () => window.clearTimeout(timer), { once: true }); card.addEventListener("pointercancel", () => window.clearTimeout(timer), { once: true }); });
sourceSheet.addEventListener("click", event => { const source = event.target.dataset.source; if (!source) return; sourceSheet.close(); selectSource(source); });
fileInput.addEventListener("change", event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { pendingImage = reader.result; document.getElementById("caption-input").value = ""; if (supportsDialog()) openDialog(captionDialog); else { document.getElementById("caption-input").value = window.prompt("寫下一句備註……") || ""; savePending(); } }; reader.readAsDataURL(file); fileInput.value = ""; });
captionDialog.addEventListener("close", () => { if (captionDialog.returnValue === "confirm") savePending(); else pendingImage = null; });
deleteDialog.addEventListener("close", () => { if (deleteDialog.returnValue === "confirm" && deletingId) { writeMemories(readMemories().filter(memory => memory.id !== deletingId)); render(); } deletingId = null; });
