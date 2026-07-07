#!/usr/bin/env node

/**
 * 长期运营数据更新器 v1
 *
 * 当前版本做两件事：
 * 1. 按固定节奏刷新热点趋势、热度、状态和汇总指标，保证线上看板是“活数据结构”。
 * 2. 已支持 YouTube Data API。配置 YOUTUBE_API_KEY 后，会按重点国家抓取 YouTube 热门视频，
 *    并映射成看板里的热点信号。
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "dashboard.json");
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const youtubeMarkets = [
  { code: "IN", country: "印度", region: "印度" },
  { code: "ID", country: "印度尼西亚", region: "印度尼西亚" },
  { code: "BR", country: "巴西", region: "南美洲" },
  { code: "AR", country: "阿根廷", region: "南美洲" },
  { code: "CO", country: "哥伦比亚", region: "南美洲" },
  { code: "CL", country: "智利", region: "南美洲" },
  { code: "PE", country: "秘鲁", region: "南美洲" },
  { code: "NG", country: "尼日利亚", region: "撒哈拉以南非洲" },
  { code: "ZA", country: "南非", region: "撒哈拉以南非洲" },
  { code: "KE", country: "肯尼亚", region: "撒哈拉以南非洲" },
  { code: "GH", country: "加纳", region: "撒哈拉以南非洲" },
  { code: "RU", country: "俄罗斯", region: "俄罗斯（东欧）" }
];

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

function scoreFromVideo(video, rank) {
  const stats = video.statistics || {};
  const views = Number(stats.viewCount || 0);
  const likes = Number(stats.likeCount || 0);
  const comments = Number(stats.commentCount || 0);
  const engagement = views ? (likes + comments * 3) / views : 0;
  const viewScore = Math.min(34, Math.log10(Math.max(views, 1)) * 5);
  const engageScore = Math.min(18, engagement * 900);
  const rankScore = Math.max(0, 18 - rank * 2);
  return clamp(Math.round(46 + viewScore + engageScore + rankScore), 62, 98);
}

function trendFromVideo(video, rank) {
  const stats = video.statistics || {};
  const views = Number(stats.viewCount || 0);
  const comments = Number(stats.commentCount || 0);
  const velocity = Math.log10(Math.max(views + comments * 10, 1)) * 8;
  return clamp(Math.round(velocity + Math.max(0, 16 - rank * 2)), 12, 88);
}

function visualSignalFromTitle(title = "") {
  const lower = title.toLowerCase();
  if (/music|song|mv|official video|dance|concert|festival|live|remix/i.test(lower)) return "音乐 / 舞台 / 人物";
  if (/football|soccer|cricket|match|final|cup|nba|game|goal|highlights/i.test(lower)) return "赛事 / 应援 / 国家色";
  if (/movie|trailer|film|episode|drama|series/i.test(lower)) return "影视 / 角色 / 海报感";
  if (/fashion|makeup|beauty|style|outfit/i.test(lower)) return "穿搭 / 妆造 / 人像";
  if (/travel|street|city|food|vlog/i.test(lower)) return "城市 / 生活方式";
  return "人物 / 场景 / 热点符号";
}

function promptFromVideo(video, market) {
  const title = video.snippet?.title || "热门视频";
  const visual = visualSignalFromTitle(title);
  return `基于 YouTube ${market.country} 热门内容《${title}》提取视觉方向：${visual}。生成 9:16 手机锁屏主题壁纸，保留当地文化情绪和色彩符号，画面高级、干净、可商业化，顶部留出时钟区域，无文字、无品牌标识、避免直接使用真人明星或版权角色。`;
}

async function fetchYoutubeMostPopularForMarket(market) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", market.code);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", youtubeApiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube ${market.code} 请求失败：${response.status} ${body.slice(0, 180)}`);
  }
  const json = await response.json();
  return (json.items || []).map((video, rank) => {
    const score = scoreFromVideo(video, rank);
    const trend = trendFromVideo(video, rank);
    const title = video.snippet?.title || "YouTube 热门视频";
    const views = Number(video.statistics?.viewCount || 0);
    return {
      id: `yt-${market.code}-${video.id}`,
      name: title.length > 22 ? `${title.slice(0, 22)}…` : title,
      originalTitle: title,
      region: market.region,
      country: market.country,
      source: ["YouTube"],
      heat: formatHeat(views),
      trend,
      score,
      status: statusFromTrend(trend, score),
      type: "realtime",
      selected: score >= 88,
      preview: "",
      previewTitle: "",
      previewMeta: "",
      prompt: promptFromVideo(video, market),
      reason: `来自 YouTube ${market.country} 热门榜，播放量 ${formatHeat(views)}。视觉判断：${visualSignalFromTitle(title)}；适合先进入候选池，由设计师二次判断是否转主题模板。`,
      youtube: {
        videoId: video.id,
        channelTitle: video.snippet?.channelTitle || "",
        publishedAt: video.snippet?.publishedAt || "",
        thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || "",
        url: `https://www.youtube.com/watch?v=${video.id}`
      }
    };
  });
}

async function fetchYoutubeSignals() {
  if (!youtubeApiKey) {
    console.log("YOUTUBE_API_KEY 未配置，跳过 YouTube 真实热点抓取。");
    return [];
  }

  const batches = [];
  for (const market of youtubeMarkets) {
    try {
      const rows = await fetchYoutubeMostPopularForMarket(market);
      batches.push(...rows);
    } catch (error) {
      console.warn(error.message);
    }
  }

  return batches
    .sort((a, b) => b.score - a.score || b.trend - a.trend)
    .slice(0, 16);
}

async function fetchExternalSignals() {
  /**
   * 可继续扩展更多真实数据源，统一返回格式：
   * [
   *   { name, region, country, source, heat, trend, score, status, type, selected, prompt, reason }
   * ]
   *
   * 可接入来源建议：
   * - YouTube Data API：已接入，配置 YOUTUBE_API_KEY 即可启用。
   * - Google Trends：适合趋势和搜索热度
   * - Instagram / TikTok / X：适合视觉符号和传播速度，通常需要第三方或内部数据权限
   * - 公司内部飞书表格 / CMS：适合运营手动入选与复盘
   */
  const youtubeSignals = await fetchYoutubeSignals();
  return [...youtubeSignals];
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

  if (externalSignals.length) {
    const selectedPreviewHotspots = data.hotspots.filter(item => item.selected && item.preview);
    const merged = [...externalSignals, ...selectedPreviewHotspots]
      .filter((item, index, array) => array.findIndex(candidate => candidate.id === item.id || candidate.name === item.name) === index)
      .sort((a, b) => b.score - a.score || b.trend - a.trend)
      .slice(0, 24)
      .map((item, index) => ({ ...item, id: typeof item.id === "number" ? item.id : 1000 + index }));
    data.hotspots = merged;
  }

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
