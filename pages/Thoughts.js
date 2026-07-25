import "../js/font.js";
import { thoughts as authoredThoughts } from "../data/thoughtData.js";
import { thoughtCard } from "../components/ThoughtCard.js";
import { deleteThought, fetchThoughts } from "../js/cloudData.js";
import { addAdminControls, getAuthState } from "../js/auth.js";

const userThoughts = () => { try { return JSON.parse(localStorage.getItem("jiayu-user-thoughts") || "[]"); } catch (_) { return []; } };

async function render() {
  const remote = await fetchThoughts();
  const thoughts = [...(remote || []), ...userThoughts(), ...authoredThoughts]
    .sort((first, second) => String(second.createdAt || second.publishedAt).localeCompare(String(first.createdAt || first.publishedAt)));
  document.getElementById("thought-list").innerHTML = thoughts.map(thoughtCard).join("");
}

async function setupActions() {
  const { user } = await getAuthState();
  if (!user) return;
  document.getElementById("upload-thought-link")?.classList.add("is-admin");
  document.querySelectorAll(".thought[data-cloud=\"true\"]").forEach(card => {
    const button = card.querySelector(".delete-thought");
    if (!button || (user.role !== "admin" && card.dataset.owner !== user.username)) return;
    button.hidden = false;
    button.addEventListener("click", async () => {
      if (!window.confirm("確定要刪除這則隨想嗎？")) return;
      try { await deleteThought(card.dataset.id); card.remove(); } catch (error) { window.alert(error.message); }
    });
  });
}

render().then(setupActions);
addAdminControls();
