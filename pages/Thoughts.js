import "../js/font.js";
import { thoughts as authoredThoughts } from "../data/thoughtData.js";
import { thoughtCard } from "../components/ThoughtCard.js";
import { mountCommentSection } from "../components/CommentSection.js";
import { createRichTextEditor, richTextEditorStyles } from "../components/RichTextEditor.js";
import { deleteThought, fetchThoughts, updateThought } from "../js/cloudData.js";
import { addAdminControls, getAuthState } from "../js/auth.js";

const userThoughts = () => { try { return JSON.parse(localStorage.getItem("jiayu-user-thoughts") || "[]"); } catch (_) { return []; } };

let renderedThoughts = [];

async function render() {
  const remote = await fetchThoughts();
  renderedThoughts = [...(remote || []), ...userThoughts(), ...authoredThoughts]
    .sort((first, second) => String(second.createdAt || second.publishedAt).localeCompare(String(first.createdAt || first.publishedAt)));
  document.getElementById("thought-list").innerHTML = renderedThoughts.map(thoughtCard).join("");
  await Promise.all(renderedThoughts.map(thought => {
    const card = [...document.querySelectorAll(".thought")].find(item => item.dataset.id === String(thought.id));
    return mountCommentSection(card?.querySelector(".thought-comments"), "thought", thought.id);
  }));
}

function openEditor(thought) {
  let dialog = document.getElementById("thought-edit-dialog");
  if (!dialog) {
    document.head.insertAdjacentHTML("beforeend", `<style id="thought-edit-style">${richTextEditorStyles}.thought-edit-dialog{width:min(760px,calc(100% - 28px));border:1px solid var(--line);border-radius:22px;background:var(--surface);color:var(--ink);padding:24px;box-shadow:var(--shadow)}.thought-edit-dialog::backdrop{background:rgb(8 18 38 / .48)}.thought-edit-form{display:grid;gap:14px}.thought-edit-form input{border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:12px;font:inherit}.thought-edit-form button{justify-self:start;border:0;border-radius:12px;background:var(--blue);color:#fff;padding:12px 18px;font:inherit;font-weight:bold;cursor:pointer}</style>`);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="thought-edit-dialog" id="thought-edit-dialog"><form class="thought-edit-form"><button type="button" class="thought-edit-close">關閉 ×</button><h2>編輯隨想</h2><label>標題（可留空）<input name="title" maxlength="120"></label><div class="thought-edit-editor"></div><p class="thought-edit-message"></p><button type="submit">保存</button></form></dialog>`);
    dialog = document.getElementById("thought-edit-dialog");
    const editor = createRichTextEditor({ label: "正文" });
    dialog.querySelector(".thought-edit-editor").append(editor.element);
    dialog._editor = editor;
    dialog.querySelector(".thought-edit-close").addEventListener("click", () => dialog.close());
    dialog.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const target = dialog._thought;
      const message = dialog.querySelector(".thought-edit-message");
      const content = dialog._editor.getValue();
      if (!content) { message.textContent = "正文不能留空。"; return; }
      message.textContent = "正在保存……";
      try { await updateThought({ id: target.id, title: event.currentTarget.elements.title.value.trim(), content }); dialog.close(); await render(); await setupActions(); } catch (error) { message.textContent = `無法保存：${error.message}`; }
    });
  }
  dialog._thought = thought;
  dialog.querySelector("form").elements.title.value = thought.title || "";
  dialog._editor.setValue(thought.content || "");
  dialog.querySelector(".thought-edit-message").textContent = "";
  dialog.showModal();
}

async function setupActions() {
  const { user } = await getAuthState();
  if (!user) return;
  document.getElementById("upload-thought-link")?.classList.add("is-admin");
  document.querySelectorAll(".thought[data-cloud=\"true\"]").forEach(card => {
    const button = card.querySelector(".delete-thought");
    const edit = card.querySelector(".edit-thought");
    if (!button || (user.role !== "admin" && card.dataset.owner !== user.username)) return;
    button.hidden = false;
    edit.hidden = false;
    edit.addEventListener("click", () => openEditor(renderedThoughts.find(thought => String(thought.id) === card.dataset.id)));
    button.addEventListener("click", async () => {
      if (!window.confirm("確定要刪除這則隨想嗎？")) return;
      try { await deleteThought(card.dataset.id); card.remove(); } catch (error) { window.alert(error.message); }
    });
  });
}

render().then(setupActions);
addAdminControls();
