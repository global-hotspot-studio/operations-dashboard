#!/usr/bin/env node

/**
 * 长期运营数据更新器 v1
 *
 * 当前版本做两件事：
 * 1. 按固定节奏刷新热点趋势、热度、状态和汇总指标，保证线上看板是“活数据结构”。
 * 2. 已支持 YouTube Data API。配置 YOUTUBE_API_KEY 后，会按重点国家抓取 YouTube 热门视频，
 *    并映射成看板里的热点信号。
 * 3. 已支持 Google Trends RSS。无需密钥，按重点国家抓取搜索趋势和相关新闻源。
 * 4. 已支持 Google News RSS 和 GDELT 新闻源，补充本地媒体与全球新闻热度。
 * 5. 已预留 X / Instagram / Facebook / TikTok 官方接口连接器；配置对应 Secret 后自动启用。
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "dashboard.json");
const manualDataPath = path.join(root, "data", "manual-hotspots.json");
const youtubeApiKey = (process.env.YOUTUBE_API_KEY || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const xBearerToken = (process.env.X_BEARER_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const metaAccessToken = (process.env.META_ACCESS_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const instagramBusinessAccountId = (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");
const facebookPageIds = (process.env.FACEBOOK_PAGE_IDS || "").split(",").map(item => item.trim()).filter(Boolean);
const tiktokAccessToken = (process.env.TIKTOK_ACCESS_TOKEN || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");

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
  RU: ["музыка", "футбол", "кино", "мода", "сериал"]
};

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
  RU: { hl: "ru-RU", ceid: "RU:ru" }
};

function readDashboard() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeDashboard(data) {
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
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
  for (const key of ["youtube", "trends", "local", "gdelt", "manual", "x", "instagram", "facebook", "tiktok"]) {
    if (!target[key] && incoming[key]) target[key] = incoming[key];
  }
}

function cleanSignal(item) {
  const originalTitle = cleanTitle(item.originalTitle || item.name);
  const name = cleanTitle(item.name || originalTitle);
  const source = Array.isArray(item.source) ? item.source : [item.source || "未知来源"];
  const url = item.youtube?.url || item.trends?.url || item.local?.url || item.gdelt?.url || item.manual?.url || item.x?.url || item.instagram?.url || item.facebook?.url || item.tiktok?.url || "";
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
    ...(target.signals || [{ source: target.source[0], title: target.originalTitle, url: target.youtube?.url || target.trends?.url || target.local?.url || target.gdelt?.url || target.manual?.url || target.x?.url || target.instagram?.url || target.facebook?.url || target.tiktok?.url || "" }]),
    { source: incoming.source.join(" + "), title: incoming.originalTitle, url: incoming.youtube?.url || incoming.trends?.url || incoming.local?.url || incoming.gdelt?.url || incoming.manual?.url || incoming.x?.url || incoming.instagram?.url || incoming.facebook?.url || incoming.tiktok?.url || "" }
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
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/cinematic_poster.png",
    style: "强叙事、强氛围，适合影视/预告片/剧情类热点",
    playability: "可做锁屏主视觉、海报式壁纸、暗色主题套装",
    prompt: "把热点转译成电影海报式主视觉：主体明确、逆光/轮廓光、胶片颗粒、大面积留白，适合手机锁屏第一眼识别"
  },
  {
    id: "idol_comic",
    name: "偶像漫画化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/idol_comic.png",
    style: "精致、年轻、人物情绪强，适合音乐/明星/舞台类热点",
    playability: "可做自拍图生图、粉丝应援壁纸、人物主题模板",
    prompt: "将热点情绪转译成精致漫画人物与舞台氛围：妆造、服饰、灯光、色彩都围绕热点主题重组，人物保持原创或用户上传"
  },
  {
    id: "local_outfit",
    name: "本地装束化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/local_outfit.png",
    style: "地域服饰、节庆色彩、文化识别强，适合区域运营热点",
    playability: "可做本地节日主题、区域限定壁纸、人物换装玩法",
    prompt: "提取热点所在地的服饰、纹样、节庆色彩和妆造元素，生成本地化人物/场景壁纸，强调文化识别但避免刻板化"
  },
  {
    id: "american_comic",
    name: "美漫英雄化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/american_comic.png",
    style: "强表情、强动作、冲击感，适合赛事/游戏/电影热点",
    playability: "可做原创英雄角色、赛事应援、热血主题壁纸",
    prompt: "把热点转译成原创英雄式人物主视觉：夸张表情、速度线、强对比色和动态构图，不使用已有 IP 或队徽"
  },
  {
    id: "mecha_upgrade",
    name: "机甲化升级",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/mecha_upgrade.png",
    style: "科技、装备、未来感，适合游戏/科技/高能热点",
    playability: "可做 AI 变身、机甲主题、未来感壁纸套装",
    prompt: "基于热点视觉符号生成原创轻机甲造型：装备层次、能量光线、科技背景，与热点代表色融合"
  },
  {
    id: "cute_3d",
    name: "Q版3D萌化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/cute_3d.png",
    style: "亲和、可爱、社交传播强，适合泛娱乐热点",
    playability: "可做头像、贴纸、锁屏人物、轻量主题模板",
    prompt: "把热点转成 Q 版 3D 角色或萌化道具：表情夸张、材质干净、色彩明快，适合做贴纸和壁纸延展"
  },
  {
    id: "game_character",
    name: "游戏角色立绘",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/game_character.png",
    style: "角色设定、服装细节、世界观强，适合游戏/动漫/娱乐热点",
    playability: "可做角色卡、冒险主题、游戏化壁纸玩法",
    prompt: "把热点提炼成原创游戏角色立绘：服装、道具、背景和阵营色统一，突出可收藏的角色设定感"
  },
  {
    id: "art_portrait",
    name: "艺术肖像化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/art_portrait.png",
    style: "高级、艺术化、长期可沉淀，适合精品壁纸库",
    playability: "可做艺术肖像壁纸、高级主题、低版权风险模板",
    prompt: "把热点情绪转成艺术肖像/艺术场景：笔触、光影和色盘围绕热点氛围展开，适合沉淀为精品模板"
  },
  {
    id: "indonesia_local",
    name: "东南亚本地化",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/indonesia_local.png",
    style: "温暖、生活化、节庆感，适合印尼/东南亚热点",
    playability: "可做区域限定、本地活动、节庆人物壁纸",
    prompt: "结合东南亚本地服饰、城市生活、节庆色彩和自然元素，生成有亲近感的热点壁纸样图"
  },
  {
    id: "anime_clean",
    name: "清透二次元",
    category: "视觉可玩性样图",
    preview: "https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/assets/hotspot-playbook/anime_clean.png",
    style: "清透、年轻、二次元感强，适合动漫/年轻文化热点",
    playability: "可做动漫化自拍、轻二次元主题、清新锁屏壁纸",
    prompt: "把热点视觉符号转成清透二次元人物或场景：柔和天空光、干净线条、轻盈服饰和明确主题色"
  }
];

function samplesForHotspot(index) {
  if (index === 0) return visualPlaySamples.slice(0, 5);
  if (index === 1) return visualPlaySamples.slice(5, 8);
  return visualPlaySamples.slice(8, 10);
}

function samplePromptForHotspot(sample, hotspot) {
  const title = hotspot.originalTitle || hotspot.name;
  const market = hotspot.country || hotspot.region || "重点市场";
  const source = hotspot.source?.join(" + ") || "热点源";
  const visual = visualSignalFromTitle(title);
  return `基于 ${source} ${market} 实时热点《${title}》，生成「${sample.name}」样图推荐，用于给设计师做主题/壁纸玩法灵感。\n\n视觉可玩性：${sample.playability}。\n\n生成建议：${sample.prompt}；结合热点视觉方向「${visual}」，提取主体、色彩、场景、服饰/道具和情绪符号。输出 9:16 手机锁屏壁纸样图，顶部预留时钟区；画面高级、有趣、可本地化，可延展为主题商城模板；避免直接使用真实明星肖像、影视剧照、版权角色、品牌 Logo 和新闻照片。`;
}

function buildTemplateOutputs(hotspots) {
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
        sourceUrl: hotspot.youtube?.url || hotspot.trends?.url || hotspot.local?.url || hotspot.gdelt?.url || hotspot.manual?.url || "",
        generatedFrom: "daily_top3_visual_sample_recommendation"
      };
    })
  );
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
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
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

async function fetchInstagramSignals() {
  if (!metaAccessToken || !instagramBusinessAccountId) {
    console.log("META_ACCESS_TOKEN 或 INSTAGRAM_BUSINESS_ACCOUNT_ID 未配置，跳过 Instagram 真实热点抓取。");
    return [];
  }
  const tags = ["football", "music", "fashion", "festival", "art"];
  const batches = [];
  for (const tag of tags) {
    try {
      const search = new URL("https://graph.facebook.com/v19.0/ig_hashtag_search");
      search.searchParams.set("user_id", instagramBusinessAccountId);
      search.searchParams.set("q", tag);
      search.searchParams.set("access_token", metaAccessToken);
      const searchResponse = await fetch(search);
      if (!searchResponse.ok) throw new Error(`Instagram hashtag ${tag} 查询失败：${searchResponse.status} ${(await searchResponse.text()).slice(0, 160)}`);
      const hashtagId = (await searchResponse.json()).data?.[0]?.id;
      if (!hashtagId) continue;
      const media = new URL(`https://graph.facebook.com/v19.0/${hashtagId}/recent_media`);
      media.searchParams.set("user_id", instagramBusinessAccountId);
      media.searchParams.set("fields", "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count");
      media.searchParams.set("access_token", metaAccessToken);
      const mediaResponse = await fetch(media);
      if (!mediaResponse.ok) throw new Error(`Instagram media ${tag} 查询失败：${mediaResponse.status} ${(await mediaResponse.text()).slice(0, 160)}`);
      const json = await mediaResponse.json();
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
      console.warn(error.message);
    }
  }
  return batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
}

async function fetchFacebookSignals() {
  if (!metaAccessToken || !facebookPageIds.length) {
    console.log("META_ACCESS_TOKEN 或 FACEBOOK_PAGE_IDS 未配置，跳过 Facebook 真实热点抓取。");
    return [];
  }
  const batches = [];
  for (const pageId of facebookPageIds) {
    try {
      const url = new URL(`https://graph.facebook.com/v19.0/${pageId}/posts`);
      url.searchParams.set("fields", "id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true),attachments{media,url,title}");
      url.searchParams.set("limit", "8");
      url.searchParams.set("access_token", metaAccessToken);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Facebook page ${pageId} 请求失败：${response.status} ${(await response.text()).slice(0, 160)}`);
      const json = await response.json();
      batches.push(...(json.data || []).map((post, rank) => {
        const volume = Number(post.shares?.count || 0) * 3 + Number(post.reactions?.summary?.total_count || 0) + Number(post.comments?.summary?.total_count || 0) * 3;
        const title = textSnippet((post.message || post.attachments?.data?.[0]?.title || "Facebook 热点内容").replace(/\s+/g, " "), 32);
        const score = sourceScore(61, rank, volume + 1000);
        const trend = sourceTrend(23, rank, volume + 1000);
        return {
          id: `fb-${post.id}`,
          name: title,
          originalTitle: post.message || title,
          region: "全球",
          country: "全球",
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
          prompt: promptFromSocial("Facebook", post.message || title, { country: "全球" }),
          reason: `来自 Facebook Page 公开帖子，适合补充社区传播和本地媒体扩散判断。`,
          facebook: {
            pageId,
            publishedAt: post.created_time,
            url: post.permalink_url || "",
            picture: post.attachments?.data?.[0]?.media?.image?.src || ""
          }
        };
      }));
    } catch (error) {
      console.warn(error.message);
    }
  }
  return batches.sort((a, b) => b.score - a.score || b.trend - a.trend).slice(0, 8);
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
    ...takeBySource(groups.youtube, "YouTube", 10),
    ...takeBySource(groups.googleTrends, "Google Trends", 8),
    ...takeBySource(groups.localMedia, "本地平台", 8),
    ...takeBySource(groups.gdelt, "GDELT", 6),
    ...takeBySource(groups.manual, "人工录入", 6),
    ...takeBySource(groups.x, "X", 4),
    ...takeBySource(groups.instagram, "Instagram", 4),
    ...takeBySource(groups.facebook, "Facebook", 4),
    ...takeBySource(groups.tiktok, "TikTok", 4)
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
   * - X / Instagram / Facebook / TikTok：已预留官方接口连接器，配置 Secret 后启用
   * - 公司内部飞书表格 / CMS：适合运营手动入选与复盘
   */
  const youtubeSignals = await fetchYoutubeSignals();
  const googleTrendsSignals = await fetchGoogleTrendsSignals();
  const localMediaSignals = await fetchLocalMediaSignals();
  const gdeltSignals = await fetchGdeltSignals();
  const manualSignals = await fetchManualSignals();
  const xSignals = await fetchXSignals();
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
    ? "已接入外部热点源；GitHub Actions 每 6 小时自动更新。"
    : "GitHub Actions 每 6 小时自动更新；当前为可替换真实接口的数据底座。";

  if (externalSignals.length) {
    const merged = cleanAndDeduplicateSignals(externalSignals)
      .slice(0, 24)
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
    "TikTok",
    "Instagram",
    "X",
    "Facebook"
  ];

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

  data.templateOutputs = buildTemplateOutputs(data.hotspots);

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
