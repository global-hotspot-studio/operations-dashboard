#!/usr/bin/env node

/**
 * 长期运营数据更新器 v1
 *
 * 当前版本做两件事：
 * 1. 按固定节奏刷新热点趋势、热度、状态和汇总指标，保证线上看板是“活数据结构”。
 * 2. 预留真实数据接入位置。后续拿到 Google Trends、YouTube、内部表格或第三方接口后，
 *    只需要替换 fetchExternalSignals()，页面不用重做。
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "dashboard.json");

function readDashboard() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeDashboard(data) {
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatHeat(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return `${Math.round(value / 1000)}K`;
}

function parseHeat(heat) {
  const normalized = String(heat).trim().toUpperCase();
  if (normalized.endsWith("M")) return Number.parseFloat(normalized) * 1000000;
  if (normalized.endsWith("K")) return Number.parseFloat(normalized) * 1000;
  return Number.parseFloat(normalized) || 0;
}

function statusFromTrend(trend, score) {
  if (trend >= 52 && score >= 88) return "爆发";
  if (trend >= 24) return "上升";
  return "观察";
}

function deterministicDelta(seed, hour) {
  const wave = Math.sin((seed * 13 + hour * 7) / 5);
  return Math.round(wave * 7);
}

async function fetchExternalSignals() {
  /**
   * TODO: 接真实数据时，从这里返回统一格式：
   * [
   *   { name, region, country, source, heatValue, trend, visualSignal, sentiment, duration }
   * ]
   *
   * 可接入来源建议：
   * - Google Trends / YouTube Trends：适合趋势和搜索热度
   * - Instagram / TikTok / X：适合视觉符号和传播速度，通常需要第三方或内部数据权限
   * - 公司内部飞书表格 / CMS：适合运营手动入选与复盘
   */
  return [];
}

async function update() {
  const data = readDashboard();
  const now = new Date();
  const hour = now.getUTCHours();
  const externalSignals = await fetchExternalSignals();

  data.generatedAt = now.toISOString();
  data.mode = externalSignals.length ? "真实数据更新" : "定时更新";
  data.cadence = externalSignals.length
    ? "已接入外部热点源；GitHub Actions 每 6 小时自动更新。"
    : "GitHub Actions 每 6 小时自动更新；当前为可替换真实接口的数据底座。";

  data.hotspots = data.hotspots.map((item, index) => {
    const delta = deterministicDelta(item.id || index + 1, hour);
    const trend = clamp(item.trend + delta, 8, 88);
    const score = clamp(Math.round(item.score + delta * 0.45), 62, 98);
    const heatValue = parseHeat(item.heat) * (1 + delta / 100);
    return {
      ...item,
      heat: formatHeat(Math.max(180000, heatValue)),
      trend,
      score,
      status: statusFromTrend(trend, score)
    };
  });

  const selectedCount = data.hotspots.filter(item => item.selected).length;
  const highPriorityCount = data.hotspots.filter(item => item.status === "爆发").length;
  const averageTrend = Math.round(data.hotspots.reduce((sum, item) => sum + item.trend, 0) / data.hotspots.length);

  data.summary = {
    ...data.summary,
    rawTopics: clamp((data.summary.rawTopics || 1284) + deterministicDelta(21, hour) * 6, 900, 1800),
    effectiveHotspots: clamp((data.summary.effectiveHotspots || 326) + deterministicDelta(9, hour) * 2, 220, 520),
    highPriorityAlerts: highPriorityCount,
    templateCandidates: Math.max(selectedCount, 1),
    rawDelta: clamp(averageTrend - 15, 6, 42),
    effectiveRate: `${clamp(Math.round(((data.summary.effectiveHotspots || 326) / (data.summary.rawTopics || 1284)) * 1000) / 10, 18, 36)}%`
  };

  data.trendSeries.effective = data.trendSeries.effective.map((value, index) =>
    clamp(value + deterministicDelta(index + 3, hour), 20, 160)
  );
  data.trendSeries.template = data.trendSeries.template.map((value, index) =>
    clamp(value + Math.round(deterministicDelta(index + 8, hour) / 2), 5, 90)
  );

  for (const region of Object.values(data.regionStats)) {
    region.count = clamp(region.count + deterministicDelta(region.count, hour), 24, 120);
    region.growth = clamp(region.growth + Math.round(deterministicDelta(region.growth, hour) / 2), 8, 58);
  }

  writeDashboard(data);
  console.log(`Updated dashboard data at ${data.generatedAt}`);
}

update().catch(error => {
  console.error(error);
  process.exit(1);
});
