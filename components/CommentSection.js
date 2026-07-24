import { supportsDialog } from "../utils/browserCompatibility.js";
import { createComment, deleteComment, fetchComments, isUuid, toggleLike } from "../js/cloudData.js";

const maxReplyDepth = 5;
const cache = new Map();
const ginkgo = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V15M16 15C10 7 4 7 4 13c0 5 6 6 12 2M16 15c6-8 12-8 12-2 0 5-6 6-12 2"/></svg>`;
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const displayDate = value => { const date = new Date(`${String(value).slice(0, 10)}T00:00:00`); return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`; };
const cacheKey = (kind, identifier) => `${kind}:${identifier}`;
const localKey = (kind, identifier) => kind === "thought" ? `jiayu-comments-${identifier}` : `jiayu-memory-comments-${identifier}`;
const readLocal = (kind, identifier) => { try { return JSON.parse(localStorage.getItem(localKey(kind, identifier)) || "[]"); } catch (_) { return []; } };
const writeLocal = (kind, identifier, comments) => localStorage.setItem(localKey(kind, identifier), JSON.stringify(comments));
const pathValue = path => path ? path.split(".").map(Number) : [];
const commentButton = (kind, identifier, parent = "") => `<button class="comment-trigger" type="button" data-comment-open data-comment-kind="${kind}" data-comment-id="${identifier}" data-comment-parent="${parent}">留言</button>`;

export async function primeComments(kind, identifier) {
  const cloud = await fetchComments(kind, identifier);
  cache.set(cacheKey(kind, identifier), { cloud: cloud !== null, comments: cloud === null ? readLocal(kind, identifier) : cloud });
}

function state(kind, identifier) { return cache.get(cacheKey(kind, identifier)) || { cloud: false, comments: readLocal(kind, identifier) }; }
function nodeAt(comments, path) { return pathValue(path).reduce((node, index, depth) => depth === 0 ? node[index] : (node.replies || [])[index], comments); }
function commentNodeMarkup(node, kind, identifier, path, depth, cloud) {
  const replies = node.replies || [];
  const isRoot = depth === 0;
  const parent = cloud ? node.id : path;
  const deleteControl = !cloud || node.owner ? `<button class="comment-delete" type="button" data-comment-delete data-comment-kind="${kind}" data-comment-id="${identifier}" data-comment-path="${path}" data-comment-node="${node.id || ""}" aria-label="刪除留言">刪除</button>` : "";
  return `<article class="${isRoot ? "comment" : "reply-card"}" style="--reply-depth:${depth}"><div class="comment-head"><div class="comment-meta"><b>${escapeHtml(node.name || "匿名")}</b><time>${displayDate(node.createdAt || new Date().toISOString())}</time></div><div class="comment-actions"><button class="comment-like${node.liked ? " liked" : ""}" type="button" aria-pressed="${Boolean(node.liked)}" data-comment-like data-comment-kind="${kind}" data-comment-id="${identifier}" data-comment-path="${path}" data-comment-node="${node.id || ""}" data-comment-cloud="${cloud}">${ginkgo}<span>喜歡</span></button>${depth < maxReplyDepth ? commentButton(kind, identifier, parent) : ""}${deleteControl}</div></div><p>${escapeHtml(node.text)}</p>${replies.length ? `<div class="reply-list">${replies.map((reply, index) => commentNodeMarkup(reply, kind, identifier, `${path}.${index}`, depth + 1, cloud)).join("")}</div>` : ""}</article>`;
}

function commentsMarkup(kind, identifier) {
  const current = state(kind, identifier);
  const comments = current.comments;
  return `<section class="comments shared-comments" data-comment-section="${identifier}"><h3>留言 <small>${comments.length}</small></h3><div class="comment-list">${comments.length ? comments.map((comment, index) => commentNodeMarkup(comment, kind, identifier, String(index), 0, current.cloud)).join("") : `<p class="empty">還沒有留言，說點什麼吧。</p>`}</div></section>`;
}

export function articleCommentButton(kind, identifier) { return commentButton(kind, identifier); }
export function commentSection(kind, identifier) { return commentsMarkup(kind, identifier); }

export function mountCommentComposer() {
  if (document.getElementById("comment-composer")) return;
  document.head.insertAdjacentHTML("beforeend", `<style>.empty[hidden]{display:none!important}.thought-primary-actions{display:flex;align-items:center;gap:18px}.thought-primary-actions .comment-trigger{font-size:16px;padding:10px 2px}.comment-trigger{border:0;border-bottom:1px solid currentColor;background:transparent;color:var(--blue);padding:7px 2px;font:inherit;font-size:14px;cursor:pointer;transition:transform .2s}.comment-trigger:hover{transform:translateY(-1px)}.shared-comments{margin-top:36px;padding:0!important;border:0!important;background:transparent!important}.comment-list{display:grid;gap:12px}.comment,.reply-card,.comment-composer-form{border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}.comment{padding:18px}.reply-list{display:grid;gap:9px;margin:14px 0 0 min(28px,5vw)}.reply-card{padding:14px}.comment-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.comment-meta b{display:block;font-size:17px}.comment-meta time{display:block;margin-top:4px;color:var(--muted);font-size:13px}.comment-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.comment-like{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--blue);padding:7px 2px;font:inherit;font-size:14px;cursor:pointer}.comment-like.liked{color:var(--accent);font-weight:bold}.comment-like svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}.comment-delete{border:0;background:transparent;color:var(--red);padding:7px 2px;font:inherit;font-size:14px;cursor:pointer}.comment p,.reply-card p{margin:13px 0 0;font-size:15px;line-height:1.65}.comment-composer{width:min(500px,calc(100% - 30px));border:0;background:transparent;color:var(--ink);padding:0;box-shadow:none}.comment-composer::backdrop{background:rgb(8 18 38 / .45)}.comment-composer h2{margin:0 0 8px;font-size:29px}.comment-composer-form{display:grid;gap:10px;padding:18px}.comment-composer input,.comment-composer textarea{width:100%;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:11px;font:inherit}.comment-composer textarea{min-height:120px;resize:vertical}.comment-composer-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.comment-composer-actions button{border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:12px;font:inherit;cursor:pointer}.comment-composer-actions .send-comment{border-color:var(--blue);background:var(--blue);color:#fff}@media(max-width:560px){.comment{padding:15px}.reply-list{margin-left:10px}.comment-actions{gap:6px}.comment-composer-form{padding:16px}}</style>`);
  document.body.insertAdjacentHTML("beforeend", `<dialog class="comment-composer" id="comment-composer"><form class="comment-composer-form" method="dialog"><h2 id="comment-composer-title">留下留言</h2><input name="name" maxlength="20" placeholder="你的名稱" required><textarea name="text" maxlength="300" placeholder="寫下留言…" required></textarea><div class="comment-composer-actions"><button value="cancel" formnovalidate>暫時不說</button><button class="send-comment" value="confirm">發送留言</button></div></form></dialog>`);
}

export function bindCommentInteractions(onUpdate, confirmRemoval) {
  const composer = document.getElementById("comment-composer");
  document.addEventListener("click", async event => {
    const openButton = event.target.closest("[data-comment-open]");
    if (openButton) { composer.dataset.kind = openButton.dataset.commentKind; composer.dataset.identifier = openButton.dataset.commentId; composer.dataset.parent = openButton.dataset.commentParent || ""; composer.querySelector("#comment-composer-title").textContent = composer.dataset.parent === "" ? "留下留言" : "回覆留言"; composer.querySelector("form").reset(); if (supportsDialog()) composer.showModal(); else { const text = window.prompt("寫下留言…"); if (text) await saveComposerComment(composer, "匿名", text); } return; }
    const likeButton = event.target.closest("[data-comment-like]");
    if (likeButton) { const current = state(likeButton.dataset.commentKind, likeButton.dataset.commentId); if (current.cloud && isUuid(likeButton.dataset.commentNode)) await toggleLike("comment", likeButton.dataset.commentNode); else { const target = nodeAt(current.comments, likeButton.dataset.commentPath); if (target) { target.liked = !target.liked; writeLocal(likeButton.dataset.commentKind, likeButton.dataset.commentId, current.comments); } } await primeComments(likeButton.dataset.commentKind, likeButton.dataset.commentId); onUpdate(); return; }
    const deleteButton = event.target.closest("[data-comment-delete]");
    if (deleteButton && await confirmRemoval()) { const current = state(deleteButton.dataset.commentKind, deleteButton.dataset.commentId); if (current.cloud && isUuid(deleteButton.dataset.commentNode)) await deleteComment(deleteButton.dataset.commentNode); else { const path = pathValue(deleteButton.dataset.commentPath); const index = path.pop(); const list = path.length ? (nodeAt(current.comments, path.join(".")).replies || []) : current.comments; list.splice(index, 1); writeLocal(deleteButton.dataset.commentKind, deleteButton.dataset.commentId, current.comments); } await primeComments(deleteButton.dataset.commentKind, deleteButton.dataset.commentId); onUpdate(); }
  });
  composer.addEventListener("close", async () => { if (composer.returnValue !== "confirm") return; const form = composer.querySelector("form"); await saveComposerComment(composer, form.elements.name.value.trim(), form.elements.text.value.trim()); });
  async function saveComposerComment(dialog, name, text) { if (!text) return; const current = state(dialog.dataset.kind, dialog.dataset.identifier); if (current.cloud) await createComment({ entityType: dialog.dataset.kind, entityId: dialog.dataset.identifier, parentId: dialog.dataset.parent, text, name }); else { const entry = { id: "", name: name || "匿名", text, createdAt: new Date().toISOString(), replies: [] }; if (dialog.dataset.parent === "") current.comments.push(entry); else { const parent = nodeAt(current.comments, dialog.dataset.parent); if (parent) { parent.replies = parent.replies || []; parent.replies.push(entry); } } writeLocal(dialog.dataset.kind, dialog.dataset.identifier, current.comments); } await primeComments(dialog.dataset.kind, dialog.dataset.identifier); onUpdate(); }
}
