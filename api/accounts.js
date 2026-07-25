const { createVercelHandler } = require("../vercel-adapter");
const { handler } = require("../netlify/functions/accounts");

module.exports = createVercelHandler(handler);
