import "../js/auth.js";
import "../js/font.js";
import { thoughtEditor, bindEditor } from "../components/ThoughtEditor.js";
import { createThought } from "../js/cloudData.js";
const form = document.getElementById("upload-form"); document.getElementById("editor-shell").innerHTML = thoughtEditor(); bindEditor(document.getElementById("editor-shell"));
form.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(form); const content = document.querySelector("[data-editor]").innerHTML.trim(); if (!content) return; const created = await createThought({ author: data.get("author").trim(), title: data.get("title").trim(), content }); if (created) location.href = "./thoughts.html"; });
