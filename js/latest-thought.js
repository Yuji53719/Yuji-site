import { thoughts as authoredThoughts } from "../data/thoughtData.js";

function safeStoredThoughts() { try { return JSON.parse(localStorage.getItem("jiayu-user-thoughts") || "[]"); } catch (_) { return []; } }
function displayDate(value) { const date = new Date(`${value}T00:00:00`); return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`; }
function preview(content) { const template = document.createElement("template"); template.innerHTML = content || ""; return (template.content.textContent || "").trim().replace(/\s+/g, " ").slice(0, 110); }
function renderLatestThought() { const host = document.getElementById("latest-thought"); if (!host) return; const thoughts = safeStoredThoughts().concat(authoredThoughts).sort((first, second) => String(second.createdAt || second.publishedAt).localeCompare(String(first.createdAt || first.publishedAt))); const latest = thoughts[0]; if (!latest) { host.innerHTML = `<div class="latest-empty">還沒有隨想，等待第一段意識留下痕跡。</div>`; return; } host.innerHTML = `<a class="latest-card" href="./thoughts.html"><p class="latest-date">${displayDate(latest.publishedAt)}</p><h3>${latest.title || "未命名隨想"}</h3><p>${preview(latest.content)}</p><span>閱讀隨想 →</span></a>`; }
renderLatestThought();
