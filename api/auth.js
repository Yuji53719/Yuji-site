const { createVercelHandler } = require("../vercel-adapter");
const { handler } = require("../netlify/functions/auth");

module.exports = createVercelHandler(handler);
