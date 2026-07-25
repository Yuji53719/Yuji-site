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

function sessionCookie() {
  const payload = `${Date.now()}.${crypto.randomBytes(18).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

function isAdmin(event) {
  try {
    const value = cookie(event, "jiayu_admin");
    const parts = value.split(".");
    if (parts.length !== 3) return false;
    const payload = `${parts[0]}.${parts[1]}`;
    const actual = Buffer.from(parts[2]);
    const expected = Buffer.from(sign(payload));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
    return Date.now() - Number(parts[0]) < 1000 * 60 * 60 * 24 * 14;
  } catch (_) { return false; }
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

module.exports = { adminAuthorId, adminCookie, cookie, filePath, isAdmin, json, required, sessionCookie, supabase, supabaseHeaders };
