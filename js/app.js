import { createChinaMap } from "../components/ChinaMap.js";

if (window.echarts) {
  createChinaMap(document.getElementById("china-map")).catch(() => {
    document.getElementById("china-map").textContent = "地圖暫時無法載入，請稍後再試。";
  });
}
