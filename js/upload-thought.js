import "./font.js";
import { createThought } from "./cloudData.js";
import { requireAdmin } from "./auth.js";
import { createRichTextEditor } from "../components/RichTextEditor.js";

const allowed = await requireAdmin();
if (allowed) {
  const editor = createRichTextEditor({ label: "正文", placeholder: "寫下此刻想留下的話……" });
  document.getElementById("thought-editor").append(editor.element);
  document.getElementById("thought-form").addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("thought-message");
    message.textContent = "正在保存……";
    try {
      const content = editor.getValue();
      if (!content) throw new Error("請先寫下正文。");
      await createThought({ title: document.getElementById("thought-title").value.trim(), content });
      window.location.href = "./thoughts.html";
    } catch (error) { message.textContent = `無法發布：${error.message}`; }
  });
}
