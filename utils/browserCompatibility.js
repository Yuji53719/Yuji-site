export function observeResize(element, callback) {
  if (window.ResizeObserver) { new ResizeObserver(callback).observe(element); return; }
  window.addEventListener("resize", callback);
}

export function supportsDialog() {
  return typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function";
}

export function createIdentifier() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `thought-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
