import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabasePublishableKey, supabaseUrl } from "../data/supabase.js";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

const authStyle = document.createElement("style");
authStyle.textContent = `.auth-button{margin-left:18px;border:0;border-bottom:1px solid currentColor;background:transparent;color:var(--blue);padding:7px 2px;font:inherit;font-size:15px;font-weight:bold;cursor:pointer;transition:transform .2s}.auth-button:hover{transform:translateY(-1px)}.auth-dialog{width:min(430px,calc(100% - 30px));border:0;border-radius:22px;background:var(--surface);color:var(--ink);padding:24px;box-shadow:var(--shadow)}.auth-dialog::backdrop{background:rgb(8 18 38 / .45)}.auth-dialog h2{margin:0 0 8px;font-size:30px}.auth-dialog p{margin:0 0 18px;color:var(--muted);line-height:1.55}.auth-dialog form{display:grid;gap:12px}.auth-dialog input{width:100%;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:12px;font:inherit}.auth-dialog button{border:0;border-radius:999px;background:var(--blue);color:#fff;padding:12px 18px;font:inherit;font-weight:bold;cursor:pointer}.auth-message{min-height:1.5em;margin:0!important;font-size:14px}.auth-user{display:inline-flex;align-items:center;gap:9px;margin-left:18px;color:var(--muted);font-size:14px}@media(max-width:560px){.auth-user{display:none}.auth-button{margin-left:12px}}`;
document.head.appendChild(authStyle);

const dialog = document.createElement("dialog");
dialog.className = "auth-dialog";
dialog.innerHTML = `<form method="dialog" id="auth-form"><h2>登入</h2><p>輸入任何可收信的 Email，我們會寄出一次性登入連結。</p><input type="email" name="email" autocomplete="email" placeholder="name@example.com" required><button type="submit">寄送登入連結</button><p class="auth-message" id="auth-message" aria-live="polite"></p></form>`;
document.body.appendChild(dialog);

const buttons = new Set();
function displayName(user) { return (user.user_metadata && user.user_metadata.display_name) || user.email.split("@")[0]; }
function renderUser(user) { buttons.forEach(button => { const previous = button.parentElement.querySelector(".auth-user"); if (previous) previous.remove(); if (user) { button.textContent = "登出"; button.setAttribute("aria-label", "登出"); button.insertAdjacentHTML("beforebegin", `<span class="auth-user">${displayName(user)}</span>`); } else { button.textContent = "登入"; button.setAttribute("aria-label", "登入"); } }); }
function addLoginButton() { const nav = document.querySelector("nav"); if (!nav) return; const target = nav.lastElementChild || nav; const button = document.createElement("button"); button.className = "auth-button"; button.type = "button"; target.appendChild(button); buttons.add(button); button.addEventListener("click", async () => { const { data: { user } } = await supabase.auth.getUser(); if (user) { await supabase.auth.signOut(); return; } dialog.querySelector("#auth-message").textContent = ""; dialog.showModal(); }); }

dialog.querySelector("#auth-form").addEventListener("submit", async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get("email") || "").trim(); const message = dialog.querySelector("#auth-message"); const submit = event.currentTarget.querySelector("button"); submit.disabled = true; message.textContent = "正在寄送登入連結……"; const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } }); submit.disabled = false; message.textContent = error ? "寄送失敗，請確認 Email 後再試一次。" : "登入連結已寄出，請到信箱開啟。"; });

addLoginButton();
supabase.auth.getUser().then(({ data: { user } }) => renderUser(user));
supabase.auth.onAuthStateChange((_event, session) => { renderUser(session && session.user); if (session && session.user && dialog.open) dialog.close(); });
