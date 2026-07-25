const { adminCookie, authenticateAccount, currentUser, json, sessionCookie } = require("./_shared");

exports.handler = async event => {
  const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": event.headers.origin || "", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, Accept", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {}, headers);
    if (event.httpMethod === "GET") return json(200, { user: currentUser(event) }, headers);
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, headers);
    const body = JSON.parse(event.body || "{}");
    if (body.action === "logout") return json(200, { admin: false }, { ...headers, "Set-Cookie": adminCookie("", 0) });
    if (body.action !== "login") return json(400, { error: "無效請求。" }, headers);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return json(400, { error: "請輸入帳號與密碼。" }, headers);
    const account = await authenticateAccount(username, password);
    if (!account) return json(401, { error: "帳號或密碼不正確。" }, headers);
    return json(200, { user: { username: account.username, role: account.role, displayName: account.displayName } }, { ...headers, "Set-Cookie": adminCookie(sessionCookie(account), 60 * 60 * 24 * 14) });
  } catch (error) {
    console.error("Auth function failed", error);
    const message = String(error.message || "");
    const safeError = message.includes("SESSION_SECRET") ? "登入服務尚未設定 SESSION_SECRET。" : message.includes("SITE_ACCOUNTS_JSON") || message.includes("ADMIN_USERNAME") ? "登入服務尚未設定管理帳號。" : "登入服務暫時無法使用，請稍後再試。";
    return json(500, { error: safeError }, headers);
  }
};
