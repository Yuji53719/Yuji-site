import "../js/font.js";
import { thoughts as authoredThoughts } from "../data/thoughtData.js";
import { thoughtCard } from "../components/ThoughtCard.js";
import { fetchThoughts } from "../js/cloudData.js";

const userThoughts = () => { try { return JSON.parse(localStorage.getItem("jiayu-user-thoughts") || "[]"); } catch (_) { return []; } };

async function render() {
  const remote = await fetchThoughts();
  const thoughts = [...(remote || []), ...userThoughts(), ...authoredThoughts]
    .sort((first, second) => String(second.createdAt || second.publishedAt).localeCompare(String(first.createdAt || first.publishedAt)));
  document.getElementById("thought-list").innerHTML = thoughts.map(thoughtCard).join("");
}

render();
