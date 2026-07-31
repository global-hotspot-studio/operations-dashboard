let regions = [];
let sources = [];
let hotspots = [];
let regionStats = {};
let fusionStyles = [];
let templateOutputs = [];
let themeOutputs = [];
let trendSeries = { labels: [], effective: [], template: [] };
let summary = {};
let strategyCards = [];
let funnel = [];
let dashboardMeta = {};
let state = { region: "全球", source: "全部平台", table: "all" };
let libraryFilters = { theme: "recent", wallpaper: "recent" };
let toastTimer;
const languageState = {
  current: localStorage.getItem("trendos-language") === "en" ? "en" : "zh"
};
const originalTextByNode = new WeakMap();
const originalAttrsByNode = new WeakMap();
const EN_TEXT = {
  "语言切换": "Language switch",
  "本地热点机会中心": "Local Hotspot Opportunity Center",
  "总览": "Overview", "实时热点池": "Live Hotspots", "趋势监测": "Trend Monitor",
  "爆发预警": "Surge Alerts", "运营候选": "Creative Candidates", "配置中心": "Configuration",
  "机器人监测中": "Monitoring active", "12 个数据源 · 15 分钟更新": "12 sources · updates every 15 minutes",
  "本地热点机会中心": "Local Trend Opportunity Center",
  "从海量信号中识别可模板化机会，驱动内容生产、分发与复盘": "Turn local signals into reusable creative opportunities for production, distribution and review",
  "定时更新": "Scheduled updates", "读取数据中…": "Loading data…", "↻ 拉取最新": "↻ Refresh",
  "查看运营候选": "View candidates", "地区": "Region", "全球": "Global", "时间": "Time",
  "近 24 小时": "Last 24 hours", "近 7 天": "Last 7 days", "近 30 天": "Last 30 days",
  "平台": "Platform", "全部平台": "All platforms",
  "筛选逻辑：持续热度 × 视觉符号 × 正向情绪 × 可个性化": "Filter logic: sustained interest × visual cues × positive sentiment × personalization",
  "热点趋势": "Trend Momentum", "近 24 小时有效热点数量变化": "Valid hotspot volume over the last 24 hours",
  "有效热点": "Valid hotspots", "可转模板": "Template-ready",
  "按增速和跨平台共振识别": "Detected by growth and cross-platform resonance",
  "实时热点池": "Live Hotspot Pool", "按主题可玩性排序；平台数据、热点动能与可玩性均有明确口径": "Ranked by creative playability, with clear definitions for reach, momentum and theme potential",
  "全部": "All", "可预测": "Predictable", "实时": "Live", "排名": "Rank", "热点事件": "Hotspot",
  "主要来源": "Primary source", "平台数据": "Platform reach", "热点动能": "Momentum",
  "主题可玩性": "Theme potential", "状态": "Status", "运营动作": "Action",
  "主题样图": "Theme Previews",
  "沉淀节假日与长线热点的整套主题方向：从壁纸提取色彩与符号，同步生成锁屏、图标与 Dock，便于设计师直接延展为主题资产。": "Curated theme systems for cultural moments and long-running trends, extending wallpaper colors and symbols into lock screens, icons and the Dock.",
  "复制提示词": "Copy prompt", "下载样图": "Download sample", "下载壁纸": "Download wallpaper",
  "已复制": "Copied", "节日主题": "Cultural theme", "图标同源生成": "Matching icon system",
  "尊重表达": "Respectful expression", "纸艺质感": "Paper craft", "低饱和节庆": "Soft festive palette",
  "排灯节主题": "Diwali theme", "印度灯饰": "Indian festive lanterns",
  "提前 4–6 周": "Plan 4–6 weeks ahead", "壁纸 + Dock": "Wallpaper + Dock", "暖金紫调": "Warm gold & plum",
  "明亮节庆": "Bright celebration", "锁屏 + 图标": "Lock screen + icons", "红金庆典": "Red-gold celebration",
  "拱券金属": "Arched metalwork", "红黄胜利色": "Victory red & saffron", "暖阳拱廊": "Sunlit arcades",
  "瓷釉留白": "Porcelain minimalism", "钴蓝笔触": "Cobalt brushwork", "清冷光影": "Cool light",
  "珍珠母贝": "Mother of pearl", "沙海留白": "Desert minimalism", "低饱和奢感": "Quiet luxury",
  "皂石材质": "Soapstone texture", "地形曲线": "Topographic curves", "自然手作": "Natural craft",
  "基西皂石": "Kisii soapstone", "手工雕刻": "Hand carving",
  "靛蓝织物": "Indigo textile", "单线构成": "Single-line geometry", "都会质感": "Urban refinement",
  "约鲁巴 Adire": "Yoruba Adire", "防染几何": "Resist-dyed geometry",
  "陶土材质": "Terracotta texture", "现代曲线": "Modern curves", "本地手作": "Local craft", "手作节奏": "Craft rhythm", "区域灵感": "Regional inspiration",
  "夜庭光影": "Moonlit courtyard", "矿物石灰": "Mineral limestone", "克制黄铜": "Restrained brass",
  "热点top3样图推荐": "Top 3 Hotspot Inspirations",
  "先判断热点属性，再选择人物图生图或可直接下载的 OS 壁纸；壁纸可延展为色彩材质、涂鸦插画、异形构图、场景、图标化或动态感主题，不可玩则不更新。": "Assess each hotspot first, then recommend character treatments or downloadable OS wallpapers across materials, illustration, composition, scenes, iconography and motion. No update when the idea is not visually playable.",
  "运营配置中心": "Operations Configuration",
  "管理重点市场、平台数据源和热点筛选规则，让运营判断可追溯。": "Manage priority markets, platform sources and screening rules with a traceable operating logic.",
  "抓取与筛选规则": "Capture & Screening Rules",
  "只将持续热度、强视觉符号且能转为 OS 主题的话题送入样图推荐。": "Only sustained, visually distinctive topics that can become OS themes enter sample recommendations.",
  "抓取节奏": "Capture cadence", "预测与实时双轨": "Predictable + real-time",
  "可预测热点提前 4–6 周准备，提前一周定模板，提前三天上线；实时热点由机器人定时监测。": "Prepare predictable moments 4–6 weeks ahead, lock templates one week ahead and launch three days ahead; bots monitor real-time trends.",
  "核心地区": "Priority regions", "区域热点池优先": "Local baselines first",
  "两印、EE1（俄罗斯）、中东、SSA、拉美建立独立热度基线，避免全球热度掩盖本地机会。": "Maintain independent baselines for India, Indonesia, EE1 (Russia), the Middle East, SSA and Latin America so global volume does not hide local opportunities.",
  "平台来源": "Platform sources", "跨平台交叉验证": "Cross-platform validation",
  "筛选标准": "Screening criteria", "只留可模板化机会": "Keep template-ready opportunities",
  "具备持续热度、强视觉符号、正向情绪、可个性化四项特征，才进入运营候选池。": "Candidates must show sustained interest, strong visual cues, positive sentiment and personalization potential.",
  "进入 AIGC 的决策漏斗": "AIGC Decision Funnel", "每个环节都有明确的淘汰理由": "Every stage has an explicit rejection reason",
  "原始话题": "Raw topics", "持续热点": "Sustained trends", "视觉符号明确": "Clear visual cues",
  "可个性化": "Personalizable", "进入模板生产": "Enter template production",
  "数据已更新": "Data updated", "可预测热点": "Predictable hotspot", "实时热点": "Real-time hotspot",
  "真实来源": "Verified source", "为什么值得转模板？": "Why is it template-worthy?", "多源信号": "Multi-source signals",
  "持续性热度": "Sustained interest", "强视觉符号": "Strong visual cues", "正向情绪": "Positive sentiment",
  "通过": "Pass", "加入候选并转模板": "Add candidate & create template", "已加入运营候选": "Added to candidates",
  "内部辅助判断": "Internal aid", "正在升温": "Heating up", "持续关注": "Keep watching", "建议观察": "Monitor",
  "高": "High", "中": "Medium", "低": "Low", "爆发": "Surging", "上升": "Rising", "观察": "Monitor",
  "已入选": "Selected", "加入候选": "Add candidate", "提示词已复制，可直接粘贴使用": "Prompt copied and ready to paste",
  "主题提示词已复制，可直接粘贴使用": "Theme prompt copied and ready to paste",
  "样图已开始下载": "Sample download started", "数据读取失败": "Data load failed",
  "数据读取失败，请稍后再试": "Data load failed. Please try again.", "✓ 已拉取": "✓ Updated",
  "读取中…": "Loading…", "已读取线上最新数据": "Latest online data loaded",
  "印度": "India", "印度尼西亚": "Indonesia", "俄罗斯（东欧）": "Russia (EE1)",
  "撒哈拉以南非洲": "Sub-Saharan Africa", "南美洲": "South America", "南美": "South America",
  "肯尼亚": "Kenya", "尼日利亚": "Nigeria", "巴西": "Brazil", "阿根廷": "Argentina",
  "加拿大": "Canada", "南非": "South Africa", "本地平台": "Local platform",
  "长线热点 · 世界杯冠军": "Long-running · World Cup champion",
  "冠军之夜": "Champions’ Night",
  "以深酒红、鎏金拱券与暖琥珀光粒构建高定庆典氛围；壁纸、图标与 Dock 统一为红漆、金属浮雕和拱形结构。": "A couture celebration in deep wine red, gilded arches and warm amber light, unifying wallpaper, icons and Dock through lacquer, embossed metal and arched forms.",
  "长线热点 · 西班牙夺冠": "Long-running · Spain victory",
  "伊比利亚胜光": "Iberian Victory Glow",
  "以番红、暖红与金色丝缎营造胜利日出的高光；抽象拱廊、飘彩与同源图标共同形成更明亮、更具西班牙气质的主题资产。": "Saffron, warm red and golden silk evoke a victorious sunrise, with abstract arcades, festive color and matching icons creating a brighter Iberian character.",
  "固定节日 · 印度": "Cultural moment · India",
  "万寿金辉": "Marigold Radiance",
  "以万寿菊、diya 灯盏与兰戈里纹样形成深色排灯节主题；壁纸与图标共用藏青、金色与藏红色体系，避免误用象神节名称。": "Marigolds, diya lamps and rangoli create a dark Diwali system in indigo, gold and crimson across wallpaper and icons.",
  "花叶晨光": "Petals at Dawn",
  "以 diya 灯盏、手工纸、浅杏、苔绿与柔和兰戈里纹样形成轻盈的排灯节晨间版本，适合年轻化与低饱和主题资产。": "A light morning Festival of Lights direction using diya lamps, handmade paper, pale apricot, moss green and soft rangoli for a youthful low-saturation theme.",
  "灯火绽放": "Lights in Bloom",
  "以 diya 灯盏、花朵、焰火与夜色渐变形成温暖的排灯节主题；同一套纹样可扩展至动态壁纸、锁屏与高频图标。": "Diya lamps, flowers, fireworks and a night gradient create a warm Diwali system that can extend into live wallpaper, lock screen and high-frequency icons.",
  "花灯晴空": "Lantern Daylight",
  "以珊瑚、蜜桃与淡紫纸艺花朵，搭配印度 akash kandil 装饰灯、diya 灯盏和兰戈里纹样，形成明亮亲和的排灯节版本。": "Coral, peach and lilac paper flowers pair with Indian akash kandil lanterns, diya lamps and rangoli for a brighter Diwali direction.",
  "本地文化 · EE1 / 俄罗斯": "Local culture · EE1 / Russia",
  "瓷白静境": "Porcelain Quiet",
  "以瓷白、钴蓝笔触与冬日桦影构成清冷留白；釉面、半透明玻璃与银灰细节形成克制、安静的现代质感。": "Porcelain white, cobalt brushwork and winter birch shadows create cool negative space, with glaze, translucent glass and silver-grey detail adding quiet modern refinement.",
  "本地文化 · 海湾地区": "Local culture · Gulf region",
  "沙海珍珠": "Desert Pearl",
  "以矿物沙色、珍珠母贝和一抹海湾青回应巴林、卡塔尔等海湾地区的采珠与航海传统；柔和沙丘曲线与细腻反光营造安静奢感。": "Mineral sand, mother-of-pearl and Gulf turquoise reference the pearling and seafaring heritage of places such as Bahrain and Qatar through soft dune curves and quiet luxury.",
  "海湾采珠": "Gulf pearling",
  "本地文化 · SSA / 肯尼亚": "Local culture · SSA / Kenya",
  "以肯尼亚西部基西与塔巴卡地区的皂石雕刻为灵感，采用皂石米白、茶园绿和手工磨刻纹理；通过现代留白呈现温润的本地手作感。": "Inspired by soapstone carving from Kisii and Tabaka in western Kenya, using soapstone ivory, tea green and hand-carved texture with modern negative space.",
  "本地文化 · SSA / 尼日利亚": "Local culture · SSA / Nigeria",
  "阿迪雷靛蓝": "Adire Indigo",
  "以尼日利亚西南部约鲁巴 Adire 防染布为灵感，用深靛蓝、粉笔白与低调黄铜呈现几何防染纹样，并保留当代都市的简约节奏。": "Inspired by Yoruba Adire resist-dyed cloth from southwestern Nigeria, using deep indigo, chalk white and restrained brass with geometric resist patterns and a contemporary urban rhythm.",
  "本地文化 · 南美 / 现代陶土": "Local culture · South America / Modern clay",
  "现代陶土": "Modern Terracotta",
  "从南美现代建筑与手工陶艺中提取陶土、奶油白、钴蓝与圆润弧面，结合手塑纹理和阳光感层次，形成温暖、简约且富有地域气息的现代主题。": "Drawing from South American modern architecture and handmade ceramics, terracotta, cream, cobalt and rounded forms combine with hand-shaped texture and sunlit depth in a warm, minimal theme with a strong sense of place.",
  "海湾夜庭": "Gulf Night Courtyard",
  "以深靛蓝、月光石灰岩和少量黄铜塑造当代海湾夜庭；几何光影与珍珠微光克制点缀，呈现建筑感与安静奢华。": "Deep indigo, moonlit limestone and restrained brass shape a contemporary Gulf courtyard, where geometric light and pearl-like highlights suggest quiet architectural luxury.",
  "更新时间未知": "Update time unavailable",
  "点击跳转到平台原页面": "Open the original platform page",
  "真实来源 ↗": "Verified source ↗",
  "抓取热点": "Captured hotspots", "高优先级需响应": "High-priority response",
  "模板候选": "Theme candidates", "可进入 AIGC 工作流": "Ready for the AIGC workflow",
  "当前筛选条件下暂无热点": "No hotspots match the current filters",
  "已加入本地候选": "Added to local candidates", "已移出本地候选": "Removed from local candidates",
  "直接可用壁纸": "Ready-to-use wallpaper", "锁屏时间留白": "Lock-screen time clearance",
  "可下载": "Downloadable", "人物图生图": "Character image-to-image",
  "人物风格模板": "Character style template", "人物风格": "Character style",
  "图生图": "Image-to-image", "自拍转主题": "Selfie-to-theme",
  "色彩/材质": "Color / material", "色彩主题": "Color theme",
  "锁屏 + AOD": "Lock screen + AOD", "图标色板": "Icon palette",
  "异形/材质": "Shape / material", "异形主视觉": "Distinctive composition",
  "材质主题": "Material theme", "图标延展": "Icon extension",
  "涂鸦/插画": "Doodle / illustration", "插画涂鸦": "Illustrated doodle",
  "动态感": "Motion-inspired", "本地化纹样": "Localized pattern",
  "海报": "Poster", "海报主视觉": "Poster key visual",
  "锁屏壁纸": "Lock-screen wallpaper", "氛围套装": "Atmosphere system",
  "视觉玩法": "Visual concept", "主题模板": "Theme template", "设计灵感": "Design inspiration",
  "搜索趋势": "Search trend", "Google Trends 搜索趋势": "Google Trends search interest",
  "Instagram 视觉趋势": "Instagram visual trend", "Facebook 公开内容": "Facebook public content",
  "TikTok 短视频趋势": "TikTok short-video trend", "X 实时讨论": "Live discussion on X",
  "本地媒体": "Local media", "本地媒体 / 新闻源": "Local media / news",
  "GDELT 全球新闻": "GDELT global news", "GDELT 全球新闻数据库": "GDELT global news database",
  "人工录入": "Manual entry", "运营人工录入": "Operations manual entry",
  "暂未接入真实跳转": "Verified link not yet connected",
  "玩法方向": "Creative direction", "专题": "Collection", "热点样图推荐": "Hotspot inspiration",
  "YouTube 公开数据": "YouTube public data", "Google Trends 相对信号": "Google Trends relative signal",
  "待接入": "Pending connection", "色彩 / 构图": "Color / composition",
  "有效热点 / 近 24 小时": "Valid hotspots / last 24 hours"
};

function toEnglishText(value = "") {
  const text = String(value).trim();
  if (!text) return text;
  if (EN_TEXT[text]) return EN_TEXT[text];
  const rules = [
    [/^更新于 (.+)$/, "Updated $1"],
    [/^当前 (\d+) 个运营候选$/, "$1 current candidates"],
    [/^(\d+) 个运营候选$/, "$1 candidates"],
    [/^(\d+) 套主题$/, "$1 themes"],
    [/^(\d+) 个样图推荐$/, "$1 sample recommendations"],
    [/^(\d+) 个高优先级$/, "$1 high priority"],
    [/^播放量 (.+)$/, "Views $1"],
    [/^搜索热度 (.+)$/, "Search interest $1"],
    [/^内部辅助判断 · (\d+)\/100$/, "Internal aid · $1/100"],
    [/^有效率 (.+)$/, "Valid rate $1"],
    [/^较上轮 \+(\d+)%$/, "+$1% vs previous run"],
    [/^打开 (.+) 原始内容$/, "Open original on $1"]
  ];
  for (const [pattern, replacement] of rules) if (pattern.test(text)) return text.replace(pattern, replacement);
  return text;
}

function localized(value) {
  return languageState.current === "en" ? toEnglishText(value) : value;
}

function applyLanguage(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue.trim() || ["SCRIPT", "STYLE"].includes(node.parentElement?.tagName)) continue;
    if (!originalTextByNode.has(node)) originalTextByNode.set(node, node.nodeValue);
    const original = originalTextByNode.get(node);
    if (languageState.current === "zh") node.nodeValue = original;
    else {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${toEnglishText(original)}${trailing}`;
    }
  }
  root.querySelectorAll?.("[aria-label],[title],[placeholder]").forEach(element => {
    if (!originalAttrsByNode.has(element)) {
      const values = {};
      ["aria-label", "title", "placeholder"].forEach(name => {
        if (element.hasAttribute(name)) values[name] = element.getAttribute(name);
      });
      originalAttrsByNode.set(element, values);
    }
    const values = originalAttrsByNode.get(element);
    Object.entries(values).forEach(([name, value]) => {
      element.setAttribute(name, languageState.current === "en" ? toEnglishText(value) : value);
    });
  });
  document.documentElement.lang = languageState.current === "en" ? "en" : "zh-CN";
  document.title = languageState.current === "en" ? "Local Hotspot Opportunity Center" : "本地热点机会中心";
  $$(".language-option").forEach(button => {
    button.textContent = button.dataset.language === "zh" ? "中文" : "EN";
    const active = button.dataset.language === languageState.current;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setLanguage(language) {
  languageState.current = language === "en" ? "en" : "zh";
  localStorage.setItem("trendos-language", languageState.current);
  applyLanguage();
}

const themePrompts = {
  worldcupChampionAfterglow: "Premium Spain-victory inspired OS theme artwork: deep wine red, amber gold, warm night-plaza arches, subtle red-and-gold confetti and celebratory light. Reskin wallpaper and icon family in one coherent scarlet lacquer, soft ceramic and gold-metal language; rich, warm and refined. Avoid literal national symbols. No flags, coats of arms, footballs, trophies, team crests, official tournament marks, brands, text or watermarks.",
  worldcupChampionDawn: "Premium Spain-victory inspired OS theme artwork: saffron yellow, cardinal red and gilded silk-like waves, warm terracotta plaza glow, abstract decorative arches and a soft golden sunburst. Reskin wallpaper and icon family in one coherent enamel-red, saffron ceramic and brushed-gold language; bright, proud and refined. Avoid literal national symbols. No flags, coats of arms, footballs, trophies, team crests, official tournament marks, brands, text or watermarks.",
  worldcup: "Premium editorial wallpaper artwork inspired by a generic international football championship night: midnight navy atmosphere, an abstract glowing football orbit, restrained cyan light ribbons and gold confetti, cinematic stadium depth and a calm focal point. Sophisticated metallic light, deep contrast, clean composition. No official tournament logos, flags, team crests, player likenesses, brands, text or watermarks.",
  worldcupOrbit: "Cinematic abstract artwork inspired by a generic football championship final: a silver-blue football orbit suspended in a midnight sky, cool luminous ribbons, distant trophy-like silhouette and black, silver, cyan metallic textures. Spacious composition, refined light and premium editorial finish. No official logos, flags, team crests, player faces, brands, text or watermarks.",
  diwaliMarigold: "Premium dark Diwali artwork inspired by Indian Festival of Lights traditions: dense marigold garlands, glowing clay diya lamps, rangoli geometry and deep indigo night tones with muted gold and crimson accents. Rich layered craft texture, balanced negative space and a refined contemporary Indian festive aesthetic. No deity imagery, religious text, brands, official logos or watermark.",
  ganeshPaper: "Refined non-literal Ganesh festival artwork in a handmade paper-cut and soft ceramic style: pale apricot, moss green, marigold petals, layered leaves, warm lamp glow and delicate rangoli lines. Gentle morning light, tactile paper grain, subtle shadows, calm airy composition and contemporary Indian craft sensibility. No religious text, brands, watermark or literal deity face or statue.",
  diwali: "Premium Diwali / Festival of Lights artwork: glowing diya lamps, elegant rangoli geometry, flower petals and gentle fireworks emerging from an indigo-to-plum night atmosphere. Warm gold highlights, luminous depth, refined festive energy and a clean editorial composition. No brands, religious text, watermark or official logos.",
  diwaliPaper: "Refined low-saturation Diwali artwork in handmade paper and soft ceramic: pale apricot, moss green, marigold petals, layered leaves, warm clay diya lamps and subtle rangoli lines. Delicate craft detail, generous negative space and optimistic morning light. No deity imagery, religious text, brands, official logos or watermark.",
  diwaliDaylight: "Bright contemporary Indian Diwali artwork in soft paper-cut and luminous ceramic: coral, peach, lilac and warm gold; Indian akash kandil decorative lanterns, clay diya lamps, rangoli geometry and marigold details. Keep the composition airy, joyful and distinctly Indian rather than East Asian. No deity imagery, religious text, brands, official logos or watermark.",
  russiaPorcelain: "Minimal premium artwork inspired by Russian porcelain and winter birch light: warm porcelain white, restrained cobalt-blue brushwork, a few frosted silver accents and generous quiet negative space. Use translucent glazed ceramic, delicate hand-painted lines and calm cool daylight; refined, modern and uncluttered. No flags, coats of arms, brands, text or watermarks.",
  gulfDesertPearl: "Minimal premium Gulf-inspired artwork using mineral sand, pearl shell, limestone white and one restrained accent of sea turquoise. Create soft dune-like curves, nacre reflections and warm late-afternoon light with spacious composition and quiet contemporary luxury. No landmarks, flags, religious symbols, brands, text or watermarks.",
  kenyaKisiiSoapstone: "Minimal premium Kenya artwork inspired specifically by Kisii and Tabaka soapstone carving from western Kenya. Use carved soapstone ivory, tea-leaf green and warm earth tones with tactile hand-cut surfaces, rounded sculptural forms and generous negative space. Keep the local craft reference specific and contemporary; no Rift Valley claim, wildlife clichés, flags, brands, text or watermarks.",
  nigeriaAdireIndigo: "Minimal premium Nigeria artwork inspired specifically by Yoruba Adire resist-dyed cloth from southwestern Nigeria. Use deep indigo, chalk white and restrained brass with subtle resist-dyed geometric blocks, hand-marked rhythm and a contemporary urban composition. No flags, literal national emblems, brands, text or watermarks.",
  southAmericaModernClay: "Minimal contemporary artwork inspired by South American modern design rather than presented as a traditional regional culture. Use terracotta, cream plaster, muted cobalt and sun-warmed modernist curves with hand-shaped clay texture, architectural arcs and spacious composition. No culture-specific claims, landmarks, flags, brands, text or watermarks.",
  gulfNightCourtyard: "Minimal premium Gulf night courtyard artwork using deep indigo, moonlit limestone, smoky olive and restrained brushed brass. Create quiet plaster planes, a narrow pool of cool light, soft geometric shadows and subtle pearl-like highlights; serene, architectural and luxurious. No landmarks, flags, religious symbols, brands, text or watermarks.",
  indiaIndependenceKhadi: "Complete premium Android OS home-screen theme for India Independence season: preserve a full desktop UI with status bar, clock widget, AI Suggestions widget, labeled icons, Dock and search bar. Use handwoven khadi-like texture, warm ivory, restrained saffron, deep green and indigo, abstract dawn curves and architectural arches; every wallpaper, widget, icon and Dock element must use one coherent material system. Avoid literal flags, national emblems, political figures, religious imagery, brands, extra text and watermark.",
  indonesiaIndependenceArchipelago: "Complete premium Android OS home-screen theme for Indonesia Independence season: preserve a full desktop UI with status bar, clock widget, AI Suggestions widget, labeled icons, Dock and search bar. Use coral red, warm ivory, volcanic charcoal, ocean teal, woven fiber and brushed brass, with archipelago dawn and sea-flow curves; every wallpaper, widget, icon and Dock element must use one coherent material system. Avoid literal flags, Garuda, maps, official emblems, copied batik patterns, religious imagery, brands, extra text and watermark.",
  brazilIndependenceCerrado: "Complete premium Android OS home-screen theme for Brazil Independence season: preserve a full desktop UI with status bar, clock widget, AI Suggestions widget, labeled icons, Dock and search bar. Use Brazilian modernist curves, cerrado dawn, Atlantic teal, mineral forest green, golden ochre, limestone cream and a small jacaranda violet accent; unify wallpaper, widgets, icons and Dock in one tactile stone, ceramic, fiber and brushed-metal system. Avoid literal flags, coat of arms, maps, political figures, football-team branding, carnival clichés, sacred patterns, brands, extra text and watermark."
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

async function loadDashboardData(force = false) {
  const stamp = Date.now();
  const remoteUrls = [
    `https://raw.githubusercontent.com/global-hotspot-studio/operations-dashboard/main/data/dashboard-playbook.json?t=${stamp}`,
    `https://raw.githubusercontent.com/global-hotspot-studio/operations-dashboard/main/data/dashboard.json?t=${stamp}`,
    `https://cdn.jsdelivr.net/gh/global-hotspot-studio/operations-dashboard@main/data/dashboard.json?t=${stamp}`
  ];
  const localUrls = [
    `./data/dashboard-playbook.json?t=${stamp}${force ? "&force=1" : ""}`,
    `./data/dashboard.json?t=${stamp}${force ? "&force=1" : ""}`
  ];
  const localPreview = ["localhost", "127.0.0.1"].includes(location.hostname);
  const urls = localPreview ? [...localUrls, ...remoteUrls] : [...remoteUrls, ...localUrls];
  let data;
  let loadedFrom = "";
  const errors = [];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      data = await response.json();
      loadedFrom = url;
      break;
    } catch (error) {
      errors.push(`${url}: ${error.message || error}`);
    }
  }
  if (!data) throw new Error(`数据读取失败；已尝试 ${urls.length} 个地址。${errors.join(" | ")}`);

  // 壁纸模板库由按可玩性触发的 AI 生图批次单独维护，不能被每日热点刷新覆盖。
  const sampleManifestGroups = [
    [
      `./data/generated-wallpapers.json?t=${stamp}${force ? "&force=1" : ""}`,
      `https://raw.githubusercontent.com/global-hotspot-studio/operations-dashboard/main/data/generated-wallpapers.json?t=${stamp}`
    ],
    [
      `./data/generated-samples.json?t=${stamp}${force ? "&force=1" : ""}`,
      `https://raw.githubusercontent.com/global-hotspot-studio/operations-dashboard/main/data/generated-samples.json?t=${stamp}`
    ]
  ];
  const wallpaperSamples = [];
  for (const urls of sampleManifestGroups) {
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const sampleBatch = await response.json();
        if (sampleBatch.releaseStatus && sampleBatch.releaseStatus !== "ready") continue;
        if (!Array.isArray(sampleBatch.samples) || !sampleBatch.samples.length) continue;
        wallpaperSamples.push(...sampleBatch.samples.map(sample => ({
          ...sample,
          libraryType: "wallpaper",
          generatedAt: sample.generatedAt || sampleBatch.generatedAt || ""
        })));
        if (!data.wallpaperBatchGeneratedAt || Date.parse(sampleBatch.generatedAt || "") > Date.parse(data.wallpaperBatchGeneratedAt || "")) {
          data.samplePolicy = sampleBatch.policy || "";
          data.wallpaperBatchGeneratedAt = sampleBatch.generatedAt || "";
          data.wallpaperBatchCadence = sampleBatch.cadence || "";
        }
        break;
      } catch (error) {
        // 当前地址不可用时继续尝试同一清单的线上备份。
      }
    }
  }
  if (wallpaperSamples.length) {
    data.templateOutputs = [...new Map(wallpaperSamples.map(sample => [sample.id, sample])).values()];
  }

  // 主题模板库独立于壁纸模板库，更新节奏更慢。
  const themeUrls = [
    `./data/generated-themes.json?t=${stamp}${force ? "&force=1" : ""}`,
    `https://raw.githubusercontent.com/global-hotspot-studio/operations-dashboard/main/data/generated-themes.json?t=${stamp}`
  ];
  for (const url of themeUrls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const themeBatch = await response.json();
      if (Array.isArray(themeBatch.themes) && themeBatch.themes.length) {
        data.themeOutputs = themeBatch.themes.map(theme => ({
          ...theme,
          libraryType: "theme",
          generatedAt: theme.generatedAt || themeBatch.generatedAt || ""
        }));
        data.themePolicy = themeBatch.policy || "";
        data.themeBatchGeneratedAt = themeBatch.latestGeneratedAt || themeBatch.generatedAt || "";
        data.themeBatchCadence = themeBatch.cadence || "";
        break;
      }
    } catch (error) {
      // 主题库不可用时保留页面结构，不影响实时热点和壁纸库。
    }
  }

  dashboardMeta = data;
  dashboardMeta.dataUrl = loadedFrom;
  regions = data.regions || ["全球"];
  sources = data.sources || ["全部平台"];
  hotspots = data.hotspots || [];
  templateOutputs = data.templateOutputs || [];
  themeOutputs = data.themeOutputs || [];
  regionStats = data.regionStats || {};
  fusionStyles = data.fusionStyles || [];
  trendSeries = data.trendSeries || trendSeries;
  summary = data.summary || {};
  strategyCards = data.strategyCards || [];
  funnel = data.funnel || [];

  updateDataStatus();
}

function formatUpdateTime(iso) {
  if (!iso) return "更新时间未知";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "更新时间未知";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateDataStatus() {
  $("#lastUpdated").textContent = `更新于 ${formatUpdateTime(dashboardMeta.generatedAt)}`;
  $("#dataMode").textContent = dashboardMeta.mode || "定时更新";
  $("#liveStatus").textContent = "筛选逻辑：持续热度 × 视觉符号 × 正向情绪 × 可个性化";
}

function initSelects() {
  $("#regionFilter").innerHTML = regions.map(x => `<option value="${escapeAttr(x)}">${x}</option>`).join("");
  $("#sourceFilter").innerHTML = sources.map(x => `<option value="${escapeAttr(x)}">${x}</option>`).join("");
  $("#regionFilter").value = state.region;
  $("#sourceFilter").value = state.source;
}

function filtered() {
  return hotspots.filter(h =>
    (state.region === "全球" || h.region === state.region) &&
    (state.source === "全部平台" || h.source.includes(state.source)) &&
    (state.table === "all" || h.type === state.table || (state.table === "candidates" && h.selected))
  );
}

function escapeAttr(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value = "") {
  return escapeAttr(value).replaceAll("'", "&#39;");
}

function getPlatformUrl(h, source) {
  if (source === "YouTube" && h.youtube?.url) return h.youtube.url;
  if (source === "Instagram" && h.instagram?.url) return h.instagram.url;
  if (source === "TikTok" && h.tiktok?.url) return h.tiktok.url;
  if (source === "Google Trends" && h.trends?.url) return h.trends.url;
  if (source === "X" && h.x?.url) return h.x.url;
  if (source === "Facebook" && h.facebook?.url) return h.facebook.url;
  if (source === "本地平台" && h.local?.url) return h.local.url;
  if (source === "GDELT" && h.gdelt?.url) return h.gdelt.url;
  if (source === "人工录入" && h.manual?.url) return h.manual.url;
  return "";
}

function getPrimarySource(h) {
  const source = h.source.find(s => getPlatformUrl(h, s));
  return source ? { source, url: getPlatformUrl(h, source) } : { source: h.source[0] || "待接入", url: "" };
}

function getSourceVisual(h, source) {
  if (source === "YouTube") {
    return {
      image: h.youtube?.thumbnail || "",
      label: h.youtube?.channelTitle || "点击跳转到平台原页面"
    };
  }
  if (source === "Google Trends") {
    return {
      image: h.trends?.picture || "",
      label: h.trends?.newsSource ? `${h.trends.newsSource} · 搜索趋势` : "Google Trends 搜索趋势"
    };
  }
  if (source === "Instagram") {
    return {
      image: h.instagram?.mediaUrl || "",
      label: h.instagram?.hashtag ? `#${h.instagram.hashtag} · Instagram` : "Instagram 视觉趋势"
    };
  }
  if (source === "Facebook") {
    return {
      image: h.facebook?.picture || "",
      label: h.facebook?.pageId ? `${h.facebook.pageId} · Facebook` : "Facebook 公开内容"
    };
  }
  if (source === "TikTok") {
    return {
      image: h.tiktok?.thumbnail || "",
      label: h.tiktok?.username ? `@${h.tiktok.username} · TikTok` : "TikTok 短视频趋势"
    };
  }
  if (source === "X") {
    return {
      image: "",
      label: h.x?.username ? `@${h.x.username} · X 实时讨论` : "X 实时讨论"
    };
  }
  if (source === "本地平台") {
    return {
      image: h.local?.picture || "",
      label: h.local?.sourceName ? `${h.local.sourceName} · 本地媒体` : "本地媒体 / 新闻源"
    };
  }
  if (source === "GDELT") {
    return {
      image: h.gdelt?.picture || "",
      label: h.gdelt?.domain ? `${h.gdelt.domain} · GDELT 全球新闻` : "GDELT 全球新闻数据库"
    };
  }
  if (source === "人工录入") {
    return {
      image: h.manual?.picture || "",
      label: h.manual?.sourceName ? `${h.manual.sourceName} · 运营人工录入` : "运营人工录入"
    };
  }
  return { image: "", label: "点击跳转到平台原页面" };
}

function sourceTags(h) {
  return h.source.map(source => {
    const url = getPlatformUrl(h, source);
    if (!url) return `<span class="source-pill pending" title="${source} 暂未接入真实跳转">${source}</span>`;
    return `<a class="source-pill source-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" title="打开 ${source} 原始内容">${source} ↗</a>`;
  }).join("");
}

function signalList(h) {
  if (!Array.isArray(h.signals) || !h.signals.length) return "";
  return `<h3>多源信号</h3><div class="signal-list">${h.signals.slice(0, 4).map(signal => {
    const body = `<span>${signal.source}</span><b>${signal.title}</b>`;
    return signal.url
      ? `<a href="${escapeAttr(signal.url)}" target="_blank" rel="noopener noreferrer">${body}<i>↗</i></a>`
      : `<div>${body}</div>`;
  }).join("")}</div>`;
}

function hotspotTitle(h) {
  const primary = getPrimarySource(h);
  if (!primary.url) return h.name;
  return `<a class="hotspot-title-link" href="${escapeAttr(primary.url)}" target="_blank" rel="noopener noreferrer" title="打开 ${primary.source} 原始内容">${h.name}</a>`;
}

function previewDownloadName(item) {
  if (item.preview?.startsWith("data:image/svg+xml")) return `${item.id || "template-preview"}.svg`;
  return item.preview?.split("/").pop() || `${item.id || "template-preview"}.png`;
}

function sampleName(item) {
  return String(item.previewTitle || "").split("｜").pop() || "玩法方向";
}

function topRankLabel(item) {
  const match = String(item.previewMeta || "").match(/Top\d/);
  if (match) return match[0];
  return String(item.previewMeta || "").includes("专题") ? "专题" : "Top";
}

function visualPalette(index) {
  const palettes = [
    ["#101827", "#d8b56d", "#6f4b2a"],
    ["#141f3d", "#7dd3fc", "#a78bfa"],
    ["#17221a", "#22c55e", "#facc15"],
    ["#25131f", "#fb7185", "#f97316"],
    ["#101827", "#38bdf8", "#64748b"],
    ["#211338", "#c084fc", "#f9a8d4"],
    ["#14213d", "#fca311", "#e5e5e5"],
    ["#102a43", "#2dd4bf", "#fef3c7"],
    ["#301014", "#f43f5e", "#f59e0b"],
    ["#0f172a", "#60a5fa", "#34d399"]
  ];
  return palettes[index % palettes.length];
}

function promptTextDownload(item) {
  const text = [
    item.previewTitle || "热点样图推荐",
    "",
    item.previewMeta || "",
    "",
    item.prompt || ""
  ].join("\n");
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

function playTags(item) {
  const meta = String(item.previewMeta || "");
  if (item.assetType === "direct-wallpaper") return ["直接可用壁纸", "锁屏时间留白", "可下载"];
  if (meta.includes("人物图生图") || meta.includes("人物风格模板")) return ["人物风格", "图生图", "自拍转主题"];
  if (meta.includes("色彩/材质")) return ["色彩主题", "锁屏 + AOD", "图标色板"];
  if (meta.includes("异形/材质")) return ["异形主视觉", "材质主题", "图标延展"];
  if (meta.includes("涂鸦/插画")) return ["插画涂鸦", "动态感", "本地化纹样"];
  if (meta.includes("海报")) return ["海报主视觉", "锁屏壁纸", "氛围套装"];
  return ["视觉玩法", "主题模板", "设计灵感"];
}

function renderMetrics() {
  const list = filtered();
  const selected = list.filter(x => x.selected).length;
  const isGlobal = state.region === "全球" && state.source === "全部平台" && state.table === "all";
  const metrics = [
    ["抓取热点", isGlobal ? summary.rawTopics?.toLocaleString("en-US") || "—" : list.length * 160, `较上轮 +${summary.rawDelta || 18}%`, "#1976ed"],
    ["有效热点", isGlobal ? summary.effectiveHotspots || "—" : list.length * 12, `有效率 ${summary.effectiveRate || "—"}`, "#16b7d5"],
    ["爆发预警", list.filter(x => x.status === "爆发").length || summary.highPriorityAlerts || 0, "高优先级需响应", "#ff6b24"],
    ["模板候选", selected || summary.templateCandidates || 0, "可进入 AIGC 工作流", "#13a66a"]
  ];
  $("#metrics").innerHTML = metrics.map(m => `<div class="metric" style="--accent:${m[3]}"><div class="metric-head"><span>${m[0]}</span><span>↗</span></div><strong>${m[1]}</strong><small class="up">${m[2]}</small></div>`).join("");
  $("#candidateCount").textContent = hotspots.filter(x => x.selected).length;
}

function renderChart() {
  const blue = trendSeries.effective || [];
  const orange = trendSeries.template || [];
  const labels = trendSeries.labels || [];
  const svg = $("#trendChart");
  const w = 780, h = 280, p = 38;
  const max = Math.max(20, ...blue, ...orange) * 1.12;
  const xFor = i => p + i * (w - 2 * p) / Math.max(1, blue.length - 1);
  const yFor = v => h - p - v * (h - 2 * p) / max;
  const pts = data => data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  let grid = "";
  for (let i = 0; i < 5; i++) {
    const y = p + i * (h - 2 * p) / 4;
    const label = Math.round(max - i * max / 4);
    grid += `<line class="grid-line" x1="${p}" y1="${y}" x2="${w - p}" y2="${y}"/><text class="axis-text" x="4" y="${y + 4}">${label}</text>`;
  }
  const area = `${p},${h - p} ${pts(blue)} ${w - p},${h - p}`;
  svg.innerHTML = `<defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1976ed" stop-opacity=".22"/><stop offset="1" stop-color="#1976ed" stop-opacity="0"/></linearGradient></defs>${grid}<polygon class="trend-area" points="${area}"/><polyline class="trend-line" points="${pts(blue)}"/><polyline class="template-line" points="${pts(orange)}"/>${blue.map((v, i) => i % 3 === 0 ? `<circle class="chart-dot" cx="${xFor(i)}" cy="${yFor(v)}" r="4"/>` : "").join("")}<text class="axis-text" x="${p}" y="${h - 8}">${labels[0] || "00:00"}</text><text class="axis-text" x="${w / 2 - 20}" y="${h - 8}">${labels[Math.floor(labels.length / 2)] || "12:00"}</text><text class="axis-text" x="${w - p - 35}" y="${h - 8}">${labels[labels.length - 1] || "24:00"}</text>`;
}

function renderAlerts() {
  $("#alerts").innerHTML = hotspots
    .filter(h => h.status !== "观察")
    .slice(0, 4)
    .map(h => `<div class="alert" data-id="${h.id}">
      <div class="alert-main">
        <strong>${hotspotTitle(h)}</strong>
        <div class="alert-meta">
          <span class="region-pill">${h.region}</span>
          <span>${h.source.join(" + ")}</span>
        </div>
      </div>
      <span class="alert-playability"><small>主题可玩性</small><b>${h.score >= 90 ? "高" : h.score >= 75 ? "中" : "低"}</b></span>
    </div>`)
    .join("");
}

function renderTable() {
  const list = filtered();
  $("#hotspotRows").innerHTML = list.map((h, i) => `<tr data-id="${h.id}"><td class="rank">${String(i + 1).padStart(2, "0")}</td><td class="event-name">${hotspotTitle(h)}</td><td><b>${h.region}</b><small class="country-line">${h.country || h.region}</small></td><td class="source-tags">${sourceTags(h)}</td><td>${platformMetric(h)}</td><td>${momentumMetric(h)}</td><td>${playabilityMetric(h)}</td><td><span class="status ${h.status === "爆发" ? "burst" : h.status === "上升" ? "rising" : "watch"}">${h.status}</span></td><td><button class="action-btn ${h.selected ? "selected" : ""}" data-action="${h.id}">${h.selected ? "已入选" : "加入候选"}</button></td></tr>`).join("") || `<tr><td colspan="9" style="text-align:center;color:#8b97a8;padding:40px">当前筛选条件下暂无热点</td></tr>`;
}

function platformMetric(h) {
  if (h.source.includes("YouTube")) return `<div class="data-metric"><b>播放量 ${h.heat}</b><small>YouTube 公开数据</small></div>`;
  if (h.source.includes("Google Trends")) {
    const traffic = h.trends?.traffic ? `${Number(h.trends.traffic).toLocaleString()}+` : "上升";
    return `<div class="data-metric"><b>搜索热度 ${traffic}</b><small>Google Trends 相对信号</small></div>`;
  }
  return `<div class="data-metric"><b>${h.heat || "待接入"}</b><small>${h.source[0] || "平台数据"}</small></div>`;
}

function momentumMetric(h) {
  const level = h.trend >= 60 ? "高" : h.trend >= 35 ? "中" : "低";
  const note = h.trend >= 60 ? "正在升温" : h.trend >= 35 ? "持续关注" : "建议观察";
  return `<div class="signal-metric"><b class="level-${level}">${level}</b><small>${note}</small></div>`;
}

function visualSignal(h) {
  const match = String(h.reason || "").match(/视觉判断：([^。；]+)/);
  return match ? match[1].replaceAll(" / ", "、") : "色彩 / 构图";
}

function drawerReason(h) {
  // 兼容历史数据中已被多地区合并的重复 reason：详情只呈现第一条完整判断。
  const raw = String(h.reason || "").replace(/；\s*来自\s+/g, "。来自 ");
  const first = raw.split(/。\s*来自 YouTube|；\s*来自 YouTube/)[0].trim();
  return first || raw;
}

function playabilityMetric(h) {
  const level = h.score >= 90 ? "高" : h.score >= 75 ? "中" : "低";
  return `<div class="signal-metric"><b class="level-${level}">${level}</b><small>${escapeHtml(visualSignal(h))}</small></div>`;
}

function renderRegions() {
  $("#regionCards").innerHTML = Object.entries(regionStats).map(([name, v]) => `<article class="region-card"><div class="top"><h3>${name}</h3><span class="badge ${v.growth > 30 ? "danger" : ""}">↑ ${v.growth}%</span></div><div class="country-tags">${v.countries.map(c => `<span>${c}</span>`).join("")}</div><div class="big">${v.count}</div><small>有效热点 / 近 24 小时</small><div class="mini-list">${v.top.map((x, i) => `<div><span>${i + 1}. ${x}</span><b>${92 - i * 5}</b></div>`).join("")}</div></article>`).join("");
}

function renderGallery() {
  const allItems = templateOutputs.length ? templateOutputs : hotspots.filter(h => h.selected && h.preview);
  const list = filterLibraryItems(allItems, libraryFilters.wallpaper);
  const batchDate = dashboardMeta.wallpaperBatchGeneratedAt
    ? formatUpdateTime(dashboardMeta.wallpaperBatchGeneratedAt).split(" ")[0]
    : "";
  $("#galleryCount").textContent = `${list.length}/${allItems.length} 个壁纸样图${batchDate ? ` · ${batchDate} 批次` : ""}`;
  if (!list.length) {
    $("#visualGallery").innerHTML = `<div class="library-empty">当前筛选范围暂无样图；历史资产仍会保留，不会被删除。</div>`;
    return;
  }
  $("#visualGallery").innerHTML = `<div class="masonry-gallery">${list.map(h => {
    const nameText = sampleName(h);
    return `<article class="playbook-card image-playbook-card">
          <div class="sample-context"><span>${escapeHtml(topRankLabel(h))}</span><b>${escapeHtml(h.hotspotName || "实时热点")}</b>${h.sourceUrl ? `<a href="${escapeAttr(h.sourceUrl)}" target="_blank" rel="noopener noreferrer">真实来源 ↗</a>` : ""}</div>
          <button class="visual-preview playbook-image" data-preview="${escapeAttr(h.preview)}" data-caption="${escapeAttr(h.previewTitle)}" aria-label="预览${escapeAttr(h.previewTitle)}">
            <img src="${escapeAttr(h.preview)}" alt="${escapeAttr(h.previewTitle)}">
            <span>${escapeHtml(topRankLabel(h))}</span>
            <b>${escapeHtml(nameText)}</b>
          </button>
          <div class="visual-info">
            <b>${escapeHtml(h.previewTitle)}</b>
            <small>${escapeHtml(h.previewMeta)}</small>
            <div class="play-tags">${playTags(h).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <div class="prompt-block"><span>AI 生成提示词</span><p>${escapeHtml(h.prompt)}</p></div>
            <div class="visual-actions">
              <button class="copy-prompt" data-copy-id="${escapeAttr(h.id)}">复制提示词</button>
              <a class="download-sample" href="${escapeAttr(h.preview)}" download="${escapeAttr(previewDownloadName(h))}">${h.assetType === "direct-wallpaper" ? "下载壁纸" : "下载样图"}</a>
            </div>
          </div>
        </article>`;
  }).join("")}</div>`;
}

function filterLibraryItems(items, mode) {
  const now = Date.now();
  return items
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .filter(({ item }) => {
      const generatedAt = Date.parse(item.generatedAt || "");
      const ageDays = Number.isFinite(generatedAt) ? (now - generatedAt) / 86400000 : 0;
      if (mode === "archive") return ageDays > 30;
      if (mode === "all") return true;
      return ageDays <= 30;
    })
    .sort((a, b) => {
      const aGeneratedAt = Date.parse(a.item.generatedAt || "");
      const bGeneratedAt = Date.parse(b.item.generatedAt || "");
      const aTime = Number.isFinite(aGeneratedAt) ? aGeneratedAt : 0;
      const bTime = Number.isFinite(bGeneratedAt) ? bGeneratedAt : 0;
      return bTime - aTime || b.sourceIndex - a.sourceIndex;
    })
    .map(({ item }) => item);
}

function renderThemeGallery() {
  const grid = $("#themePreviewGrid");
  if (!grid || !themeOutputs.length) return;
  const list = filterLibraryItems(themeOutputs, libraryFilters.theme);
  const batchDate = dashboardMeta.themeBatchGeneratedAt
    ? formatUpdateTime(dashboardMeta.themeBatchGeneratedAt).split(" ")[0]
    : "";
  const count = $("#themeGalleryCount");
  if (count) count.textContent = `${list.length}/${themeOutputs.length} 套主题${batchDate ? ` · ${batchDate} 批次` : ""}`;
  if (!list.length) {
    grid.innerHTML = `<div class="library-empty">当前筛选范围暂无主题；超过 30 天的主题会自动进入历史存档。</div>`;
    return;
  }
  grid.innerHTML = list.map(theme => `
    <article class="theme-preview-card">
      <button class="theme-preview-image visual-preview" data-preview="${escapeAttr(theme.preview)}" data-caption="${escapeAttr(theme.caption || `${theme.name} · 主题模板`)}" aria-label="预览${escapeAttr(theme.name)}主题样图">
        <img src="${escapeAttr(theme.preview)}" alt="${escapeAttr(theme.name)}主题预览">
      </button>
      <div class="theme-preview-info">
        <div>
          <span class="theme-kicker">${escapeHtml(theme.kicker || "主题模板库")}</span>
          <h3>${escapeHtml(theme.name)}</h3>
          <p>${escapeHtml(theme.description || "")}</p>
        </div>
        <div class="play-tags">${(theme.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="visual-actions">
          <button class="theme-copy" data-theme-copy="${escapeAttr(theme.promptKey || "")}">复制提示词</button>
          <a class="download-sample" href="${escapeAttr(theme.preview)}" download="${escapeAttr(theme.downloadName || `${theme.id}.png`)}">下载样图</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderStrategy() {
  const cards = strategyCards.length ? strategyCards : [];
  const grid = $(".strategy-grid");
  grid.innerHTML = cards.map(card => `<article class="strategy-card"><span>${card.index}</span><h3>${card.title}</h3><strong>${card.subtitle}</strong><p>${card.body}</p></article>`).join("");
  $(".funnel").innerHTML = funnel.map((item, i) => `${i ? "<i>→</i>" : ""}<div class="${item.selected ? "selected" : ""}"><b>${item.value}</b><span>${item.label}</span></div>`).join("");
}

function openDrawer(id) {
  const h = hotspots.find(x => x.id === Number(id)); if (!h) return;
  const primary = getPrimarySource(h);
  const sourceVisual = getSourceVisual(h, primary.source);
  const sourceCard = primary.url
    ? `<a class="drawer-source-card" href="${escapeAttr(primary.url)}" target="_blank" rel="noopener noreferrer">
        ${sourceVisual.image ? `<img src="${escapeAttr(sourceVisual.image)}" alt="${escapeAttr(h.name)} 原始封面">` : ""}
        <div><small>真实来源</small><b>打开 ${primary.source} 原始内容</b><span>${escapeAttr(sourceVisual.label)}</span></div><i>↗</i>
      </a>`
    : `<div class="drawer-source-card disabled">
        <div><small>真实来源</small><b>${primary.source} 待接入真实链接</b><span>该平台还未完成 API/来源链接接入，暂不伪造跳转。</span></div>
      </div>`;
  $("#drawerContent").innerHTML = `<p class="eyebrow">HOTSPOT DETAIL</p><h2>${h.name}</h2><p class="meta">${h.region} · ${h.source.join(" / ")} · ${h.type === "predictable" ? "可预测热点" : "实时热点"}</p>${sourceCard}<div class="drawer-score"><div><small>主题可玩性</small><b>${h.score >= 90 ? "高" : h.score >= 75 ? "中" : "低"}</b><span>内部辅助判断 · ${h.score}/100</span></div><div><small>热点动能</small><b class="up">${h.trend >= 60 ? "高" : h.trend >= 35 ? "中" : "低"}</b><span>${h.trend >= 60 ? "正在升温" : h.trend >= 35 ? "持续关注" : "建议观察"}</span></div></div><h3>为什么值得转模板？</h3><p class="meta" style="line-height:1.7">${drawerReason(h)}</p>${signalList(h)}<h3>筛选标准</h3><div class="criteria"><div><span>持续性热度</span><span class="pass">通过</span></div><div><span>强视觉符号</span><span class="pass">通过</span></div><div><span>正向情绪</span><span class="pass">通过</span></div><div><span>可个性化</span><span class="pass">通过</span></div></div><button class="primary drawer-action" data-action="${h.id}">${h.selected ? "已加入运营候选" : "加入候选并转模板"}</button>`;
  $("#detailDrawer").classList.add("open"); $("#drawerBackdrop").classList.add("open");
  applyLanguage($("#detailDrawer"));
}

function closeDrawer() { $("#detailDrawer").classList.remove("open"); $("#drawerBackdrop").classList.remove("open"); }

function toggleCandidate(id) {
  const h = hotspots.find(x => x.id === Number(id)); h.selected = !h.selected; renderAll(); openDrawer(id); showToast(h.selected ? "已加入本地候选" : "已移出本地候选");
}

function showToast(text, duration = 1500) {
  const t = $("#toast");
  clearTimeout(toastTimer);
  t.classList.remove("refresh-summary");
  t.textContent = localized(text);
  t.classList.add("show");
  toastTimer = setTimeout(() => t.classList.remove("show"), duration);
}

function showRefreshToast() {
  const t = $("#toast");
  clearTimeout(toastTimer);
  const isEnglish = languageState.current === "en";
  const statusLabels = isEnglish
    ? { connected: "Written", empty: "API healthy · 0 this run", error: "Connection error", missing: "Not configured", pending: "Pending verification", review_required: "Awaiting Meta review" }
    : { connected: "已写入", empty: "接口正常 · 本轮 0 条", error: "连接异常", missing: "待配置", pending: "待验证", review_required: "等待 Meta 审核" };
  const sourceStatuses = (dashboardMeta.sourceStatus || [])
    .filter(item => item.source === "Instagram" || item.source === "Facebook");
  const healthBadges = sourceStatuses.map(item => {
    const cssStatus = item.status === "connected" ? "ok" : item.status === "empty" ? "empty" : item.status === "review_required" ? "pending" : "error";
    const countText = item.status === "connected"
      ? ` · ${item.visibleCount ?? item.fetchedCount ?? 0} ${isEnglish ? "items" : "条"}`
      : "";
    return `<span class="source-health-badge ${cssStatus}" title="${escapeAttr(item.detail || "")}">${escapeHtml(item.source)}：${escapeHtml(statusLabels[item.status] || item.status)}${countText}</span>`;
  }).join("");
  const cadence = isEnglish
    ? "Scheduled daily at 09:00 Beijing time; major holidays are planned 4–6 weeks ahead."
    : (dashboardMeta.cadence || "每日北京时间 09:00 自动更新；大型节假日提前 4–6 周准备。");
  t.innerHTML = `
    <div class="toast-refresh-title"><span>✓</span><strong>${isEnglish ? "Latest data refreshed" : "最新数据已刷新"}</strong></div>
    <div class="toast-refresh-time">${isEnglish ? "Updated" : "更新于"} ${escapeHtml(formatUpdateTime(dashboardMeta.generatedAt))}</div>
    ${healthBadges ? `<div class="toast-refresh-badges">${healthBadges}</div>` : ""}
    <div class="toast-refresh-cadence">${escapeHtml(cadence)}</div>`;
  t.classList.add("refresh-summary", "show");
  toastTimer = setTimeout(() => t.classList.remove("show"), 5200);
}

async function downloadSample(url, filename = "theme-sample.png") {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("下载失败");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    showToast("样图已开始下载");
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function renderAll() {
  renderMetrics();
  renderChart();
  renderAlerts();
  renderTable();
  renderRegions();
  renderThemeGallery();
  renderGallery();
  renderStrategy();
  applyLanguage();
}

function bind() {
  $$(".language-option").forEach(button => {
    button.onclick = () => setLanguage(button.dataset.language);
  });
  $("#regionFilter").onchange = e => { state.region = e.target.value; renderAll(); };
  $("#sourceFilter").onchange = e => { state.source = e.target.value; renderAll(); };
  $("#themeTimeFilter").onchange = e => { libraryFilters.theme = e.target.value; renderThemeGallery(); applyLanguage(); };
  $("#wallpaperTimeFilter").onchange = e => { libraryFilters.wallpaper = e.target.value; renderGallery(); applyLanguage(); };
  const viewAnchors = {
    overview: "#overviewTop",
    pool: "#hotspotPoolSection",
    trend: "#trendSection",
    alerts: "#alertSection",
    // 运营候选的第一落点是给设计师浏览的主题样图，而非下方的提示词样图列表。
    candidates: "#themePreviewSection",
    config: "#configView"
  };
  $$(".nav-item").forEach(b => b.onclick = () => {
    $$(".nav-item").forEach(x => x.classList.remove("active")); b.classList.add("active");
    const mode = b.dataset.view;
    const anchor = viewAnchors[mode];
    if (mode === "pool") { state.table = "all"; renderTable(); }
    if (mode === "candidates") { state.table = "candidates"; renderTable(); }
    if (anchor) setTimeout(() => $(anchor).scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  });

  // Single-page scroll spy: navigating the content also updates the matching sidebar item.
  const scrollSections = [
    ["overview", "#overviewTop"],
    ["pool", "#hotspotPoolSection"],
    ["trend", "#trendSection"],
    ["alerts", "#alertSection"],
    ["candidates", "#themePreviewSection"],
    // 提示词样图仍属于运营候选，继续保持左侧同一高亮。
    ["candidates", "#styleTemplateSection"],
    ["config", "#configView"]
  ].map(([view, selector]) => ({ view, node: $(selector) })).filter(x => x.node);
  const activateView = view => {
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  };
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const item = scrollSections.find(section => section.node === visible.target);
    if (item) activateView(item.view);
  }, { rootMargin: "-18% 0px -58% 0px", threshold: [0.08, 0.2, 0.45] });
  scrollSections.forEach(section => observer.observe(section.node));
  $$(".chip").forEach(b => b.onclick = () => { $$(".chip").forEach(x => x.classList.remove("active")); b.classList.add("active"); state.table = b.dataset.table; renderTable(); });
  document.addEventListener("click", async e => {
    if (e.target.closest("a")) return;
    const download = e.target.closest("[data-download-url]");
    const row = e.target.closest("tr[data-id],.alert[data-id]");
    const preview = e.target.closest("[data-preview]");
    const copy = e.target.closest("[data-copy-id]");
    const themeCopy = e.target.closest("[data-theme-copy]");
    if (download) {
      e.preventDefault();
      e.stopPropagation();
      downloadSample(download.dataset.downloadUrl, download.dataset.downloadName);
      return;
    }
    if (row && !e.target.dataset.action) openDrawer(row.dataset.id);
    if (preview) { $("#previewImage").src = preview.dataset.preview; $("#previewCaption").textContent = preview.dataset.caption; $("#previewModal").showModal(); }
    if (copy) {
      const h = [...hotspots, ...templateOutputs, ...fusionStyles].find(x => String(x.id) === String(copy.dataset.copyId));
      try { await navigator.clipboard.writeText(h.prompt); } catch {
        const area = document.createElement("textarea"); area.value = h.prompt; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
      }
      copy.textContent = localized("已复制"); showToast("提示词已复制，可直接粘贴使用"); setTimeout(() => copy.textContent = localized("复制提示词"), 1300);
    }
    if (themeCopy) {
      const prompt = themePrompts[themeCopy.dataset.themeCopy];
      if (!prompt) return;
      try { await navigator.clipboard.writeText(prompt); } catch {
        const area = document.createElement("textarea"); area.value = prompt; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
      }
      themeCopy.textContent = localized("已复制"); showToast("主题提示词已复制，可直接粘贴使用"); setTimeout(() => themeCopy.textContent = localized("复制提示词"), 1300);
    }
    if (e.target.dataset.action) { e.stopPropagation(); toggleCandidate(e.target.dataset.action); }
  });
  $("#closeDrawer").onclick = closeDrawer; $("#drawerBackdrop").onclick = closeDrawer;
  $("#refreshBtn").onclick = async () => {
    const btn = $("#refreshBtn");
    btn.textContent = localized("读取中…");
    try {
      await loadDashboardData(true);
      initSelects();
      renderAll();
      btn.textContent = localized("✓ 已拉取");
      showRefreshToast();
    } catch (error) {
      btn.textContent = localized("数据读取失败");
      showToast("数据读取失败，请稍后再试");
    } finally {
      setTimeout(() => btn.textContent = localized("↻ 拉取最新"), 1300);
    }
  };
  $("#candidateBtn").onclick = () => { $(".nav-item[data-view='candidates']").click(); showToast(`当前 ${hotspots.filter(x => x.selected).length} 个运营候选`); };
  $("#galleryPrev").onclick = () => $("#visualGallery").scrollBy({ left: -260, behavior: "smooth" });
  $("#galleryNext").onclick = () => $("#visualGallery").scrollBy({ left: 260, behavior: "smooth" });
  $("#closePreview").onclick = () => $("#previewModal").close();
}

async function bootstrap() {
  try {
    await loadDashboardData();
    initSelects();
    bind();
    renderAll();
    setLanguage(languageState.current);
  } catch (error) {
    $("#lastUpdated").textContent = "数据读取失败";
    $("#liveStatus").textContent = `页面初始化失败：${error.message || error}`;
    showToast("数据读取失败");
    console.error(error);
  }
}

bootstrap();
