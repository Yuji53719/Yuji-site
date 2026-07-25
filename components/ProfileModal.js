import { defaultProfileContent } from "../data/profileData.js";
import { createRichTextEditor, richTextEditorStyles } from "./RichTextEditor.js";
import { fetchProfile, updateProfile } from "../js/cloudData.js";
import { getAuthState } from "../js/auth.js";

const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const sanitise = value => { const template = document.createElement("template"); template.innerHTML = value; template.content.querySelectorAll("script,style,iframe,object").forEach(node => node.remove()); template.content.querySelectorAll("*").forEach(node => [...node.attributes].forEach(attribute => { if (attribute.name.startsWith("on") || attribute.name === "style") node.removeAttribute(attribute.name); })); return template.innerHTML; };

export function installProfileModal(trigger) {
  if (!trigger || document.getElementById("profile-modal")) return;
  document.head.insertAdjacentHTML("beforeend", `<style id="profile-modal-style">${richTextEditorStyles}.profile-modal{width:min(720px,calc(100% - 28px));max-height:min(760px,calc(100vh - 28px));border:1px solid var(--line);border-radius:24px;background:var(--surface);color:var(--ink);padding:0;box-shadow:var(--shadow)}.profile-modal::backdrop{background:rgb(8 18 38 / .54)}.profile-modal-inner{padding:clamp(24px,5vw,46px);overflow:auto;max-height:inherit}.profile-modal-close{float:right;border:0;background:transparent;color:var(--muted);font-size:29px;line-height:1;cursor:pointer}.profile-modal p{font-size:clamp(19px,3vw,28px);line-height:1.65}.profile-modal h2{margin:14px 0 30px;font-size:clamp(38px,7vw,68px)}.profile-modal-actions{display:flex;align-items:center;gap:12px;margin-top:24px}.profile-modal-actions button{border:0;border-radius:13px;background:var(--blue);color:#fff;padding:12px 18px;font:inherit;font-weight:bold;cursor:pointer}.profile-modal-actions .profile-cancel{background:transparent;color:var(--muted);border:1px solid var(--line)}.profile-modal-message{margin:0!important;color:var(--muted);font-size:14px!important}</style>`);
  document.body.insertAdjacentHTML("beforeend", `<dialog class="profile-modal" id="profile-modal"><div class="profile-modal-inner"><button class="profile-modal-close" type="button" aria-label="關閉">×</button><p class="eyebrow">PERSONAL PROFILE</p><h2>甲魚</h2><div id="profile-display"></div><div id="profile-editor" hidden></div><div class="profile-modal-actions"><button type="button" id="profile-edit" hidden>編輯介紹</button><button type="button" id="profile-save" hidden>保存</button><button class="profile-cancel" type="button" id="profile-cancel" hidden>取消</button><p class="profile-modal-message" id="profile-message"></p></div></div></dialog>`);
  const modal = document.getElementById("profile-modal");
  const display = document.getElementById("profile-display");
  const editorHost = document.getElementById("profile-editor");
  const edit = document.getElementById("profile-edit");
  const save = document.getElementById("profile-save");
  const cancel = document.getElementById("profile-cancel");
  const message = document.getElementById("profile-message");
  const editor = createRichTextEditor({ label: "自我介紹", value: defaultProfileContent, placeholder: "寫下你的自我介紹……" });
  editorHost.append(editor.element);
  let profile = defaultProfileContent;
  let administrator = false;
  const show = () => { display.innerHTML = sanitise(profile); };
  const setEditing = state => { editorHost.hidden = !state; display.hidden = state; edit.hidden = state || !administrator; save.hidden = !state; cancel.hidden = !state; message.textContent = ""; };
  const load = async () => { try { profile = (await fetchProfile())?.content || defaultProfileContent; } catch (_) { profile = defaultProfileContent; } editor.setValue(profile); show(); };
  const open = async () => { await load(); modal.showModal(); };
  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  modal.querySelector(".profile-modal-close").addEventListener("click", () => modal.close());
  edit.addEventListener("click", () => { editor.setValue(profile); setEditing(true); editor.focus(); });
  cancel.addEventListener("click", () => setEditing(false));
  save.addEventListener("click", async () => { const content = editor.getValue(); if (!content) { message.textContent = "介紹不能留空。"; return; } message.textContent = "正在保存……"; try { profile = (await updateProfile(content)).content; show(); setEditing(false); } catch (error) { message.textContent = `無法保存：${escape(error.message)}`; } });
  getAuthState().then(({ user }) => { administrator = user?.role === "admin"; edit.hidden = !administrator; });
  document.addEventListener("admin-ready", event => { administrator = event.detail?.role === "admin"; edit.hidden = !administrator; });
}
