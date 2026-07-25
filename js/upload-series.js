import "./font.js";
import { createRichTextEditor } from "../components/RichTextEditor.js";
import { createSeries } from "./cloudData.js";
import { requireAdmin } from "./auth.js";

const allowed = await requireAdmin();
if (allowed) {
  const editor = createRichTextEditor({ label: "正文", placeholder: "寫下這一回的故事……" });
  document.getElementById("series-editor").append(editor.element);
  document.getElementById("series-form").addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("series-message");
    const content = editor.getValue();
    if (!content) { message.textContent = "請先寫下正文。"; return; }
    message.textContent = "正在發布……";
    try {
      await createSeries({ title: document.getElementById("series-title").value.trim(), content, cover: document.getElementById("series-cover").files[0] || null });
      window.location.href = "./hot-series.html";
    } catch (error) { message.textContent = `無法發布：${error.message}`; }
  });
}
