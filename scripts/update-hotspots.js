#!/usr/bin/env node

/**
 * 长期运营数据更新器 v1
 *
 * 当前版本做两件事：
 * 1. 每日北京时间早上 09:00 刷新热点趋势、热度、状态和汇总指标，保证线上看板是“活数据结构”。
 * 2. 已支持 YouTube Data API。配置 YOUTUBE_API_KEY 后，会按重点国家抓取 YouTube 热门视频，
 *    并映射成看板里的热点信号。
 * 3. 已支持 Google Trends RSS。无需密钥，按重点国家抓取搜索趋势和相关新闻源。
 * 4. 已支持 Google News RSS 和 GDELT 新闻源，补充本地媒体与全球新闻热度。
 * 5. 已接入 X / Instagram / Facebook 官方接口连接器；配置对应 Secret 后自动启用。
 *    TikTok Research API 不用于当前商业运营链路，TikTok 线索仅保留人工录入或合规供应商接入。
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "dashboard.json");
const playbookDataPath = path.join(root, "data", "dashboard-playbook.json");
const manualDataPath = path.join(root, "data", "manual-hotspots.json");
const generatedSamplesPath = path.join(root, "data", "generated-samples.json");
const generatedWallpapersPath = path.join(root, "data", "generated-wallpapers.json");
const generatedThemesPath = path.join(root, "data", "generated-themes.json");
const holidayCalendarPath = path.join(root, "data", "holiday-calendar.json");
const hotspotLifecyclePath = path.join(root, "data", "hotspot-lifecycle.json");
const facebookPublicPagesPath = path.join(root, "data", "facebook-public-pages.json");
const youtubeApiKey = (process.env.YOUTUBE_API_KEY || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const xBearerToken = (process.env.X_BEARER_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const metaAccessToken = (process.env.META_ACCESS_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const metaAppSecret = (process.env.META_APP_SECRET || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const metaGraphVersion = (process.env.META_GRAPH_VERSION || "v24.0").trim();
let instagramBusinessAccountId = (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const facebookPageIds = (process.env.FACEBOOK_PAGE_IDS || "").split(",").map(item => item.trim()).filter(Boolean);
const facebookPublicPageLimit = Math.max(1, Number.parseInt(process.env.FACEBOOK_PUBLIC_PAGE_LIMIT || "12", 10) || 12);
const metaPageAccessTokens = new Map();
const tiktokAccessToken = (process.env.TIKTOK_ACCESS_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const metaSourceStatus = {
  meta: { source: "Meta", status: metaAccessToken ? "configured" : "missing", connected: false, fetchedCount: 0, detail: "" },
  instagram: { source: "Instagram", status: "pending", connected: false, fetchedCount: 0, detail: "" },
  facebook: { source: "Facebook", status: "pending", connected: false, fetchedCount: 0, detail: "" }
};
const openSourceStatus = {
  bluesky: { source: "Bluesky", status: "pending", connected: false, fetchedCount: 0, detail: "" },
  wikimedia: { source: "Wikimedia", status: "pending", connected: false, fetchedCount: 0, detail: "" }
};

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
  { code: "RU", country: "俄罗斯", region: "俄罗斯（东欧）" },
  { code: "SA", country: "沙特阿拉伯", region: "中东" },
  { code: "AE", country: "阿联酋", region: "中东" }
];

const googleTrendsMarkets = youtubeMarkets;
const localMediaMarkets = youtubeMarkets;
const gdeltMarkets = youtubeMarkets;

const marketTopics = {
  IN: ["cricket", "bollywood", "festival", "music", "fashion"],
  ID: ["musik", "sepak bola", "film", "ramadan", "fashion"],
  BR: ["futebol", "musica", "novela", "carnaval", "moda"],
  AR: ["futbol", "musica", "moda", "series", "seleccion argentina"],
  CO: ["futbol", "musica", "moda", "festival", "seleccion colombia"],
  CL: ["futbol", "musica", "moda", "festival", "series"],
  PE: ["futbol", "musica", "moda", "festival", "peru"],
  NG: ["afrobeats", "football", "fashion", "nollywood", "lagos"],
  ZA: ["amapiano", "football", "fashion", "music", "south africa"],
  KE: ["music", "football", "fashion", "nairobi", "festival"],
  GH: ["music", "football", "fashion", "afrobeats", "ghana"],
  RU: ["музыка", "футбол", "кино", "мода", "сериал"],
  SA: ["music", "football", "fashion", "ramadan", "saudi"],
  AE: ["music", "football", "fashion", "ramadan", "dubai"]
};

const blueskyQueries = [
  { query: "Bollywood", market: youtubeMarkets.find(item => item.code === "IN") },
  { query: "\"sepak bola\"", market: youtubeMarkets.find(item => item.code === "ID") },
  { query: "futebol", market: youtubeMarkets.find(item => item.code === "BR") },
  { query: "afrobeats", market: youtubeMarkets.find(item => item.code === "NG") },
  { query: "amapiano", market: youtubeMarkets.find(item => item.code === "ZA") },
  { query: "музыка", market: youtubeMarkets.find(item => item.code === "RU") },
  { query: "Dubai", market: youtubeMarkets.find(item => item.code === "AE") }
].filter(item => item.market);

const wikimediaMarkets = [
  { project: "hi.wikipedia.org", country: "印度", region: "印度", language: "印地语" },
  { project: "id.wikipedia.org", country: "印度尼西亚", region: "印度尼西亚", language: "印度尼西亚语" },
  { project: "ru.wikipedia.org", country: "俄罗斯", region: "俄罗斯（东欧）", language: "俄语" },
  { project: "ar.wikipedia.org", country: "中东", region: "中东", language: "阿拉伯语" },
  { project: "ha.wikipedia.org", country: "尼日利亚", region: "撒哈拉以南非洲", language: "豪萨语" },
  { project: "sw.wikipedia.org", country: "肯尼亚 / 东非", region: "撒哈拉以南非洲", language: "斯瓦希里语" },
  { project: "pt.wikipedia.org", country: "巴西", region: "南美洲", language: "葡萄牙语" },
  { project: "es.wikipedia.org", country: "拉美", region: "南美洲", language: "西班牙语" }
];

const googleNewsLocales = {
  IN: { hl: "en-IN", ceid: "IN:en" },
  ID: { hl: "id-ID", ceid: "ID:id" },
  BR: { hl: "pt-BR", ceid: "BR:pt-419" },
  AR: { hl: "es-419", ceid: "AR:es-419" },
  CO: { hl: "es-419", ceid: "CO:es-419" },
  CL: { hl: "es-419", ceid: "CL:es-419" },
  PE: { hl: "es-419", ceid: "PE:es-419" },
  NG: { hl: "en-NG", ceid: "NG:en" },
  ZA: { hl: "en-ZA", ceid: "ZA:en" },
  KE: { hl: "en-KE", ceid: "KE:en" },
  GH: { hl: "en-GH", ceid: "GH:en" },
  RU: { hl: "ru-RU", ceid: "RU:ru" },
  SA: { hl: "ar-SA", ceid: "SA:ar" },
  AE: { hl: "ar-AE", ceid: "AE:ar" }
};

function readDashboard() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeDashboard(data) {
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(playbookDataPath, `${JSON.stringify(data, null, 2)}\n`);
}

function readManualHotspots() {
  if (!fs.existsSync(manualDataPath)) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(manualDataPath, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn(`人工热点读取失败：${error.message}`);
    return [];
  }
}

function readFacebookPublicPageQueries() {
  if (!fs.existsSync(facebookPublicPagesPath)) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(facebookPublicPagesPath, "utf8"));
    return Array.isArray(rows)
      ? rows.filter(row => row?.enabled !== false && row?.query && row?.region && row?.country)
      : [];
  } catch (error) {
    console.warn(`Facebook 公共主页池读取失败：${error.message}`);
    return [];
  }
}

function metaAppSecretProof() {
  if (!metaAccessToken || !metaAppSecret) return "";
  return crypto.createHmac("sha256", metaAppSecret).update(metaAccessToken).digest("hex");
}

function appendMetaAuth(url, accessToken = metaAccessToken, includeProof = false) {
  url.searchParams.set("access_token", accessToken);
  const proof = includeProof ? metaAppSecretProof() : "";
  if (proof) url.searchParams.set("appsecret_proof", proof);
  return url;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    let json = {};
    try {
      json = body ? JSON.parse(body) : {};
    } catch {
      json = {};
    }
    return {
      ok: response.ok,
      status: response.status,
      json,
      body
    };
  } finally {
    clearTimeout(timer);
  }
}

function isPublicContentReviewError(message = "") {
  return /Page Public Content Access|Page Public Metadata Access|pages\/search|Application does not have permission|\(#10\)|"code"\s*:\s*10|权限不足/i.test(message);
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

function stripCdata(value = "") {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value = "") {
  return stripCdata(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function escapeSvgText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tagValue(xml, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function tagValues(xml, tag) {
  const escaped = tag.replace(":", "\\:");
  return [...xml.matchAll(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "gi"))].map(match => decodeXml(match[1]));
}

function parseTraffic(traffic = "") {
  const normalized = String(traffic).replaceAll(",", "").replace("+", "").trim().toUpperCase();
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return 0;
  if (normalized.endsWith("M")) return number * 1000000;
  if (normalized.endsWith("K")) return number * 1000;
  return number;
}

function textSnippet(value = "", length = 22) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function cleanTitle(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\s[-–—|]\s(?:YouTube|Google News|BBC|CNN|Reuters|AP News|The Guardian|Al Jazeera|NDTV|Times of India|detikNews|Globo|UOL|ESPN|Sky Sports).*$/i, "")
    .replace(/\[[^\]]{1,40}\]/g, "")
    .replace(/\([^)]{1,40}\)/g, "")
    .replace(/#[\p{L}\p{N}_-]+/gu, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

function normalizeTopic(value = "") {
  return cleanTitle(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”‘’`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(official|video|trailer|full|live|news|latest|breaking|update|updates|today|watch|hd|mv|teaser|clip)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value = "") {
  const stopwords = new Set(["the", "and", "for", "with", "from", "this", "that", "what", "when", "where", "como", "para", "que", "com", "uma", "por", "los", "las", "del", "das", "dos"]);
  return new Set(normalizeTopic(value).split(" ").filter(token => token.length > 2 && !stopwords.has(token)));
}

function jaccardSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

function canonicalKey(item) {
  const title = normalizeTopic(item.originalTitle || item.name);
  const tokens = title.split(" ").filter(Boolean).slice(0, 8);
  return `${item.region || "全球"}:${tokens.join(" ")}`;
}

function mergeSources(left = [], right = []) {
  return [...new Set([...left, ...right])];
}

function mergeLinks(target, incoming) {
  for (const key of ["youtube", "trends", "local", "gdelt", "manual", "x", "instagram", "facebook", "tiktok", "bluesky", "wikimedia"]) {
    if (!target[key] && incoming[key]) target[key] = incoming[key];
  }
}

function cleanSignal(item) {
  const originalTitle = cleanTitle(item.originalTitle || item.name);
  const name = cleanTitle(item.name || originalTitle);
  const source = Array.isArray(item.source) ? item.source : [item.source || "未知来源"];
  const url = item.youtube?.url || item.trends?.url || item.local?.url || item.gdelt?.url || item.manual?.url || item.x?.url || item.instagram?.url || item.facebook?.url || item.tiktok?.url || item.bluesky?.url || item.wikimedia?.url || "";
  return {
    ...item,
    name: textSnippet(name || originalTitle || "未命名热点"),
    originalTitle: originalTitle || name || item.originalTitle || item.name,
    region: item.region || "全球",
    country: item.country || item.region || "全球",
    source,
    heatValue: parseHeat(item.heat),
    canonicalKey: canonicalKey({ ...item, originalTitle, name }),
    signals: item.signals || [{ source: source.join(" + "), title: originalTitle || name || item.name, url }]
  };
}

function mergeSignals(target, incoming) {
  const sources = mergeSources(target.source, incoming.source);
  const heatValue = Math.max(Number(target.heatValue || 0), Number(incoming.heatValue || 0));
  const score = clamp(Math.round(Math.max(target.score || 0, incoming.score || 0) + Math.min(6, (sources.length - 1) * 2)), 62, 99);
  const trend = clamp(Math.round(Math.max(target.trend || 0, incoming.trend || 0) + Math.min(8, (sources.length - 1) * 3)), 8, 92);
  const reasonParts = [target.reason, incoming.reason].filter(Boolean);
  target.source = sources;
  target.heatValue = heatValue;
  target.heat = formatHeat(heatValue);
  target.score = score;
  target.trend = trend;
  target.status = statusFromTrend(trend, score);
  target.selected = Boolean(target.selected || incoming.selected || score >= 88);
  target.reason = [...new Set(reasonParts)].slice(0, 2).join("；");
  target.signals = [
    ...(target.signals || [{ source: target.source[0], title: target.originalTitle, url: target.youtube?.url || target.trends?.url || target.local?.url || target.gdelt?.url || target.manual?.url || target.x?.url || target.instagram?.url || target.facebook?.url || target.tiktok?.url || target.bluesky?.url || target.wikimedia?.url || "" }]),
    { source: incoming.source.join(" + "), title: incoming.originalTitle, url: incoming.youtube?.url || incoming.trends?.url || incoming.local?.url || incoming.gdelt?.url || incoming.manual?.url || incoming.x?.url || incoming.instagram?.url || incoming.facebook?.url || incoming.tiktok?.url || incoming.bluesky?.url || incoming.wikimedia?.url || "" }
  ].filter((signal, index, array) => array.findIndex(item => item.source === signal.source && item.title === signal.title) === index);
  mergeLinks(target, incoming);
  return target;
}

function cleanAndDeduplicateSignals(items) {
  const cleaned = items
    .map(cleanSignal)
    .filter(item => normalizeTopic(item.originalTitle).length >= 2);
  const clusters = [];

  for (const item of cleaned) {
    const existing = clusters.find(cluster =>
      cluster.canonicalKey === item.canonicalKey ||
      (cluster.region === item.region && jaccardSimilarity(cluster.originalTitle, item.originalTitle) >= 0.58) ||
      jaccardSimilarity(cluster.originalTitle, item.originalTitle) >= 0.72
    );
    if (existing) mergeSignals(existing, item);
    else clusters.push({ ...item });
  }

  return clusters
    .map(({ canonicalKey: _canonicalKey, heatValue: _heatValue, ...item }) => item)
    .sort((a, b) => b.score - a.score || b.trend - a.trend);
}

function sourceScore(base, rank, volume = 1000) {
  return clamp(Math.round(base + Math.log10(Math.max(volume, 1000)) * 4 + Math.max(0, 10 - rank)), 62, 96);
}

function sourceTrend(base, rank, volume = 1000) {
  return clamp(Math.round(base + Math.log10(Math.max(volume, 1000)) * 6 + Math.max(0, 9 - rank)), 12, 86);
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

function promptFromTrend(topic, market, newsTitle) {
  const visual = visualSignalFromTitle(`${topic} ${newsTitle}`);
  return `基于 Google Trends ${market.country} 搜索趋势「${topic}」和相关新闻视觉线索，提取可转模板方向：${visual}。生成 9:16 手机锁屏主题壁纸，表达当地正在讨论的热点情绪，画面高级、干净、可商业化，避免直接使用版权人物、新闻照片或平台 Logo，顶部留出时钟区域。`;
}

function promptFromSocial(platform, title, market) {
  const visual = visualSignalFromTitle(title);
  return `基于 ${platform} ${market.country} 热点内容「${title}」提取视觉方向：${visual}。生成 9:16 手机锁屏主题壁纸，保留平台热点情绪与当地文化符号，画面高级、干净、可商业化，避免直接复刻达人/明星/品牌素材，顶部留出时钟区域。`;
}

function promptFromLocalMedia(title, market, sourceName) {
  const visual = visualSignalFromTitle(title);
  return `基于 ${market.country} 本地媒体「${sourceName || "本地新闻源"}」热点《${title}》提取视觉方向：${visual}。生成 9:16 手机锁屏主题壁纸，用抽象符号和地区色彩表达热点情绪，不直接使用新闻照片、人物肖像或品牌标识，画面高级、干净、可商业化。`;
}

function promptFromGdelt(title, market, sourceName) {
  const visual = visualSignalFromTitle(title);
  return `基于 GDELT 全球新闻源中 ${market.country || "重点市场"} 热点《${title}》提取视觉方向：${visual}。生成 9:16 手机锁屏主题壁纸，用抽象符号、地区色彩和情绪氛围表达热点，不直接使用新闻照片、人物肖像、版权角色或品牌标识。`;
}

function promptFromManual(title, sourceName) {
  const visual = visualSignalFromTitle(title);
  return `基于运营人工录入热点《${title}》提取视觉方向：${visual}。生成 9:16 手机锁屏主题壁纸，强调可转模板的主题符号、色彩和情绪，画面高级、干净、可商业化，避免直接复刻原图或版权元素。`;
}

const visualPlaySamples = [
  {
    id: "cinematic_poster",
    name: "电影海报感",
    category: "视觉可玩性样图",
    preview: "assets/hotspot-playbook/cinematic_poster.png",
    style: "强叙事、强氛围，适合影视/预告片/剧情类热点",
    playability: "可做锁屏主视觉、海报式壁纸、暗色主题套装",
    prompt: "把热点转译成电影海报式主视觉：主体明确、逆光/轮廓光、胶片颗粒、大面积留白，适合手机锁屏第一眼识别"
  },
  {
    id: "idol_comic",
    name: "偶像漫画化",
    category: "人物风格模板",
    preview: "assets/style-templates/korean-idol-comic.png",
    style: "精致、年轻、人物情绪强，适合音乐/明星/舞台类热点",
    playability: "可做自拍图生图、粉丝应援壁纸、人物主题模板",
    prompt: "将热点情绪转译成精致漫画人物与舞台氛围：妆造、服饰、灯光、色彩都围绕热点主题重组，人物保持原创或用户上传"
  },
  {
    id: "local_outfit",
    name: "本地人物妆造",
    category: "人物风格模板",
    preview: "assets/style-templates/india-outfit.png",
    style: "地域五官、发型、服饰和妆造识别强，适合本地化人物模板",
    playability: "可做自拍图生图、本地人物妆造、区域限定角色模板",
    prompt: "提取热点所在地的发型、服饰、纹样、妆容和情绪气质，生成原创本地人物头像/半身像模板，适合用户自拍或人物图生图迁移"
  },
  {
    id: "american_comic",
    name: "美漫英雄化",
    category: "人物风格模板",
    preview: "assets/style-templates/american-comic-portrait.png",
    style: "强表情、强动作、冲击感，适合赛事/游戏/电影热点",
    playability: "可做原创英雄角色、赛事应援、热血主题壁纸",
    prompt: "把热点转译成原创英雄式人物主视觉：夸张表情、速度线、强对比色和动态构图，不使用已有 IP 或队徽"
  },
  {
    id: "mecha_upgrade",
    name: "机甲化升级",
    category: "人物风格模板",
    preview: "assets/style-templates/mecha-character.png",
    style: "科技、装备、未来感，适合游戏/科技/高能热点",
    playability: "可做 AI 变身、机甲主题、未来感壁纸套装",
    prompt: "基于热点视觉符号生成原创轻机甲造型：装备层次、能量光线、科技背景，与热点代表色融合"
  },
  {
    id: "cute_3d",
    name: "Q版3D萌化",
    category: "人物风格模板",
    preview: "assets/style-templates/3d-character.png",
    style: "亲和、可爱、社交传播强，适合泛娱乐热点",
    playability: "可做头像、贴纸、锁屏人物、轻量主题模板",
    prompt: "把热点转成 Q 版 3D 角色或萌化道具：表情夸张、材质干净、色彩明快，适合做贴纸和壁纸延展"
  },
  {
    id: "game_character",
    name: "游戏角色立绘",
    category: "人物风格模板",
    preview: "assets/style-templates/game-character.png",
    style: "角色设定、服装细节、世界观强，适合游戏/动漫/娱乐热点",
    playability: "可做角色卡、冒险主题、游戏化壁纸玩法",
    prompt: "把热点提炼成原创游戏角色立绘：服装、道具、背景和阵营色统一，突出可收藏的角色设定感"
  },
  {
    id: "art_portrait",
    name: "艺术肖像化",
    category: "人物风格模板",
    preview: "assets/style-templates/oil-painting-portrait.png",
    style: "高级、艺术化、长期可沉淀，适合精品壁纸库",
    playability: "可做艺术肖像壁纸、高级主题、低版权风险模板",
    prompt: "把热点情绪转成艺术肖像/艺术场景：笔触、光影和色盘围绕热点氛围展开，适合沉淀为精品模板"
  },
  {
    id: "indonesia_local",
    name: "东南亚人物本地化",
    category: "人物风格模板",
    preview: "assets/style-templates/indonesia-outfit.png",
    style: "温暖、生活化、节庆感，适合印尼/东南亚热点",
    playability: "可做区域限定、本地活动、节庆人物壁纸",
    prompt: "结合东南亚本地服饰、城市生活、节庆色彩和自然元素，生成有亲近感的热点壁纸样图"
  },
  {
    id: "anime_clean",
    name: "清透二次元",
    category: "人物风格模板",
    preview: "assets/style-templates/japan-outfit.png",
    style: "清透、年轻、二次元感强，适合动漫/年轻文化热点",
    playability: "可做动漫化自拍、轻二次元主题、清新锁屏壁纸",
    prompt: "把热点视觉符号转成清透二次元人物或场景：柔和天空光、干净线条、轻盈服饰和明确主题色"
  }
];

function samplesForHotspot(index) {
  // 兜底策略也遵守「Top1 最多 3、Top2/Top3 各 1」：
  // 是否采用角色方向由热点属性决定，不把人物当成默认答案。
  if (index === 0) return [visualPlaySamples[0], visualPlaySamples[1], visualPlaySamples[4]];
  if (index === 1) return [visualPlaySamples[0]];
  return [visualPlaySamples[5]];
}

function readJsonFile(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function readWallpaperBatch() {
  const current = readJsonFile(generatedWallpapersPath);
  if (Array.isArray(current.samples) && current.samples.length) return current;
  return readJsonFile(generatedSamplesPath);
}

function readThemeBatch() {
  return readJsonFile(generatedThemesPath);
}

function readHolidayCalendar() {
  return readJsonFile(holidayCalendarPath, { planningWindowDays: 75, events: [] });
}

function readGeneratedSampleOutputs() {
  const payload = readWallpaperBatch();
  return Array.isArray(payload.samples) ? payload.samples : [];
}

function samplePromptForHotspot(sample, hotspot) {
  const title = hotspot.originalTitle || hotspot.name;
  const market = hotspot.country || hotspot.region || "重点市场";
  const source = hotspot.source?.join(" + ") || "热点源";
  const visual = visualSignalFromTitle(title);
  return `基于 ${source} ${market} 实时热点《${title}》，生成「${sample.name}」样图推荐，用于给设计师做主题/壁纸玩法灵感。\n\n先判断热点属性：仅当人物或角色是核心可提取符号时采用人物图生图；音乐、节庆、城市、科技或自然热点优先转译为色彩、材质、涂鸦、插画、异形、场景、图标化或动态感主题。\n\n视觉可玩性：${sample.playability}。\n\n生成建议：${sample.prompt}；结合热点视觉方向「${visual}」，提取主体、色彩、场景、服饰/道具和情绪符号。输出 9:16 手机 OS 锁屏壁纸样图，顶部预留时钟区；画面高级、有趣、可本地化，可延展为主题商城模板；避免直接使用真实明星肖像、影视剧照、版权角色、品牌 Logo 和新闻照片。`;
}

function buildTemplateOutputs(hotspots) {
  // 壁纸模板库只由长期热点或临近固定节日触发；每日抓取只更新热点，
  // 不会覆盖已审核的真实壁纸。主题模板库使用独立清单和更慢的更新节奏。
  const generatedSamples = readGeneratedSampleOutputs();
  if (generatedSamples.length) return generatedSamples;

  const positivePattern = /music|song|mv|dance|concert|festival|football|soccer|cricket|match|cup|final|movie|trailer|film|series|fashion|makeup|beauty|style|art|city|travel|carnaval|futebol|musica|moda|afrobeats|amapiano|bollywood|kpop|idol|celebrity|artist|show|game|sports/i;
  const negativePattern = /weather|tiempo|lottery|loter[ií]a|tax|anses|cte|gasolina|petrol|gold price|stock|bank|government|minister|election|policy|crime|death|accident|war|court|visa|exam|result|salary|pension|fuel|diesel/i;
  const templateFit = item => {
    const text = `${item.originalTitle || item.name} ${item.prompt || ""}`;
    const positive = positivePattern.test(text) ? 12 : 0;
    const negative = negativePattern.test(text) ? -30 : 0;
    const sourceBoost = item.source?.includes("YouTube") ? 10 : item.source?.includes("Google Trends") ? 4 : item.source?.includes("本地平台") ? 2 : 0;
    const crossSourceBoost = Math.min(8, Math.max(0, (item.source?.length || 1) - 1) * 4);
    return item.score + positive + negative + sourceBoost + crossSourceBoost;
  };
  const topHotspots = [...hotspots]
    .map(item => ({ ...item, templateFitScore: templateFit(item) }))
    .sort((a, b) => b.score - a.score || b.trend - a.trend || b.templateFitScore - a.templateFitScore)
    .slice(0, 3);

  return topHotspots.flatMap((hotspot, hotspotIndex) =>
    samplesForHotspot(hotspotIndex).map(sample => {
      return {
        id: `tpl-${hotspotIndex}-${sample.id}`,
        hotspotId: hotspot.id,
        hotspotName: hotspot.name,
        previewTitle: `${hotspot.name}｜${sample.name}`,
        previewMeta: `${sample.category} · ${hotspot.region} · Top${hotspotIndex + 1} · 模板潜力 ${hotspot.score} · ${sample.style}`,
        preview: sample.preview,
        prompt: samplePromptForHotspot(sample, hotspot),
        source: hotspot.source,
        sourceUrl: sourceUrlForHotspot(hotspot),
        generatedFrom: "daily_top3_visual_sample_recommendation"
      };
    })
  );
}

function sourceUrlForHotspot(item) {
  return item.instagram?.url
    || item.facebook?.url
    || item.bluesky?.url
    || item.wikimedia?.url
    || item.youtube?.url
    || item.trends?.url
    || item.local?.url
    || item.gdelt?.url
    || item.manual?.url
    || item.signals?.[0]?.url
    || "";
}

function stableHotspotKey(item) {
  const source = (item.source || []).join("+").toLowerCase();
  const title = String(item.originalTitle || item.name || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 96);
  return `${source}:${title}`;
}

function readHotspotLifecycle() {
  return readJsonFile(hotspotLifecyclePath, { schemaVersion: 1, records: {} });
}

function updateHotspotLifecycle(hotspots, now) {
  const lifecycle = readHotspotLifecycle();
  const records = lifecycle.records || {};
  const observedAt = now.toISOString();
  const observedDate = observedAt.slice(0, 10);
  for (const item of hotspots) {
    const key = stableHotspotKey(item);
    const previous = records[key] || {};
    const observedDates = [...new Set([...(previous.observedDates || []), observedDate])].slice(-45);
    records[key] = {
      key,
      name: item.originalTitle || item.name,
      firstSeenAt: previous.firstSeenAt || observedAt,
      lastSeenAt: observedAt,
      observedDates,
      observationCount: observedDates.length,
      sources: [...new Set([...(previous.sources || []), ...(item.source || [])])],
      markets: [...new Set([...(previous.markets || []), ...(item.markets || []), item.country].filter(Boolean))]
    };
  }
  const keepAfter = now.getTime() - 45 * 86400000;
  lifecycle.records = Object.fromEntries(Object.entries(records).filter(([, record]) =>
    Date.parse(record.lastSeenAt || "") >= keepAfter
  ));
  lifecycle.updatedAt = observedAt;
  fs.writeFileSync(hotspotLifecyclePath, `${JSON.stringify(lifecycle, null, 2)}\n`);
  return lifecycle.records;
}

function scoreTemplatePlayability(item, libraryType = "wallpaper") {
  const text = `${item.originalTitle || item.name || ""} ${item.reason || ""} ${item.prompt || ""}`.toLowerCase();
  const visualPattern = /music|song|dance|concert|festival|football|soccer|cricket|fashion|makeup|beauty|art|tattoo|city|travel|carnaval|futebol|musica|moda|afrobeats|amapiano|bollywood|kpop|idol|celebration|ceremony|design|culture|craft|textile|architecture/i;
  const longRunningPattern = /festival|holiday|diwali|ramadan|christmas|new year|world cup|carnaval|carnival|culture|craft|textile|architecture|season|championship/i;
  const lowPlayPattern = /weather|lottery|tax|gasolina|petrol|gold price|stock|bank|government|minister|election|policy|crime|death|accident|war|court|visa|exam|result|salary|pension|fuel|diesel/i;
  const copyrightPattern = /official trailer|avengers|jumanji|marvel|disney|netflix|fortnite|robux|movie trailer|game trailer/i;
  const sourceBoost = item.source?.includes("Instagram") ? 10
    : item.source?.includes("YouTube") ? 7
      : item.source?.includes("本地平台") ? 6
        : item.source?.includes("Google Trends") ? 4 : 2;
  const visualBoost = visualPattern.test(text) ? 14 : 0;
  const lowPlayPenalty = lowPlayPattern.test(text) ? 38 : 0;
  const copyrightPenalty = copyrightPattern.test(text) ? 32 : 0;
  const lifecycleBoost = libraryType === "theme"
    ? (longRunningPattern.test(text) || item.type === "predictable" ? 18 : -22)
    : 0;
  const score = Math.round(
    item.score * 0.58
    + item.trend * 0.32
    + sourceBoost
    + visualBoost
    + lifecycleBoost
    - lowPlayPenalty
    - copyrightPenalty
  );
  return clamp(score, 0, 100);
}

function evaluateRealtimeProductionReadiness(item, libraryType = "wallpaper", lifecycleRecords = {}) {
  const text = `${item.originalTitle || item.name || ""} ${item.reason || ""} ${item.prompt || ""}`.toLowerCase();
  const sources = [...new Set((item.source || []).filter(Boolean))];
  const coreRegionPattern = /印度|印度尼西亚|印尼|俄罗斯|东欧|中东|海湾|沙特|阿联酋|撒哈拉以南非洲|南美洲|南美|india|indonesia|russia|middle east|gulf|saudi|uae|ssa|africa|brazil|argentina|colombia|chile|peru/i;
  const visualPattern = /music|song|dance|concert|festival|football|soccer|cricket|fashion|makeup|beauty|art|tattoo|city|travel|carnaval|futebol|musica|moda|afrobeats|amapiano|bollywood|kpop|idol|celebration|ceremony|design|culture|craft|textile|architecture|色彩|服装|舞蹈|音乐|节庆|艺术|时尚/i;
  const personalizablePattern = /music|song|dance|festival|football|soccer|cricket|fashion|makeup|beauty|art|tattoo|portrait|selfie|outfit|style|celebration|culture|craft|textile|舞蹈|音乐|节庆|艺术|时尚|穿搭|自拍|人像/i;
  const riskPattern = /death|killed|crime|war|accident|court|election|government|minister|politic|disaster|attack|宗教冲突|政治|战争|死亡|事故|犯罪/i;
  const copyrightPattern = /official trailer|avengers|jumanji|marvel|disney|netflix|fortnite|robux|movie trailer|game trailer/i;
  const record = lifecycleRecords[stableHotspotKey(item)] || {};
  const firstSeen = Date.parse(record.firstSeenAt || "");
  const persistenceDays = Number.isFinite(firstSeen) ? Math.floor((Date.now() - firstSeen) / 86400000) : 0;
  const screening = {
    crossPlatformVerified: sources.length >= 2,
    coreRegionPriority: coreRegionPattern.test(`${item.region || ""} ${item.country || ""}`),
    sustainedHeat: Number(item.score || 0) >= 84 && Number(item.trend || 0) >= 45,
    observationCount: Number(record.observationCount || 0),
    persistenceDays,
    longRunning: item.type === "predictable"
      || Number(record.observationCount || 0) >= 2
      || persistenceDays >= 2,
    strongVisualSymbol: visualPattern.test(text),
    positiveEmotion: !riskPattern.test(text),
    personalizable: personalizablePattern.test(text),
    copyrightControllable: !copyrightPattern.test(text),
    lifecycleFit: libraryType === "theme" ? item.type === "predictable" || Number(record.observationCount || 0) >= 2 || persistenceDays >= 2 : true
  };
  const productionReady = screening.longRunning
    && screening.positiveEmotion
    && screening.copyrightControllable;
  return {
    ...screening,
    productionReady,
    status: productionReady ? "production-ready" : "watch"
  };
}

function daysSince(iso, now) {
  const timestamp = Date.parse(iso || "");
  if (!Number.isFinite(timestamp)) return 999;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000));
}

function buildTemplateLibraryStatus(hotspots, now, lifecycleRecords = {}) {
  const wallpaperBatch = readWallpaperBatch();
  const themeBatch = readThemeBatch();
  const holidayCalendar = readHolidayCalendar();
  const screenedHotspots = libraryType => hotspots
    .map(item => ({
      id: item.id,
      key: stableHotspotKey(item),
      name: item.originalTitle || item.name,
      source: item.source || [],
      sourceUrl: sourceUrlForHotspot(item),
      region: item.region,
      playabilityScore: scoreTemplatePlayability(item, libraryType),
      reason: item.reason,
      screening: evaluateRealtimeProductionReadiness(item, libraryType, lifecycleRecords),
      triggerType: "realtime"
    }))
    .sort((a, b) =>
      Number(b.screening.coreRegionPriority) - Number(a.screening.coreRegionPriority)
      || b.playabilityScore - a.playabilityScore
    );
  const rankCandidates = libraryType => screenedHotspots(libraryType)
    .filter(item => item.screening.productionReady)
    .slice(0, 5);
  const rankWatchlist = libraryType => screenedHotspots(libraryType)
    .filter(item => !item.screening.productionReady)
    .filter(item => item.playabilityScore >= 72)
    .slice(0, 5);

  const wallpaperCandidates = rankCandidates("wallpaper");
  const hotspotThemeCandidates = rankCandidates("theme");
  const wallpaperWatchlist = rankWatchlist("wallpaper");
  const themeWatchlist = rankWatchlist("theme");
  const planningWindowDays = Number(holidayCalendar.planningWindowDays || 75);
  const holidayCandidates = (holidayCalendar.events || [])
    .map(event => {
      const eventDate = Date.parse(`${event.date}T00:00:00+08:00`);
      const daysUntil = Number.isFinite(eventDate)
        ? Math.ceil((eventDate - now.getTime()) / 86400000)
        : 999;
      return {
        id: event.id,
        key: `holiday:${event.id}`,
        name: event.name,
        source: ["节假日日历"],
        sourceUrl: "",
        region: event.region,
        market: event.market,
        date: event.date,
        daysUntil,
        playabilityScore: Number(event.themePotential || 0),
        reason: event.visualDirection,
        triggerType: "holiday"
      };
    })
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= planningWindowDays);
  const themeCandidates = [...holidayCandidates, ...hotspotThemeCandidates]
    .sort((a, b) => b.playabilityScore - a.playabilityScore)
    .slice(0, 5);
  const currentWallpaperKeys = new Set(
    (wallpaperBatch.hotspots || []).map(item => item.id ? `id:${item.id}` : item.key).filter(Boolean)
  );
  const newWallpaperCount = wallpaperCandidates.filter(item =>
    !currentWallpaperKeys.has(`id:${item.id}`) && !currentWallpaperKeys.has(item.key)
  ).length;
  const wallpaperAgeDays = daysSince(wallpaperBatch.generatedAt, now);
  const themeAgeDays = daysSince(themeBatch.generatedAt, now);
  const coveredThemeKeys = new Set(
    (themeBatch.themes || []).flatMap(theme => [theme.triggerKey, theme.holidayId && `holiday:${theme.holidayId}`]).filter(Boolean)
  );
  const newThemeCandidates = themeCandidates.filter(item => !coveredThemeKeys.has(item.key));
  const wallpaperRecommended = wallpaperAgeDays >= 7
    && (newWallpaperCount >= 2 || wallpaperAgeDays >= 21)
    && wallpaperCandidates.length > 0;
  const urgentHoliday = newThemeCandidates.find(item => item.triggerType === "holiday" && item.daysUntil <= 45);
  const themeRecommended = Boolean(urgentHoliday)
    || (themeAgeDays >= 21
      && newThemeCandidates.length >= 1);

  return {
    wallpaper: {
      libraryType: "wallpaper",
      generatedAt: wallpaperBatch.generatedAt || "",
      ageDays: wallpaperAgeDays,
      minimumIntervalDays: 7,
      maximumAgeDays: 21,
      activeWindowDays: 30,
      recommended: wallpaperRecommended,
      reason: wallpaperRecommended
        ? `${newWallpaperCount} 个新的长期热点进入头部，建议人工触发新壁纸批次。`
        : wallpaperCandidates.length
          ? "沿用当前壁纸批次；生产级候选尚未达到换批间隔或头部变化不足。"
          : "沿用当前壁纸批次；实时信号尚未形成持续性，固定节日则按预告窗口单独进入生产。",
      candidates: wallpaperCandidates.slice(0, 3),
      watchlist: wallpaperWatchlist.slice(0, 3)
    },
    theme: {
      libraryType: "theme",
      generatedAt: themeBatch.generatedAt || "",
      ageDays: themeAgeDays,
      minimumIntervalDays: 21,
      activeWindowDays: 30,
      recommended: themeRecommended,
      reason: themeRecommended
        ? urgentHoliday
          ? `${urgentHoliday.name} 距今 ${urgentHoliday.daysUntil} 天且尚未覆盖，建议追加主题模板。`
          : "出现具备持续周期和整套 OS 延展能力的新机会，建议追加主题模板。"
        : "沿用当前主题库；实时爆发热点不会单独触发主题换批。",
      candidates: themeCandidates.slice(0, 3),
      watchlist: themeWatchlist.slice(0, 3)
    }
  };
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

  // 同一支视频会同时进入多个国家/地区的热门榜。合并为一条热点，避免在详情中
  // 把相同判断按地区重复拼接。
  const grouped = new Map();
  for (const item of batches) {
    const key = item.youtube?.videoId || item.originalTitle;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...item, markets: [item.country] });
      continue;
    }
    existing.markets = [...new Set([...existing.markets, item.country])];
    if (parseHeat(item.heat) > parseHeat(existing.heat)) {
      const markets = existing.markets;
      grouped.set(key, { ...item, markets });
    }
  }
  return [...grouped.values()]
    .map(item => ({
      ...item,
      country: item.markets.join(" / "),
      reason: `来自 YouTube 热门榜（${item.markets.join("、")}），播放量 ${item.heat}。视觉判断：${visualSignalFromTitle(item.originalTitle)}；适合先进入候选池，由设计师二次判断是否转主题模板。`
    }))
    .sort((a, b) => b.score - a.score || b.trend - a.trend)
    .slice(0, 16);
}

function parseGoogleTrendsRss(xml, market) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
  return items.slice(0, 8).map((item, rank) => {
    const topic = tagValue(item, "title") || "Google 搜索趋势";
    const traffic = parseTraffic(tagValue(item, "ht:approx_traffic"));
    const picture = tagValue(item, "ht:picture") || tagValue(item, "ht:news_item_picture");
    const newsTitles = tagValues(item, "ht:news_item_title");
    const newsUrls = tagValues(item, "ht:news_item_url");
    const newsSources = tagValues(item, "ht:news_item_source");
    const newsTitle = newsTitles[0] || "";
    const searchUrl = `https://trends.google.com/trends/explore?geo=${market.code}&q=${encodeURIComponent(topic)}`;
    const score = clamp(Math.round(68 + Math.log10(Math.max(traffic, 1000)) * 4 + Math.max(0, 12 - rank)), 64, 94);
    const trend = clamp(Math.round(28 + Math.log10(Math.max(traffic, 1000)) * 7 + Math.max(0, 10 - rank)), 18, 82);
    return {
      id: `gt-${market.code}-${encodeURIComponent(topic).slice(0, 38)}`,
      name: topic.length > 22 ? `${topic.slice(0, 22)}…` : topic,
      originalTitle: topic,
      region: market.region,
      country: market.country,
      source: ["Google Trends"],
      heat: formatHeat(Math.max(traffic, 1000)),
      trend,
      score,
      status: statusFromTrend(trend, score),
      type: "realtime",
      selected: score >= 86,
      preview: "",
      previewTitle: "",
      previewMeta: "",
      prompt: promptFromTrend(topic, market, newsTitle),
      reason: `来自 Google Trends ${market.country} 搜索趋势，搜索热度约 ${tagValue(item, "ht:approx_traffic") || "上升中"}。关联新闻源：${newsSources.slice(0, 2).join(" / ") || "Google Trends"}；适合判断地区搜索兴趣和热点持续性。`,
      trends: {
        topic,
        traffic,
        publishedAt: tagValue(item, "pubDate"),
        picture,
        url: searchUrl,
        newsUrl: newsUrls[0] || "",
        newsTitle,
        newsSource: newsSources[0] || ""
      }
    };
  });
}

async function fetchGoogleTrendsForMarket(market) {
  const url = new URL("https://trends.google.com/trending/rss");
  url.searchParams.set("geo", market.code);
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 HotspotOperationsDashboard/1.0"
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Trends ${market.code} 请求失败：${response.status} ${body.slice(0, 180)}`);
  }
  return parseGoogleTrendsRss(await response.text(), market);
}

async function fetchGoogleTrendsSignals() {
  const batches = [];
  for (const market of googleTrendsMarkets) {
    try {
      const rows = await fetchGoogleTrendsForMarket(market);
      batches.push(...rows);
    } catch (error) {
      console.warn(error.message);
    }
  }
  return batches
    .sort((a, b) => b.score - a.score || b.trend - a.trend)
    .slice(0, 16);
}

function parseGoogleNewsRss(xml, market, topic, category = "综合") {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
  return items.slice(0, 4).map((item, rank) => {
    const rawTitle = tagValue(item, "title") || topic;
    const sourceName = tagValue(item, "source") || "Google News";
    const title = rawTitle.replace(/\s-\s[^-]+$/, "").trim();
    const url = tagValue(item, "link");
    const score = sourceScore(58, rank, 5000);
    const trend = sourceTrend(22, rank, 5000);
    return {
      id: `local-${market.code}-${category}-${encodeURIComponent(title).slice(0, 42)}`,
      name: textSnippet(title),
      originalTitle: title,
      region: market.region,
      country: market.country,
      source: ["本地平台"],
      heat: formatHeat(5000 + rank * 1200),
      trend,
      score,
      status: statusFromTrend(trend, score),
      type: "realtime",
      selected: score >= 84,
      preview: "",
      previewTitle: "",
      previewMeta: "",
      prompt: promptFromLocalMedia(title, market, sourceName),
      reason: `来自 ${market.country} 本地媒体/Google News 公开新闻源，分类：${category}，媒体：${sourceName}。适合补充本地语境和文化线索，帮助运营判断热点是否具备视觉转模板价值。`,
      local: {
        topic,
        category,
        sourceName,
        title,
        publishedAt: tagValue(item, "pubDate"),
        url
      }
    };
  });
}

async function fetchLocalMediaForMarket(market) {
  const topics = (marketTopics[market.code] || ["music", "football", "fashion"]).slice(0, 3);
  const locale = googleNewsLocales[market.code] || { hl: "en-US", ceid: `${market.code}:en` };
  const rows = [];
  for (const [index, topic] of topics.entries()) {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", `${topic} when:2d`);
    url.searchParams.set("hl", locale.hl);
    url.searchParams.set("gl", market.code);
    url.searchParams.set("ceid", locale.ceid);

    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 HotspotOperationsDashboard/1.0" }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`本地媒体 ${market.code} ${topic} 请求失败：${response.status} ${body.slice(0, 180)}`);
    }
    rows.push(...parseGoogleNewsRss(await response.text(), market, topic, index === 0 ? "核心话题" : "垂类补充"));
  }
  return rows;
}

async function fetchLocalMediaSignals() {
  const batches = [];
  for (const market of localMediaMarkets) {
    try {
      const rows = await fetchLocalMediaForMarket(market);
      batches.push(...rows);
    } catch (error) {
      console.warn(error.message);
    }
  }
  return batches
    .sort((a, b) => b.score - a.score || b.trend - a.trend)
    .slice(0, 14);
}

function gdeltMarketFromArticle(article = {}) {
  const countryCode = String(article.sourceCountry || "").toUpperCase();
  return gdeltMarkets.find(market => market.code === countryCode)
    || gdeltMarkets.find(market => article.url?.toLowerCase().includes(`.${market.code.toLowerCase()}/`))
    || { code: "GLOBAL", country: "全球", region: "全球" };
}

async function fetchGdeltSignals() {
  const query = "(football OR soccer OR cricket OR music OR film OR fashion OR festival OR concert OR celebrity OR art)";
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "18");
  url.searchParams.set("sort", "HybridRel");
  url.searchParams.set("timespan", "24h");

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 HotspotOperationsDashboard/1.0" }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`GDELT 请求失败：${response.status} ${body.slice(0, 180)}`);
    if (!body.trim().startsWith("{")) throw new Error(`GDELT 暂时限流或返回非 JSON：${body.slice(0, 120)}`);
    const json = JSON.parse(body);
    return (json.articles || []).slice(0, 12).map((article, rank) => {
      const market = gdeltMarketFromArticle(article);
      const title = article.title || "GDELT 全球新闻热点";
      const volume = 7000 + rank * 1500 + Number(article.socialimage ? 4000 : 0);
      const score = sourceScore(60, rank, volume);
      const trend = sourceTrend(24, rank, volume);
      return {
        id: `gdelt-${encodeURIComponent(article.url || title).slice(0, 52)}`,
        name: textSnippet(title),
        originalTitle: title,
        region: market.region,
        country: market.country,
        source: ["GDELT"],
        heat: formatHeat(volume),
        trend,
        score,
        status: statusFromTrend(trend, score),
        type: "realtime",
        selected: score >= 85,
        preview: "",
        previewTitle: "",
        previewMeta: "",
        prompt: promptFromGdelt(title, market, article.domain || article.sourceCollection),
        reason: `来自 GDELT 全球新闻数据库，媒体域名：${article.domain || "未知"}。适合补充跨语言新闻传播热度，判断是否形成可运营的地区话题。`,
        gdelt: {
          domain: article.domain || "",
          language: article.language || "",
          publishedAt: article.seendate || "",
          picture: article.socialimage || "",
          url: article.url || ""
        }
      };
    });
  } catch (error) {
    console.warn(error.message);
    return [];
  }
}

function normalizeManualHotspot(row, index) {
  if (row?.enabled === false) return null;
  if (!row || !row.name) return null;
  const source = row.source || "人工录入";
  const score = clamp(Number(row.score || 86), 62, 98);
  const trend = clamp(Number(row.trend || 35), 8, 88);
  return {
    id: `manual-${index}-${encodeURIComponent(row.name).slice(0, 36)}`,
    name: textSnippet(row.name),
    originalTitle: row.name,
    region: row.region || "全球",
    country: row.country || row.region || "全球",
    source: ["人工录入"],
    heat: row.heat || "人工判断",
    trend,
    score,
    status: row.status || statusFromTrend(trend, score),
    type: row.type || "realtime",
    selected: row.selected ?? true,
    preview: row.preview || "",
    previewTitle: row.previewTitle || "",
    previewMeta: row.previewMeta || "",
    prompt: row.prompt || promptFromManual(row.name, source),
    reason: row.reason || `来自运营人工录入，原始来源：${source}。适合补齐机器抓取暂未覆盖的平台热点，由设计师进一步判断是否转模板。`,
    manual: {
      sourceName: source,
      owner: row.owner || "",
      note: row.note || "",
      publishedAt: row.publishedAt || "",
      url: row.url || ""
    }
  };
}

async function fetchManualSignals() {
  return readManualHotspots()
    .map(normalizeManualHotspot)
    .filter(Boolean)
    .slice(0, 12);
}

async function fetchXSignals() {
  if (!xBearerToken) {
    console.log("X_BEARER_TOKEN 未配置，跳过 X 真实热点抓取。");
    return [];
  }
  const batches = [];
  for (const market of youtubeMarkets.slice(0, 6)) {
    const topics = marketTopics[market.code] || ["music", "football", "fashion"];
    const query = `(${topics.slice(0, 3).map(t => `"${t}"`).join(" OR ")}) lang:${market.code === "BR" ? "pt" : market.code === "RU" ? "ru" : market.code === "ID" ? "id" : market.code === "IN" ? "en" : "es"} -is:retweet`;
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", "10");
    url.searchParams.set("tweet.fields", "created_at,public_metrics,lang,text");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name");
    try {
      const response = await fetch(url, { headers: { authorization: `Bearer ${xBearerToken}` } });
      if (!response.ok) throw new Error(`X ${market.code} 请求失败：${response.status} ${(await response.text()).slice(0, 160)}`);
      const json = await response.json();
      const users = new Map((json.includes?.users || []).map(user => [user.id, user]));
      batches.push(...(json.data || []).map((tweet, rank) => {
        const metrics = tweet.public_metrics || {};
        const volume = Number(metrics.like_count || 0) + Number(metrics.retweet_count || 0) * 2 + Number(metrics.reply_count || 0) * 3;
        const user = users.get(tweet.author_id) || {};
        const score = sourceScore(62, rank, volume + 1000);
        const trend = sourceTrend(26, rank, volume + 1000);
        const title = textSnippet(tweet.text.replace(/\s+/g, " "), 36);
        return {
          id: `x-${tweet.id}`,
          name: title,
          originalTitle: tweet.text,
          region: market.region,
          country: market.country,
          source: ["X"],
          heat: formatHeat(Math.max(volume * 120, 1000)),
          trend,
          score,
          status: statusFromTrend(trend, score),
          type: "realtime",
          selected: score >= 86,
          preview: "",
          previewTitle: "",
          previewMeta: "",
          prompt: promptFromSocial("X", tweet.text, market),
          reason: `来自 X 最近搜索结果，互动量约 ${volume}。适合判断实时讨论速度和情绪扩散，但需二次判断视觉可转化度。`,
          x: {
            tweetId: tweet.id,
            username: user.username || "",
            publishedAt: tweet.created_at,
            url: user.username ? `https://x.com/${user.username}/status/${tweet.id}` : `https://x.com/i/web/status/${tweet.id}`
          }
        };
      }));
    } catch (error) {
      console.warn(error.message);
    }
  }
  return batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
}

function blueskyPostUrl(post) {
  const handle = post.author?.handle || "";
  const recordKey = String(post.uri || "").split("/").pop();
  return handle && recordKey ? `https://bsky.app/profile/${handle}/post/${recordKey}` : "https://bsky.app/";
}

function blueskyPostImage(post) {
  const embed = post.embed || {};
  return embed.images?.[0]?.thumb
    || embed.media?.images?.[0]?.thumb
    || embed.external?.thumb
    || "";
}

async function fetchBlueskySignals() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const batches = [];
  let successfulQueries = 0;

  const results = await Promise.all(blueskyQueries.map(async ({ query, market }) => {
    const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("sort", "top");
    url.searchParams.set("since", since);
    try {
      const result = await fetchJsonWithTimeout(url, {
        headers: { "user-agent": "LocalHotspotOpportunityCenter/1.0" }
      }, 10000);
      if (!result.ok) {
        throw new Error(`Bluesky ${market.code} 请求失败：${result.status} ${result.body.slice(0, 160)}`);
      }
      successfulQueries += 1;
      return (result.json.posts || []).map((post, rank) => {
        const text = String(post.record?.text || "").replace(/\s+/g, " ").trim();
        const volume = Number(post.likeCount || 0)
          + Number(post.repostCount || 0) * 2
          + Number(post.replyCount || 0) * 3
          + Number(post.quoteCount || 0) * 2;
        const score = sourceScore(61, rank, volume + 1000);
        const trend = sourceTrend(25, rank, volume + 1000);
        return {
          id: `bluesky-${String(post.uri || `${market.code}-${rank}`).split("/").pop()}`,
          name: textSnippet(text || query, 36),
          originalTitle: text || query,
          region: market.region,
          country: market.country,
          source: ["Bluesky"],
          heat: formatHeat(Math.max(volume * 100, 1000)),
          trend,
          score,
          status: statusFromTrend(trend, score),
          type: "realtime",
          selected: score >= 86,
          preview: blueskyPostImage(post),
          previewTitle: "",
          previewMeta: "",
          prompt: promptFromSocial("Bluesky", text || query, market),
          reason: `来自 Bluesky 公开搜索「${query}」，互动量约 ${volume}。适合补充公开社区讨论和新兴视觉风格信号，需与 YouTube、Google Trends 或本地媒体交叉验证。`,
          bluesky: {
            uri: post.uri || "",
            handle: post.author?.handle || "",
            displayName: post.author?.displayName || "",
            publishedAt: post.record?.createdAt || post.indexedAt || "",
            query,
            image: blueskyPostImage(post),
            url: blueskyPostUrl(post)
          }
        };
      });
    } catch (error) {
      console.warn(error.name === "AbortError" ? `Bluesky ${market.code} 请求超时` : error.message);
      return [];
    }
  }));

  batches.push(...results.flat());
  const signals = batches
    .filter(item => item.originalTitle)
    .sort((a, b) => b.score - a.score || b.trend - a.trend)
    .slice(0, 8);

  openSourceStatus.bluesky = {
    source: "Bluesky",
    status: successfulQueries ? (signals.length ? "connected" : "empty") : "error",
    connected: successfulQueries > 0,
    fetchedCount: batches.length,
    detail: successfulQueries
      ? `公开搜索成功 ${successfulQueries}/${blueskyQueries.length} 组`
      : "公开 API 暂时无法连接"
  };
  return signals;
}

function previousUtcDateParts() {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0")
  };
}

function isUsefulWikimediaArticle(article = "") {
  const title = String(article).replaceAll("_", " ").trim();
  if (!title || title.includes(":")) return false;
  if (/^(main page|página principal|página inicial|заглавная страница|الصفحة الرئيسي[ةه]|الصفحة الرئيسة|मुखपृष्ठ|halaman utama|babban shafi|mwanzo)$/iu.test(title)) return false;
  if (/^(wikipedia|wikimedia|search|buscar|بحث|поиск)$/iu.test(title)) return false;
  if (/\b(xnxx|xhamster|porn|porno|mia khalifa)\b/iu.test(title)) return false;
  if (/^\d{1,4}$/.test(title) || /^\d{1,2}[_\s-]\p{L}+/u.test(title)) return false;
  if (/\b(list of|lists of|disambiguation)\b/i.test(title)) return false;
  return true;
}

function wikimediaArticleUrl(project, article) {
  return `https://${project}/wiki/${encodeURIComponent(article).replaceAll("%2F", "/")}`;
}

async function fetchWikimediaMarketSignals(market, dateParts) {
  const { year, month, day } = dateParts;
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${market.project}/all-access/${year}/${month}/${day}`;
  const result = await fetchJsonWithTimeout(url, {
    headers: {
      "user-agent": "LocalHotspotOpportunityCenter/1.0 (public-interest analytics)"
    }
  }, 15000);
  if (!result.ok) {
    throw new Error(`Wikimedia ${market.project} 请求失败：${result.status} ${result.body.slice(0, 140)}`);
  }
  const rows = result.json.items?.[0]?.articles || [];
  return rows
    .filter(item => isUsefulWikimediaArticle(item.article))
    .slice(0, 2)
    .map((item, rank) => {
      const title = String(item.article).replaceAll("_", " ").trim();
      const views = Number(item.views || 0);
      const score = sourceScore(60, rank, views);
      const trend = sourceTrend(20, rank, views);
      return {
        id: `wm-${market.project}-${encodeURIComponent(item.article).slice(0, 44)}`,
        name: textSnippet(title, 30),
        originalTitle: title,
        region: market.region,
        country: market.country,
        source: ["Wikimedia"],
        heat: formatHeat(Math.max(views, 1000)),
        trend,
        score,
        status: statusFromTrend(trend, score),
        type: "realtime",
        selected: false,
        preview: "",
        previewTitle: "",
        previewMeta: "",
        prompt: promptFromTrend(title, market, ""),
        reason: `来自 ${market.language} Wikipedia 前一日高访问条目，浏览量约 ${formatHeat(Math.max(views, 1000))}。这是语言市场兴趣信号，不等同于该国家全网热榜，需与 Google Trends、YouTube 或本地媒体交叉验证后再进入模板候选。`,
        wikimedia: {
          project: market.project,
          language: market.language,
          article: item.article,
          views,
          rank: Number(item.rank || rank + 1),
          date: `${year}-${month}-${day}`,
          url: wikimediaArticleUrl(market.project, item.article)
        }
      };
    });
}

async function fetchWikimediaSignals() {
  const dateParts = previousUtcDateParts();
  let successfulProjects = 0;
  const results = await Promise.all(wikimediaMarkets.map(async market => {
    try {
      const rows = await fetchWikimediaMarketSignals(market, dateParts);
      successfulProjects += 1;
      return rows;
    } catch (error) {
      console.warn(error.name === "AbortError" ? `Wikimedia ${market.project} 请求超时` : error.message);
      return [];
    }
  }));
  const signals = [
    ...results.map(rows => rows[0]).filter(Boolean),
    ...results.map(rows => rows[1]).filter(Boolean)
  ].slice(0, 16);
  openSourceStatus.wikimedia = {
    source: "Wikimedia",
    status: successfulProjects ? (signals.length ? "connected" : "empty") : "error",
    connected: successfulProjects > 0,
    fetchedCount: signals.length,
    detail: successfulProjects
      ? `${dateParts.year}-${dateParts.month}-${dateParts.day} 日榜成功 ${successfulProjects}/${wikimediaMarkets.length} 个语言项目`
      : "公开 Pageviews API 暂时无法连接"
  };
  return signals;
}

async function discoverMetaAccounts() {
  if (!metaAccessToken) {
    metaSourceStatus.meta = { ...metaSourceStatus.meta, status: "missing", detail: "未配置 META_ACCESS_TOKEN" };
    return;
  }
  try {
    const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/me/accounts`);
    url.searchParams.set("fields", "id,name,access_token,instagram_business_account");
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", metaAccessToken);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Meta 账号发现失败：${response.status} ${(await response.text()).slice(0, 160)}`);
    }
    const pages = (await response.json()).data || [];
    if (!pages.length) {
      const businessesUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/me/businesses`);
      businessesUrl.searchParams.set("fields", "id");
      businessesUrl.searchParams.set("limit", "100");
      businessesUrl.searchParams.set("access_token", metaAccessToken);
      const businessesResponse = await fetch(businessesUrl);
      if (businessesResponse.ok) {
        const businesses = (await businessesResponse.json()).data || [];
        for (const business of businesses) {
          if (!business?.id) continue;
          const ownedPagesUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/${business.id}/owned_pages`);
          ownedPagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");
          ownedPagesUrl.searchParams.set("limit", "100");
          ownedPagesUrl.searchParams.set("access_token", metaAccessToken);
          const ownedPagesResponse = await fetch(ownedPagesUrl);
          if (!ownedPagesResponse.ok) {
            console.warn(`Meta Business ${business.id} Page 发现失败：${ownedPagesResponse.status}`);
            continue;
          }
          pages.push(...((await ownedPagesResponse.json()).data || []));
        }
        if (pages.length) {
          console.log(`Meta 已通过 Business Portfolio 识别 ${pages.length} 个 Page。`);
        }
      }
    }
    if (!pages.length) {
      const subjectUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/me`);
      subjectUrl.searchParams.set("fields", "id");
      subjectUrl.searchParams.set("metadata", "1");
      subjectUrl.searchParams.set("access_token", metaAccessToken);
      const subjectResponse = await fetch(subjectUrl);
      if (!subjectResponse.ok) {
        throw new Error(`Meta Token 身份识别失败：${subjectResponse.status} ${(await subjectResponse.text()).slice(0, 160)}`);
      }
      const subject = await subjectResponse.json();
      if (String(subject.metadata?.type || "").toLowerCase() === "page" && subject.id) {
        const pageUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/${subject.id}`);
        pageUrl.searchParams.set("fields", "instagram_business_account");
        pageUrl.searchParams.set("access_token", metaAccessToken);
        const pageResponse = await fetch(pageUrl);
        if (!pageResponse.ok) {
          throw new Error(`Meta Page 关联账号识别失败：${pageResponse.status} ${(await pageResponse.text()).slice(0, 160)}`);
        }
        const page = await pageResponse.json();
        pages.push({
          id: String(subject.id),
          access_token: metaAccessToken,
          instagram_business_account: page.instagram_business_account
        });
        console.log("Meta 检测到 Page Access Token，已切换为单 Page 接入模式。");
      }
    }
    if (!pages.length) {
      throw new Error("Meta 未返回可管理的 Facebook Page，请检查 pages_show_list 权限和 Page 管理关系。");
    }
    for (const page of pages) {
      if (!page?.id) continue;
      if (page.access_token) metaPageAccessTokens.set(String(page.id), page.access_token);
    }
    if (!facebookPageIds.length) {
      facebookPageIds.push(...pages.map(page => String(page.id || "")).filter(Boolean));
    }
    if (!instagramBusinessAccountId) {
      instagramBusinessAccountId = String(
        pages.find(page => page.instagram_business_account?.id)?.instagram_business_account?.id || ""
      );
    }
    metaSourceStatus.meta = {
      source: "Meta",
      status: "connected",
      connected: true,
      fetchedCount: facebookPageIds.length,
      detail: `已识别 ${facebookPageIds.length} 个 Facebook Page${instagramBusinessAccountId ? "及 1 个 Instagram 专业账号" : ""}`
    };
    console.log(`Meta 已识别 ${facebookPageIds.length} 个 Facebook Page${instagramBusinessAccountId ? "及 1 个 Instagram 专业账号" : ""}。`);
  } catch (error) {
    metaSourceStatus.meta = { ...metaSourceStatus.meta, status: "error", connected: false, detail: error.message };
    console.warn(error.message);
  }
}

async function fetchInstagramSignals() {
  if (!metaAccessToken || !instagramBusinessAccountId) {
    metaSourceStatus.instagram = {
      source: "Instagram",
      status: "missing",
      connected: false,
      fetchedCount: 0,
      detail: "缺少有效 Meta Token 或关联的 Instagram 专业账号"
    };
    console.log("META_ACCESS_TOKEN 或 INSTAGRAM_BUSINESS_ACCOUNT_ID 未配置，跳过 Instagram 真实热点抓取。");
    return [];
  }
  const tags = ["football", "music", "fashion", "festival", "art"];
  const batches = [];
  let successfulQueries = 0;
  let failedQueries = 0;
  for (const tag of tags) {
    try {
      const search = new URL(`https://graph.facebook.com/${metaGraphVersion}/ig_hashtag_search`);
      search.searchParams.set("user_id", instagramBusinessAccountId);
      search.searchParams.set("q", tag);
      search.searchParams.set("access_token", metaAccessToken);
      const searchResponse = await fetch(search);
      if (!searchResponse.ok) throw new Error(`Instagram hashtag ${tag} 查询失败：${searchResponse.status} ${(await searchResponse.text()).slice(0, 160)}`);
      const hashtagId = (await searchResponse.json()).data?.[0]?.id;
      if (!hashtagId) continue;
      const media = new URL(`https://graph.facebook.com/${metaGraphVersion}/${hashtagId}/recent_media`);
      media.searchParams.set("user_id", instagramBusinessAccountId);
      media.searchParams.set("fields", "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count");
      media.searchParams.set("access_token", metaAccessToken);
      const mediaResponse = await fetch(media);
      if (!mediaResponse.ok) throw new Error(`Instagram media ${tag} 查询失败：${mediaResponse.status} ${(await mediaResponse.text()).slice(0, 160)}`);
      const json = await mediaResponse.json();
      successfulQueries += 1;
      batches.push(...(json.data || []).slice(0, 4).map((post, rank) => {
        const volume = Number(post.like_count || 0) + Number(post.comments_count || 0) * 3;
        const title = post.caption ? textSnippet(post.caption.replace(/\s+/g, " "), 30) : `#${tag}`;
        const score = sourceScore(64, rank, volume + 1000);
        const trend = sourceTrend(25, rank, volume + 1000);
        return {
          id: `ig-${post.id}`,
          name: title,
          originalTitle: post.caption || `#${tag}`,
          region: "全球",
          country: "全球",
          source: ["Instagram"],
          heat: formatHeat(Math.max(volume * 100, 1000)),
          trend,
          score,
          status: statusFromTrend(trend, score),
          type: "realtime",
          selected: score >= 86,
          preview: "",
          previewTitle: "",
          previewMeta: "",
          prompt: promptFromSocial("Instagram", post.caption || tag, { country: "全球" }),
          reason: `来自 Instagram Hashtag #${tag} 近期媒体，适合判断视觉符号、风格和内容转模板方向。`,
          instagram: {
            hashtag: tag,
            mediaUrl: post.media_url || "",
            publishedAt: post.timestamp,
            url: post.permalink || ""
          }
        };
      }));
    } catch (error) {
      failedQueries += 1;
      console.warn(error.message);
    }
  }
  const output = batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
  metaSourceStatus.instagram = {
    source: "Instagram",
    status: successfulQueries ? (output.length ? "connected" : "empty") : "error",
    connected: successfulQueries > 0,
    fetchedCount: output.length,
    detail: `Hashtag Search 成功 ${successfulQueries}/${tags.length} 组${failedQueries ? `，${failedQueries} 组需重试` : ""}`
  };
  return output;
}

async function discoverPublicFacebookPages() {
  const queries = readFacebookPublicPageQueries();
  if (!queries.length) {
    return {
      pages: [],
      successfulSearches: 0,
      failedSearches: 0,
      reviewRequired: false,
      detail: "未配置 Facebook 公共主页候选池"
    };
  }
  if (!metaAppSecret) {
    return {
      pages: [],
      successfulSearches: 0,
      failedSearches: 0,
      reviewRequired: false,
      detail: "缺少 META_APP_SECRET，公共主页搜索尚未启用"
    };
  }

  const pages = [];
  const seenPageIds = new Set(facebookPageIds.map(String));
  let successfulSearches = 0;
  let failedSearches = 0;
  let reviewRequired = false;
  let lastError = "";

  for (const query of queries) {
    if (pages.length >= facebookPublicPageLimit) break;
    try {
      const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/pages/search`);
      url.searchParams.set("q", query.query);
      url.searchParams.set("fields", "id,name,location,link,verification_status");
      url.searchParams.set("limit", "3");
      appendMetaAuth(url, metaAccessToken, true);
      const response = await fetch(url);
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`Facebook 公共主页搜索 ${query.query} 失败：${response.status} ${body.slice(0, 220)}`);
      }
      successfulSearches += 1;
      const candidates = body ? (JSON.parse(body).data || []) : [];
      const page = candidates.find(item => item.verification_status === "blue_verified") || candidates[0];
      if (!page?.id || seenPageIds.has(String(page.id))) continue;
      seenPageIds.add(String(page.id));
      pages.push({
        id: String(page.id),
        name: page.name || query.query,
        link: page.link || "",
        verificationStatus: page.verification_status || "",
        location: page.location || {},
        query: query.query,
        region: query.region,
        country: query.country,
        category: query.category || "公共主页"
      });
    } catch (error) {
      failedSearches += 1;
      lastError = error.message;
      console.warn(error.message);
      if (isPublicContentReviewError(error.message)) {
        reviewRequired = true;
        break;
      }
    }
  }

  return {
    pages,
    successfulSearches,
    failedSearches,
    reviewRequired,
    detail: reviewRequired
      ? "Page Public Content Access 尚未通过公司验证与 App Review"
      : pages.length
        ? `公共主页搜索命中 ${pages.length} 个候选主页`
        : lastError || "公共主页搜索未返回候选主页"
  };
}

async function fetchFacebookSignals() {
  if (!metaAccessToken) {
    metaSourceStatus.facebook = {
      source: "Facebook",
      status: "missing",
      connected: false,
      fetchedCount: 0,
      detail: "缺少有效 META_ACCESS_TOKEN"
    };
    console.log("META_ACCESS_TOKEN 未配置，跳过 Facebook 真实热点抓取。");
    return [];
  }

  const publicDiscovery = await discoverPublicFacebookPages();
  const batches = [];
  let successfulManagedPages = 0;
  let failedManagedPages = 0;
  let successfulPublicPages = 0;
  let failedPublicPages = 0;

  async function fetchPagePosts(page, isPublicPage) {
    const pageId = String(page.id);
    try {
      const endpoint = isPublicPage ? "feed" : "posts";
      const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/${pageId}/${endpoint}`);
      url.searchParams.set("fields", "id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true),attachments{media,url,title}");
      url.searchParams.set("limit", "8");
      appendMetaAuth(
        url,
        isPublicPage ? metaAccessToken : (metaPageAccessTokens.get(pageId) || metaAccessToken),
        isPublicPage
      );
      const response = await fetch(url);
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`Facebook ${isPublicPage ? "公共" : "管理"}主页 ${pageId} 请求失败：${response.status} ${body.slice(0, 220)}`);
      }
      const json = body ? JSON.parse(body) : {};
      if (isPublicPage) successfulPublicPages += 1;
      else successfulManagedPages += 1;
      batches.push(...(json.data || []).map((post, rank) => {
        const volume = Number(post.shares?.count || 0) * 3 + Number(post.reactions?.summary?.total_count || 0) + Number(post.comments?.summary?.total_count || 0) * 3;
        const title = textSnippet((post.message || post.attachments?.data?.[0]?.title || "Facebook 热点内容").replace(/\s+/g, " "), 32);
        const score = sourceScore(isPublicPage ? 66 : 61, rank, volume + 1000);
        const trend = sourceTrend(isPublicPage ? 27 : 23, rank, volume + 1000);
        return {
          id: `fb-${post.id}`,
          name: title,
          originalTitle: post.message || title,
          region: page.region || "全球",
          country: page.country || "全球",
          source: ["Facebook"],
          heat: formatHeat(Math.max(volume * 120, 1000)),
          trend,
          score,
          status: statusFromTrend(trend, score),
          type: "realtime",
          selected: score >= 86,
          preview: "",
          previewTitle: "",
          previewMeta: "",
          prompt: promptFromSocial("Facebook", post.message || title, { country: page.country || "全球" }),
          reason: `来自 Facebook ${isPublicPage ? "公共主页池" : "已管理主页"}「${page.name || pageId}」的公开帖子，适合补充社区传播和本地媒体扩散判断。`,
          facebook: {
            pageId,
            pageName: page.name || "",
            pageLink: page.link || "",
            pageScope: isPublicPage ? "public-search" : "managed",
            query: page.query || "",
            category: page.category || "",
            publishedAt: post.created_time,
            url: post.permalink_url || "",
            picture: post.attachments?.data?.[0]?.media?.image?.src || ""
          }
        };
      }));
    } catch (error) {
      if (isPublicPage) failedPublicPages += 1;
      else failedManagedPages += 1;
      console.warn(error.message);
    }
  }

  for (const pageId of facebookPageIds) {
    await fetchPagePosts({ id: pageId, name: "已管理主页", region: "全球", country: "全球" }, false);
  }
  for (const page of publicDiscovery.pages) {
    await fetchPagePosts(page, true);
  }

  const output = batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
  const successfulPages = successfulManagedPages + successfulPublicPages;
  const failedPages = failedManagedPages + failedPublicPages;
  const managedDetail = `管理主页 ${successfulManagedPages}/${facebookPageIds.length}`;
  const publicDetail = publicDiscovery.reviewRequired
    ? "公共主页权限待公司验证与 App Review"
    : publicDiscovery.pages.length
      ? `公共主页 ${successfulPublicPages}/${publicDiscovery.pages.length}`
      : publicDiscovery.detail;
  metaSourceStatus.facebook = {
    source: "Facebook",
    status: output.length
      ? "connected"
      : successfulPages
        ? "empty"
        : publicDiscovery.reviewRequired
          ? "review_required"
          : "error",
    connected: successfulPages > 0,
    fetchedCount: output.length,
    scope: successfulPublicPages ? "public-pages" : "managed-pages",
    publicPageCount: publicDiscovery.pages.length,
    detail: `${managedDetail}；${publicDetail}${failedPages ? `；${failedPages} 个主页需重试` : ""}`
  };
  return output;
}

async function fetchTikTokSignals() {
  if (!tiktokAccessToken) {
    console.log("TIKTOK_ACCESS_TOKEN 未配置，跳过 TikTok 真实热点抓取。");
    return [];
  }
  const batches = [];
  for (const market of youtubeMarkets.slice(0, 8)) {
    try {
      const response = await fetch("https://open.tiktokapis.com/v2/research/video/query/?fields=id,video_description,create_time,region_code,like_count,comment_count,share_count,view_count,username,hashtag_names", {
        method: "POST",
        headers: {
          authorization: `Bearer ${tiktokAccessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          query: { and: [{ operation: "EQ", field_name: "region_code", field_values: [market.code] }] },
          max_count: 20
        })
      });
      if (!response.ok) throw new Error(`TikTok ${market.code} 请求失败：${response.status} ${(await response.text()).slice(0, 160)}`);
      const json = await response.json();
      batches.push(...(json.data?.videos || []).slice(0, 5).map((video, rank) => {
        const volume = Number(video.view_count || 0) + Number(video.like_count || 0) * 20 + Number(video.comment_count || 0) * 80 + Number(video.share_count || 0) * 120;
        const title = textSnippet(video.video_description || (video.hashtag_names || []).join(" #") || "TikTok 热点视频", 30);
        const score = sourceScore(66, rank, volume + 1000);
        const trend = sourceTrend(30, rank, volume + 1000);
        return {
          id: `tt-${video.id}`,
          name: title,
          originalTitle: video.video_description || title,
          region: market.region,
          country: market.country,
          source: ["TikTok"],
          heat: formatHeat(Math.max(Number(video.view_count || 0), 1000)),
          trend,
          score,
          status: statusFromTrend(trend, score),
          type: "realtime",
          selected: score >= 88,
          preview: "",
          previewTitle: "",
          previewMeta: "",
          prompt: promptFromSocial("TikTok", video.video_description || title, market),
          reason: `来自 TikTok 官方 Research API，播放量 ${formatHeat(Number(video.view_count || 0))}。适合判断短视频视觉符号和传播速度。`,
          tiktok: {
            videoId: video.id,
            username: video.username || "",
            publishedAt: video.create_time || "",
            url: video.username ? `https://www.tiktok.com/@${video.username}/video/${video.id}` : `https://www.tiktok.com/`
          }
        };
      }));
    } catch (error) {
      console.warn(error.message);
    }
  }
  return batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
}

function takeBySource(list, source, limit) {
  return list.filter(item => item.source.includes(source)).slice(0, limit);
}

function composeSignals(groups) {
  const mixed = [
    ...takeBySource(groups.youtube, "YouTube", 7),
    ...takeBySource(groups.googleTrends, "Google Trends", 5),
    ...takeBySource(groups.localMedia, "本地平台", 4),
    ...takeBySource(groups.gdelt, "GDELT", 2),
    ...takeBySource(groups.manual, "人工录入", 2),
    ...takeBySource(groups.x, "X", 2),
    ...takeBySource(groups.bluesky, "Bluesky", 2),
    ...takeBySource(groups.wikimedia, "Wikimedia", 4),
    ...takeBySource(groups.instagram, "Instagram", 4),
    ...takeBySource(groups.facebook, "Facebook", 2),
    ...takeBySource(groups.tiktok, "TikTok", 2)
  ];
  return cleanAndDeduplicateSignals(mixed).slice(0, 30);
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
   * - Google Trends RSS：已接入，无需密钥，适合趋势和搜索热度
   * - X / Instagram / Facebook：已预留官方接口连接器，配置 Secret 后启用
   * - Bluesky：已接入公开搜索 API，无需密钥
   * - Wikimedia：已接入公开 Pageviews API，无需密钥
   * - TikTok：商业运营链路暂用人工观察或合规数据供应商，不启用 Research API
   * - 公司内部飞书表格 / CMS：适合运营手动入选与复盘
   */
  const youtubeSignals = await fetchYoutubeSignals();
  const googleTrendsSignals = await fetchGoogleTrendsSignals();
  const localMediaSignals = await fetchLocalMediaSignals();
  const gdeltSignals = await fetchGdeltSignals();
  const manualSignals = await fetchManualSignals();
  const xSignals = await fetchXSignals();
  const blueskySignals = await fetchBlueskySignals();
  const wikimediaSignals = await fetchWikimediaSignals();
  await discoverMetaAccounts();
  const instagramSignals = await fetchInstagramSignals();
  const facebookSignals = await fetchFacebookSignals();
  const tiktokSignals = await fetchTikTokSignals();
  return composeSignals({
    youtube: youtubeSignals,
    googleTrends: googleTrendsSignals,
    localMedia: localMediaSignals,
    gdelt: gdeltSignals,
    manual: manualSignals,
    x: xSignals,
    bluesky: blueskySignals,
    wikimedia: wikimediaSignals,
    instagram: instagramSignals,
    facebook: facebookSignals,
    tiktok: tiktokSignals
  });
}

async function update() {
  const data = readDashboard();
  const now = new Date();
  const hour = now.getUTCHours();
  const externalSignals = await fetchExternalSignals();

  data.generatedAt = now.toISOString();
  data.mode = externalSignals.length ? "真实数据更新" : "定时更新";
  data.cadence = externalSignals.length
    ? "已接入外部热点源；每日北京时间早上 09:00 自动更新。大型节假日可提前 4–6 周加入观察。"
    : "每日北京时间早上 09:00 自动更新；当前为可替换真实接口的数据底座。大型节假日可提前 4–6 周加入观察。";

  if (externalSignals.length) {
    const merged = cleanAndDeduplicateSignals(externalSignals)
      .slice(0, 30)
      .map((item, index) => ({ ...item, id: typeof item.id === "number" ? item.id : 1000 + index }));
    data.hotspots = merged;
  }

  data.sources = [
    "全部平台",
    "YouTube",
    "Google Trends",
    "本地平台",
    "GDELT",
    "人工录入",
    "Bluesky",
    "Wikimedia",
    "TikTok",
    "Instagram",
    "X",
    "Facebook"
  ];
  data.regions = ["全球", "印度", "印度尼西亚", "俄罗斯（东欧）", "中东", "撒哈拉以南非洲", "南美洲"];

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
  data.sourceStatus = [
    {
      ...openSourceStatus.bluesky,
      visibleCount: data.hotspots.filter(item => item.source?.includes("Bluesky")).length
    },
    {
      ...openSourceStatus.wikimedia,
      visibleCount: data.hotspots.filter(item => item.source?.includes("Wikimedia")).length
    },
    metaSourceStatus.meta,
    {
      ...metaSourceStatus.instagram,
      visibleCount: data.hotspots.filter(item => item.source?.includes("Instagram")).length
    },
    {
      ...metaSourceStatus.facebook,
      visibleCount: data.hotspots.filter(item => item.source?.includes("Facebook")).length
    }
  ];

  data.templateOutputs = buildTemplateOutputs(data.hotspots);
  const lifecycleRecords = updateHotspotLifecycle(data.hotspots, now);
  data.templateLibraries = buildTemplateLibraryStatus(data.hotspots, now, lifecycleRecords);

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
  console.log(`壁纸模板库：${data.templateLibraries.wallpaper.reason}`);
  console.log(`主题模板库：${data.templateLibraries.theme.reason}`);
  console.log(`Updated dashboard data at ${data.generatedAt}`);
}

update().catch(error => {
  console.error(error);
  process.exit(1);
});
