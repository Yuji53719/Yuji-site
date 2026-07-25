import "./font.js";
import { createThought } from "./cloudData.js";
import { requireAdmin } from "./auth.js";

const allowed = await requireAdmin();
if (allowed) {
  document.getElementById("thought-form").addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("thought-message");
    message.textContent = "正在保存……";
    try {
      await createThought({ title: document.getElementById("thought-title").value.trim(), content: document.getElementById("thought-content").value.trim().replace(/\n/g, "<br>") });
      window.location.href = "./thoughts.html";
    } catch (error) { message.textContent = `無法發布：${error.message}`; }
  });
}
