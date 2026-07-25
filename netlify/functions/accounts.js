const { createStoredAccount, currentUser, json, passwordHash, storedAccounts, supabase } = require("./_shared");

function requireAdministrator(event) {
  const user = currentUser(event);
  if (!user || user.role !== "admin") throw new Error("只有管理員可以管理帳號。");
  return user;
}

function publicAccount(account) {
  return { id: account.id, username: account.username, role: account.role, displayName: account.display_name, active: account.is_active };
}

exports.handler = async event => {
  try {
    const administrator = requireAdministrator(event);
    if (event.httpMethod === "GET") {
      const accounts = await storedAccounts();
      if (accounts === null) throw new Error("尚未建立帳號資料表。");
      return json(200, accounts.map(publicAccount));
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    const body = JSON.parse(event.body || "{}");
    if (body.action === "create") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) throw new Error("帳號請使用 3–40 個英文字母、數字、底線或連字號。");
      if (password.length < 8) throw new Error("密碼至少需要 8 個字元。");
      const account = await createStoredAccount({ username, password, role: body.role, displayName: body.displayName });
      return json(201, publicAccount(account));
    }
    if (body.action === "update") {
      const identifier = encodeURIComponent(String(body.id || ""));
      const allAccounts = await storedAccounts();
      const target = allAccounts?.find(account => account.id === body.id);
      if (!target) throw new Error("找不到此帳號。");
      const changes = {};
      if (typeof body.displayName === "string") changes.display_name = body.displayName.trim() || "投稿者";
      if (typeof body.active === "boolean") {
        if (!body.active && target.username === administrator.username) throw new Error("不能停用自己。");
        if (!body.active && target.role === "admin" && allAccounts.filter(account => account.role === "admin" && account.is_active).length < 2) throw new Error("至少需要保留一位啟用中的管理員。");
        changes.is_active = body.active;
      }
      if (typeof body.password === "string" && body.password) {
        if (body.password.length < 8) throw new Error("密碼至少需要 8 個字元。");
        changes.password_hash = passwordHash(body.password);
      }
      if (!Object.keys(changes).length) throw new Error("沒有可更新的內容。");
      const rows = await supabase(`/rest/v1/site_accounts?id=eq.${identifier}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(changes) });
      return json(200, publicAccount(rows[0]));
    }
    return json(400, { error: "未知操作。" });
  } catch (error) { return json(500, { error: error.message || "帳號服務發生錯誤。" }); }
};
