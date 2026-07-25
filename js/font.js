export const siteFont = 'PMingLiU, "新細明體", MingLiU, serif';

const style = document.createElement("style");
style.textContent = `html,body,button,input,textarea,select,[contenteditable="true"]{font-family:${siteFont}!important}`;
document.head.appendChild(style);
