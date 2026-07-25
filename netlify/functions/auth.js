const crypto = require("crypto");
const { adminCookie, isAdmin, json, required, sessionCookie } = require("./_shared");

exports.handler = async event => {
  if (event.httpMethod === "GET") return json(200, { admin: isAdmin(event) });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const body = JSON.parse(event.body || "{}");
  if (body.action === "logout") return json(200, { admin: false }, { "Set-Cookie": adminCookie("", 0) });
  if (body.action !== "login") return json(400, { error: "無效請求。" });
  const username = String(body.username || "");
  const password = String(body.password || "");
  const configuredUsername = required("ADMIN_USERNAME");
  const configuredPassword = required("ADMIN_PASSWORD");
  const usernameBuffer = Buffer.from(username);
  const configuredUsernameBuffer = Buffer.from(configuredUsername);
  const passwordBuffer = Buffer.from(password);
  const configuredPasswordBuffer = Buffer.from(configuredPassword);
  const usernameMatches = usernameBuffer.length === configuredUsernameBuffer.length && crypto.timingSafeEqual(usernameBuffer, configuredUsernameBuffer);
  const passwordMatches = passwordBuffer.length === configuredPasswordBuffer.length && crypto.timingSafeEqual(passwordBuffer, configuredPasswordBuffer);
  if (!usernameMatches || !passwordMatches) return json(401, { error: "帳號或密碼不正確。" });
  return json(200, { admin: true }, { "Set-Cookie": adminCookie(sessionCookie(), 60 * 60 * 24 * 14) });
};
