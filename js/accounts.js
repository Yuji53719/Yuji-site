import "./font.js";
import { getAuthState } from "./auth.js";

const endpoint = "/api/accounts";
const list = document.getElementById("account-list");
const message = document.getElementById("account-message");

async function request(options = {}) {
  const response = await fetch(endpoint, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "帳號服務暫時無法使用。");
  return data;
}

function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]); }

async function render() {
  const accounts = await request();
  list.innerHTML = accounts.map(account => `<article class="row" data-id="${account.id}"><div><p>${escapeHtml(account.displayName)} <small>@${escapeHtml(account.username)} · ${account.role === "admin" ? "管理員" : "投稿者"} · ${account.active ? "使用中" : "已停用"}</small></p></div><div class="row-actions"><button type="button" data-reset>重設密碼</button>${account.role !== "admin" ? `<button class="danger" type="button" data-toggle>${account.active ? "停用" : "啟用"}</button>` : ""}</div></article>`).join("");
}

document.getElementById("account-form").addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "正在建立……";
  try {
    await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", username: document.getElementById("account-username").value.trim(), displayName: document.getElementById("account-name").value.trim(), password: document.getElementById("account-password").value, role: "editor" }) });
    event.target.reset();
    message.textContent = "帳號已建立。";
    await render();
  } catch (error) { message.textContent = error.message; }
});

list.addEventListener("click", async event => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  try {
    if (event.target.matches("[data-reset]")) {
      const password = window.prompt("輸入新的密碼（至少 8 個字元）：");
      if (!password) return;
      await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id: row.dataset.id, password }) });
    }
    if (event.target.matches("[data-toggle]")) {
      const active = event.target.textContent === "啟用";
      await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id: row.dataset.id, active }) });
    }
    await render();
  } catch (error) { window.alert(error.message); }
});

const { user } = await getAuthState();
if (!user || user.role !== "admin") window.location.href = "./index.html?login=1";
else render().catch(error => { list.textContent = error.message; });
