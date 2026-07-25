const crypto = require("crypto");

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(body)
});

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`伺服器尚未設定 ${name}`);
  return value;
}

function cookie(event, name) {
  const values = String(event.headers.cookie || "").split(";").map(value => value.trim());
  const matched = values.find(value => value.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : "";
}

function sign(value) {
  return crypto.createHmac("sha256", required("SESSION_SECRET")).update(value).digest("base64url");
}

function accounts() {
  const raw = process.env.SITE_ACCOUNTS_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("SITE_ACCOUNTS_JSON 必須是帳號陣列。");
    return parsed.map(account => ({
      username: String(account.username || ""),
      password: String(account.password || ""),
      role: account.role === "admin" ? "admin" : "editor",
      displayName: String(account.displayName || account.username || "投稿者")
    })).filter(account => account.username && account.password);
  }
  return [{ username: required("ADMIN_USERNAME"), password: required("ADMIN_PASSWORD"), role: "admin", displayName: "甲魚" }];
}

function sessionCookie(account) {
  const payload = Buffer.from(JSON.stringify({ issuedAt: Date.now(), username: account.username, role: account.role, displayName: account.displayName })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function currentUser(event) {
  try {
    const value = cookie(event, "jiayu_admin");
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const actual = Buffer.from(parts[1]);
    const expected = Buffer.from(sign(parts[0]));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const user = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!user.username || !["admin", "editor"].includes(user.role) || Date.now() - Number(user.issuedAt) >= 1000 * 60 * 60 * 24 * 14) return null;
    return user;
  } catch (_) { return null; }
}

function adminCookie(value, maxAge) {
  return `jiayu_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function supabaseHeaders(extra = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function supabase(path, options = {}) {
  const response = await fetch(`${required("SUPABASE_URL")}${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers || {})
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase 錯誤 ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function adminAuthorId() {
  const users = await supabase("/rest/v1/profiles?is_admin=eq.true&select=id&limit=1");
  if (!users?.[0]?.id) throw new Error("找不到管理員資料。");
  return users[0].id;
}

function filePath(path) {
  return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

module.exports = { accounts, adminAuthorId, adminCookie, cookie, currentUser, filePath, json, required, sessionCookie, supabase, supabaseHeaders };
