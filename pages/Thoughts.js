import { thoughts as authoredThoughts } from "../data/thoughtData.js";
import { thoughtCard } from "../components/ThoughtCard.js";
import { toggleLike } from "../components/LikeButton.js";
import { mountDeleteConfirmModal, confirmDelete } from "../components/DeleteConfirmModal.js";
import { bindCommentInteractions, mountCommentComposer } from "../components/CommentSection.js";
const submitLink = document.querySelector('.upload-link[href="./upload-thought.html"]');
if (submitLink) { submitLink.textContent = "投稿"; submitLink.classList.add("submit-thought"); const submitStyle = document.createElement("style"); submitStyle.textContent = ".submit-thought{display:inline-block;border:0!important;border-radius:999px;background:#245fa8;color:#fff!important;padding:11px 18px;font-weight:bold;box-shadow:0 14px 36px rgb(25 71 132 / .10);transition:transform .2s}.submit-thought:hover{transform:translateY(-2px)}@media(prefers-color-scheme:dark){.submit-thought{background:#85b9f6;color:#1b2028!important}}.comments{padding:0;border:0;background:transparent}.comments h3{margin:0 0 16px}.comment-list{display:grid;gap:12px}.comment{padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}.comment-form{margin-top:16px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}.comment-like{display:inline-flex;align-items:center;gap:5px}.comment-like svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}footer{padding:30px 0 42px;color:var(--muted);line-height:1.65}"; document.head.appendChild(submitStyle); }
const userThoughts = () => JSON.parse(localStorage.getItem("jiayu-user-thoughts") || "[]");
const deletedThoughts = () => JSON.parse(localStorage.getItem("jiayu-deleted-thoughts") || "[]");
const render = () => { const removed = deletedThoughts(); document.getElementById("thought-list").innerHTML = [...userThoughts(), ...authoredThoughts].filter(thought => !removed.includes(thought.id)).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)).map(thoughtCard).join(""); };
render();
const deleteModal = mountDeleteConfirmModal("delete-thought-modal", { title: "打包扔掉？", cancel: "拆開垃圾袋", confirm: "扔進垃圾桶" });
const deleteCommentModal = mountDeleteConfirmModal("delete-comment-modal", { title: "剪掉新枝？", cancel: "恣意生長", confirm: "咔嚓" });
mountCommentComposer();
bindCommentInteractions(render, () => confirmDelete(deleteCommentModal));
document.getElementById("thought-list").addEventListener("click", async event => { const button = event.target.closest("[data-like]"); if (button) { toggleLike(button.dataset.like); render(); return; } const deleteButton = event.target.closest("[data-delete]"); if (!deleteButton || !(await confirmDelete(deleteModal))) return; const removed = deletedThoughts(); localStorage.setItem("jiayu-deleted-thoughts", JSON.stringify([...removed, deleteButton.dataset.delete])); render(); });
