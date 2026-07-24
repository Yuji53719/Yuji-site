import { chinaProvinceVisits } from "../data/travelData.js";
import { mapColors } from "../data/theme.js";
import { observeResize } from "../utils/browserCompatibility.js";

const mapSources = [new URL("../vendor/china.geo.json", import.meta.url).href, "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"];
const provinceAliases = { "北京市": "北京", "上海市": "上海", "天津市": "天津", "重庆市": "重慶", "香港特别行政区": "香港", "澳门特别行政区": "澳門", "新疆维吾尔自治区": "新疆", "内蒙古自治区": "內蒙古", "广西壮族自治区": "廣西", "宁夏回族自治区": "寧夏", "西藏自治区": "西藏", "河北省": "河北", "山西省": "山西", "辽宁省": "遼寧", "吉林省": "吉林", "黑龙江省": "黑龍江", "江苏省": "江蘇", "浙江省": "浙江", "安徽省": "安徽", "福建省": "福建", "江西省": "江西", "山东省": "山東", "河南省": "河南", "湖北省": "湖北", "湖南省": "湖南", "广东省": "廣東", "海南省": "海南", "四川省": "四川", "贵州省": "貴州", "云南省": "雲南", "陕西省": "陝西", "甘肃省": "甘肅", "青海省": "青海", "台湾省": "臺灣" };
async function loadChinaGeoJson() {
  for (const source of mapSources) {
    try { const response = await fetch(source); if (response.ok) return response.json(); } catch (_) { /* 嘗試下一個來源 */ }
  }
  throw new Error("地圖資料載入失敗");
}

export async function createChinaMap(element) {
  const geoJson = window.__chinaGeoJson || await loadChinaGeoJson();
  geoJson.features.forEach(feature => { const mappedName = provinceAliases[feature.properties.name] || feature.properties.name; feature.properties.name = mappedName; });
  echarts.registerMap("china", geoJson);
  const chart = echarts.init(element, null, { renderer: "svg" });
  const entries = Object.entries(chinaProvinceVisits).map(([name, value]) => ({ name, value: value === "base" ? 0 : value, itemStyle: value === "base" ? { areaColor: mapColors.base } : undefined, isBase: value === "base" }));
  const maxVisits = Math.max(1, ...entries.filter(({ isBase }) => !isBase).map(({ value }) => value));
  chart.setOption({ tooltip: { trigger: "item", formatter: ({ name, data, value }) => `<b>${name}</b><br>${data && data.isBase ? "北京" : `造訪：${value || 0} 次`}` }, visualMap: { min: 0, max: maxVisits, show: false, inRange: { color: mapColors.gradient } }, series: [{ type: "map", map: "china", roam: true, zoom: .94, scaleLimit: { min: .82 }, boundingCoords: [[73, 54], [135, 18]], layoutCenter: ["50%", "51%"], layoutSize: "92%", label: { show: false }, itemStyle: { areaColor: mapColors.default, borderColor: mapColors.border, borderWidth: 1 }, emphasis: { label: { show: true, color: mapColors.label, fontFamily: "PMingLiU" }, itemStyle: { areaColor: mapColors.hover } }, data: entries }] });
  observeResize(element, () => chart.resize()); return chart;
}
