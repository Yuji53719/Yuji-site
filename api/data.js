const { createVercelHandler } = require("../vercel-adapter");
const { handler } = require("../netlify/functions/data");

module.exports = createVercelHandler(handler);
