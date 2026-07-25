export function createRichTextEditor({ value = "", placeholder = "寫下想留下的話……", label = "正文" } = {}) {
  const root = document.createElement("div");
  root.className = "rich-text-editor";
  root.innerHTML = `<span class="rich-text-label">${label}</span><div class="rich-text-toolbar" role="toolbar" aria-label="文字格式"><button type="button" data-command="bold" title="粗體"><b>B</b></button><button type="button" data-command="italic" title="斜體"><i>I</i></button><button type="button" data-command="underline" title="底線"><u>U</u></button><button type="button" data-command="formatBlock" data-value="p" title="段落">段</button><button type="button" data-command="formatBlock" data-value="h3" title="標題">標</button></div><div class="rich-text-content" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${placeholder}"></div>`;
  const content = root.querySelector(".rich-text-content");
  content.innerHTML = value;
  root.querySelector(".rich-text-toolbar").addEventListener("mousedown", event => event.preventDefault());
  root.querySelectorAll("button[data-command]").forEach(button => button.addEventListener("click", () => {
    content.focus();
    document.execCommand(button.dataset.command, false, button.dataset.value || null);
  }));
  return { element: root, getValue: () => content.innerHTML.trim(), setValue: nextValue => { content.innerHTML = nextValue || ""; }, focus: () => content.focus() };
}

export const richTextEditorStyles = `.rich-text-editor{display:grid;gap:8px}.rich-text-label{font-size:15px;font-weight:bold}.rich-text-toolbar{display:flex;flex-wrap:wrap;gap:7px}.rich-text-toolbar button{min-width:37px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);padding:7px 10px;font:inherit;cursor:pointer}.rich-text-toolbar button:hover{border-color:var(--blue);color:var(--blue)}.rich-text-content{min-height:220px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:14px;font:inherit;font-size:18px;line-height:1.65;outline:none}.rich-text-content:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgb(36 95 168 / .12)}.rich-text-content:empty:before{content:attr(data-placeholder);color:var(--muted);pointer-events:none}.rich-text-content h3{margin:.2em 0;font-size:1.25em}`;
