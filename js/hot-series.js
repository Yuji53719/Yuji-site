import "./font.js";
import { fetchSeries } from "./cloudData.js";
import { addAdminControls } from "./auth.js";

const host = document.getElementById("series-grid");
const escape = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const dateLabel = value => new Date(`${value}T00:00:00`).toLocaleDateString("zh-Hant", { year: "numeric", month: "2-digit", day: "2-digit" });
const preview = value => { const template = document.createElement("template"); template.innerHTML = value || ""; return template.content.textContent || ""; };

async function render() {
  const posts = await fetchSeries();
  host.innerHTML = posts?.length ? posts.map(post => `<article class="series-card">${post.cover ? `<img src="${post.cover}" alt="${escape(post.title)}">` : ""}<div class="series-info"><p class="series-date">${dateLabel(post.publishedAt)}</p><h2>${escape(post.title)}</h2><p class="series-preview">${escape(preview(post.content))}</p></div></article>`).join("") : `<p class="series-empty">還沒有正在連載的內容。</p>`;
}

addAdminControls();
render();
