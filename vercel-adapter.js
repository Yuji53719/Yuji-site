const { Readable } = require("stream");

async function rawBody(request) {
  if (request.body !== undefined) {
    if (Buffer.isBuffer(request.body)) return request.body;
    if (typeof request.body === "string") return Buffer.from(request.body);
    return Buffer.from(JSON.stringify(request.body));
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function queryFrom(request) {
  const url = new URL(request.url || "/", `https://${request.headers.host || "localhost"}`);
  return Object.fromEntries(url.searchParams.entries());
}

function createVercelHandler(netlifyHandler) {
  return async (request, response) => {
    const raw = await rawBody(request);
    const contentType = String(request.headers["content-type"] || "");
    const binary = !contentType.includes("application/json") && raw.length > 0;
    const event = {
      httpMethod: request.method,
      headers: request.headers,
      body: binary ? raw.toString("base64") : raw.toString("utf8"),
      isBase64Encoded: binary,
      queryStringParameters: queryFrom(request)
    };
    const result = await netlifyHandler(event);
    Object.entries(result.headers || {}).forEach(([name, value]) => response.setHeader(name, value));
    response.status(result.statusCode || 200).send(result.body || "");
  };
}

module.exports = { createVercelHandler, Readable };
