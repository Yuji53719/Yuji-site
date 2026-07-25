import { createComment, fetchComments } from "../js/cloudData.js";

const escape = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const dateLabel = value => new Date(value).toLocaleDateString("zh-Hant", { year: "numeric", month: "2-digit", day: "2-digit" });

function ensureStyles() {
  if (document.getElementById("comment-section-style")) return;
  document.head.insertAdjacentHTML("beforeend", `<style id="comment-section-style">.comment-section{margin-top:30px;padding-top:22px;border-top:1px solid var(--line)}.comment-section h3{margin:0 0 14px;font-size:19px}.comment-list{display:grid;gap:10px}.comment{padding:13px 15px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.comment-meta{display:flex;justify-content:space-between;gap:12px;margin:0;color:var(--muted);font-size:13px}.comment-body{margin:8px 0 0;font-size:16px;line-height:1.55;white-space:pre-wrap}.comment-form{display:grid;grid-template-columns:minmax(100px,180px) 1fr auto;gap:9px;margin-top:14px}.comment-form input,.comment-form textarea{min-width:0;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:10px;font:inherit}.comment-form textarea{min-height:44px;resize:vertical}.comment-form button{align-self:start;border:0;border-radius:12px;background:var(--blue);color:#fff;padding:11px 15px;font:inherit;font-weight:bold;cursor:pointer}.comment-message{grid-column:1/-1;min-height:1.2em;margin:0;color:var(--muted);font-size:13px}@media(max-width:560px){.comment-form{grid-template-columns:1fr}.comment-form button{justify-self:start}}</style>`);
}

export async function mountCommentSection(host, entityType, entityId) {
  if (!host || !entityId) return;
  ensureStyles();
  host.innerHTML = `<section class="comment-section"><h3>評價</h3><div class="comment-list" aria-live="polite"><p class="comment-meta">正在載入評價……</p></div><form class="comment-form"><input name="nickname" maxlength="40" required placeholder="你的暱稱" aria-label="你的暱稱"><textarea name="content" maxlength="1200" required placeholder="留下你的話……" aria-label="留言內容"></textarea><button type="submit">送出</button><p class="comment-message" role="status"></p></form></section>`;
  const list = host.querySelector(".comment-list");
  const message = host.querySelector(".comment-message");
  const render = comments => { list.innerHTML = comments.length ? comments.map(comment => `<article class="comment"><p class="comment-meta"><b>${escape(comment.nickname)}</b><time>${dateLabel(comment.created_at)}</time></p><p class="comment-body">${escape(comment.content)}</p></article>`).join("") : `<p class="comment-meta">還沒有評價，留下第一句話吧。</p>`; };
  const load = async () => { try { render(await fetchComments(entityType, entityId)); } catch (error) { list.innerHTML = `<p class="comment-meta">暫時無法載入評價。</p>`; } };
  await load();
  host.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const nickname = form.elements.nickname.value.trim();
    const content = form.elements.content.value.trim();
    if (!nickname || !content) { message.textContent = "請填寫暱稱與留言內容。"; return; }
    message.textContent = "正在送出……";
    try { await createComment({ entityType, entityId, nickname, content }); form.reset(); message.textContent = "已送出。"; await load(); } catch (error) { message.textContent = `無法送出：${error.message}`; }
  });
}
