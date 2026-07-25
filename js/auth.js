const endpoint = "/.netlify/functions/auth";

async function request(body, method = "POST") {
  const response = await fetch(endpoint, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "登入服務暫時無法使用。");
  return data;
}

export async function isAdmin() {
  try { return Boolean((await request(null, "GET")).admin); } catch (_) { return false; }
}

export async function requireAdmin() {
  if (await isAdmin()) return true;
  window.location.href = "./index.html?login=1";
  return false;
}

function modal() {
  return `<dialog class="admin-login" id="admin-login"><form method="dialog" class="admin-login-card"><button class="admin-close" value="cancel" aria-label="關閉">×</button><p class="admin-eyebrow">管理員</p><h2>登入後整理花園</h2><label>帳號<input id="admin-username" type="text" autocomplete="username" required></label><label>密碼<input id="admin-password" type="password" autocomplete="current-password" required></label><p class="admin-error" id="admin-error" role="alert"></p><button class="admin-submit" id="admin-submit" type="submit">登入</button></form></dialog>`;
}

function style() {
  return `<style id="admin-auth-style">.admin-trigger{border:0;background:transparent;color:var(--blue);font:inherit;font-weight:bold;letter-spacing:.08em;cursor:pointer;border-bottom:1px solid currentColor;padding:0}.admin-login{width:min(410px,calc(100% - 30px));border:1px solid var(--line);border-radius:22px;background:var(--surface);color:var(--ink);padding:0;box-shadow:var(--shadow)}.admin-login::backdrop{background:rgb(8 18 38 / .48)}.admin-login-card{position:relative;display:grid;gap:15px;padding:28px}.admin-login-card h2{margin:0 0 4px;font-size:31px;letter-spacing:-.05em}.admin-eyebrow{margin:0;color:var(--blue);font-size:13px;font-weight:bold;letter-spacing:.12em}.admin-login-card label{display:grid;gap:7px;font-size:15px;font-weight:bold}.admin-login-card input{width:100%;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink);padding:12px;font:inherit}.admin-submit{border:0;border-radius:12px;background:var(--blue);color:#fff;padding:13px;font:inherit;font-weight:bold;cursor:pointer}.admin-close{position:absolute;right:16px;top:12px;border:0;background:transparent;color:var(--muted);font-size:25px;cursor:pointer}.admin-error{min-height:1.2em;margin:0;color:var(--red,#bd3446);font-size:14px}</style>`;
}

export function addAdminControls() {
  if (document.getElementById("admin-login")) return;
  document.head.insertAdjacentHTML("beforeend", style());
  document.body.insertAdjacentHTML("beforeend", modal());
  const dialog = document.getElementById("admin-login");
  const trigger = document.querySelector("[data-admin-login]");
  const error = document.getElementById("admin-error");
  dialog.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    error.textContent = "";
    try {
      await request({ action: "login", username: document.getElementById("admin-username").value.trim(), password: document.getElementById("admin-password").value });
      window.location.reload();
    } catch (loginError) { error.textContent = `登入失敗：${loginError.message}`; }
  });
  isAdmin().then(admin => {
    if (!trigger) return;
    if (!admin) {
      trigger.addEventListener("click", () => dialog.showModal());
      if (new URLSearchParams(window.location.search).get("login") === "1") dialog.showModal();
      return;
    }
    trigger.textContent = "管理中 · 登出";
    trigger.addEventListener("click", async () => { await request({ action: "logout" }); window.location.reload(); });
    document.documentElement.dataset.admin = "true";
    document.dispatchEvent(new CustomEvent("admin-ready"));
  });
}
