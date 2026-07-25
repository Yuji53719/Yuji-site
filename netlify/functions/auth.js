const crypto = require("crypto");
const { accounts, adminCookie, currentUser, json, sessionCookie } = require("./_shared");

exports.handler = async event => {
  if (event.httpMethod === "GET") return json(200, { user: currentUser(event) });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const body = JSON.parse(event.body || "{}");
  if (body.action === "logout") return json(200, { admin: false }, { "Set-Cookie": adminCookie("", 0) });
  if (body.action !== "login") return json(400, { error: "無效請求。" });
  const username = String(body.username || "");
  const password = String(body.password || "");
  const account = accounts().find(candidate => {
    const enteredUsername = Buffer.from(username);
    const expectedUsername = Buffer.from(candidate.username);
    const enteredPassword = Buffer.from(password);
    const expectedPassword = Buffer.from(candidate.password);
    return enteredUsername.length === expectedUsername.length && enteredPassword.length === expectedPassword.length && crypto.timingSafeEqual(enteredUsername, expectedUsername) && crypto.timingSafeEqual(enteredPassword, expectedPassword);
  });
  if (!account) return json(401, { error: "帳號或密碼不正確。" });
  return json(200, { user: { username: account.username, role: account.role, displayName: account.displayName } }, { "Set-Cookie": adminCookie(sessionCookie(account), 60 * 60 * 24 * 14) });
};
