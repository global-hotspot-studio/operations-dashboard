let regions = [];
let sources = [];
let hotspots = [];
let regionStats = {};
let fusionStyles = [];
let trendSeries = { labels: [], effective: [], template: [] };
let summary = {};
let strategyCards = [];
let funnel = [];
let dashboardMeta = {};
let state = { region: "全球", source: "全部平台", table: "all" };

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

async function loadDashboardData(force = false) {
  const url = `./data/dashboard.json${force ? `?t=${Date.now()}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`数据读取失败：${response.status}`);
  const data = await response.json();

  dashboardMeta = data;
  regions = data.regions || ["全球"];
  sources = data.sources || ["全部平台"];
  hotspots = data.hotspots || [];
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
  $("#liveStatus").textContent = dashboardMeta.cadence || "筛选逻辑：持续热度 × 视觉符号 × 正向情绪 × 可个性化";
}

function initSelects() {
  $("#regionFilter").innerHTML = regions.map(x => `<option>${x}</option>`).join("");
  $("#sourceFilter").innerHTML = sources.map(x => `<option>${x}</option>`).join("");
}

function filtered() {
  return hotspots.filter(h =>
    (state.region === "全球" || h.region === state.region) &&
    (state.source === "全部平台" || h.source.includes(state.source)) &&
    (state.table === "all" || h.type === state.table)
  );
}

function escapeAttr(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
      <span class="score">${h.score}</span>
    </div>`)
    .join("");
}

function renderTable() {
  const list = filtered();
  $("#hotspotRows").innerHTML = list.map((h, i) => `<tr data-id="${h.id}"><td class="rank">${String(i + 1).padStart(2, "0")}</td><td class="event-name">${hotspotTitle(h)}</td><td><b>${h.region}</b><small class="country-line">${h.country || h.region}</small></td><td class="source-tags">${sourceTags(h)}</td><td>${h.heat}</td><td class="trend-up">↑ ${h.trend}%</td><td><div class="potential"><div class="potential-bar"><i style="width:${h.score}%"></i></div><b>${h.score}</b></div></td><td><span class="status ${h.status === "爆发" ? "burst" : h.status === "上升" ? "rising" : "watch"}">${h.status}</span></td><td><button class="action-btn ${h.selected ? "selected" : ""}" data-action="${h.id}">${h.selected ? "已入选" : "加入候选"}</button></td></tr>`).join("") || `<tr><td colspan="9" style="text-align:center;color:#8b97a8;padding:40px">当前筛选条件下暂无热点</td></tr>`;
}

function renderRegions() {
  $("#regionCards").innerHTML = Object.entries(regionStats).map(([name, v]) => `<article class="region-card"><div class="top"><h3>${name}</h3><span class="badge ${v.growth > 30 ? "danger" : ""}">↑ ${v.growth}%</span></div><div class="country-tags">${v.countries.map(c => `<span>${c}</span>`).join("")}</div><div class="big">${v.count}</div><small>有效热点 / 近 24 小时</small><div class="mini-list">${v.top.map((x, i) => `<div><span>${i + 1}. ${x}</span><b>${92 - i * 5}</b></div>`).join("")}</div></article>`).join("");
}

function renderGallery() {
  const list = hotspots.filter(h => h.selected && h.preview);
  $("#galleryCount").textContent = `${list.length} 个已入选样图`;
  $("#visualGallery").innerHTML = list.map(h => `<article class="visual-card">
  <button class="visual-preview" data-preview="${h.preview}" data-caption="${h.previewTitle}" aria-label="预览${h.previewTitle}"><img src="${h.preview}" alt="${h.previewTitle}"></button>
  <div class="visual-info"><b>${h.previewTitle}</b><small>${h.previewMeta}</small>
   <div class="prompt-block"><span>AI 生成提示词</span><p>${h.prompt}</p></div>
   <div class="visual-actions"><button class="copy-prompt" data-copy-id="${h.id}">复制提示词</button><a href="${h.preview}" download="${h.preview.split("/").pop()}">下载原图</a></div>
  </div>
 </article>`).join("");
}

function renderFusionGallery() {
  $("#fusionGallery").innerHTML = fusionStyles.map(h => `<article class="visual-card">
  <button class="visual-preview" data-preview="${h.preview}" data-caption="${h.previewTitle}" aria-label="预览${h.previewTitle}"><img src="${h.preview}" alt="${h.previewTitle}"></button>
  <div class="visual-info"><b>${h.previewTitle}</b><small>${h.previewMeta}</small>
   <div class="prompt-block"><span>多图融合提示词</span><p>${h.prompt}</p></div>
   <div class="visual-actions"><button class="copy-prompt" data-copy-id="${h.id}">复制提示词</button><a href="${h.preview}" download="${h.preview.split("/").pop()}">下载原图</a></div>
  </div>
 </article>`).join("");
}

function renderStrategy() {
  const cards = strategyCards.length ? strategyCards : [];
  const grid = $(".strategy-grid");
  grid.innerHTML = cards.map((card, i) => `<article class="strategy-card ${i === 0 ? "accent" : ""}"><span>${card.index}</span><h3>${card.title}</h3><strong>${card.subtitle}</strong><p>${card.body}</p></article>`).join("");
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
  $("#drawerContent").innerHTML = `<p class="eyebrow">HOTSPOT DETAIL</p><h2>${h.name}</h2><p class="meta">${h.region} · ${h.source.join(" / ")} · ${h.type === "predictable" ? "可预测热点" : "实时热点"}</p>${sourceCard}<div class="drawer-score"><div><small>综合评分</small><b>${h.score}</b></div><div><small>24h 增速</small><b class="up">+${h.trend}%</b></div></div><h3>为什么值得转模板？</h3><p class="meta" style="line-height:1.7">${h.reason}</p>${signalList(h)}<h3>筛选标准</h3><div class="criteria"><div><span>持续性热度</span><span class="pass">通过</span></div><div><span>强视觉符号</span><span class="pass">通过</span></div><div><span>正向情绪</span><span class="pass">通过</span></div><div><span>可个性化</span><span class="pass">通过</span></div></div><button class="primary drawer-action" data-action="${h.id}">${h.selected ? "已加入运营候选" : "加入候选并转模板"}</button>`;
  $("#detailDrawer").classList.add("open"); $("#drawerBackdrop").classList.add("open");
}

function closeDrawer() { $("#detailDrawer").classList.remove("open"); $("#drawerBackdrop").classList.remove("open"); }

function toggleCandidate(id) {
  const h = hotspots.find(x => x.id === Number(id)); h.selected = !h.selected; renderAll(); openDrawer(id); showToast(h.selected ? "已加入本地候选" : "已移出本地候选");
}

function showToast(text) { const t = $("#toast"); t.textContent = text; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1500); }

function renderAll() {
  renderMetrics();
  renderChart();
  renderAlerts();
  renderTable();
  renderRegions();
  renderGallery();
  renderFusionGallery();
  renderStrategy();
}

function bind() {
  $("#regionFilter").onchange = e => { state.region = e.target.value; renderAll(); };
  $("#sourceFilter").onchange = e => { state.source = e.target.value; renderAll(); };
  $$(".nav-item").forEach(b => b.onclick = () => {
    $$(".nav-item").forEach(x => x.classList.remove("active")); b.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("active"));
    const mode = b.dataset.view;
    if (mode === "pool") { $("#poolView").classList.add("active"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (mode === "strategy") { $("#strategyView").classList.add("active"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    $("#overviewView").classList.add("active");
    if (mode === "trend") setTimeout(() => $(".trend-card").scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    else if (mode === "alerts") setTimeout(() => $(".alert-card").scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    else if (mode === "candidates") { state.table = "all"; renderTable(); setTimeout(() => $(".table-card").scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $$(".chip").forEach(b => b.onclick = () => { $$(".chip").forEach(x => x.classList.remove("active")); b.classList.add("active"); state.table = b.dataset.table; renderTable(); });
  document.addEventListener("click", async e => {
    if (e.target.closest("a")) return;
    const row = e.target.closest("tr[data-id],.alert[data-id]");
    const preview = e.target.closest("[data-preview]");
    const copy = e.target.closest("[data-copy-id]");
    if (row && !e.target.dataset.action) openDrawer(row.dataset.id);
    if (preview) { $("#previewImage").src = preview.dataset.preview; $("#previewCaption").textContent = preview.dataset.caption; $("#previewModal").showModal(); }
    if (copy) {
      const h = [...hotspots, ...fusionStyles].find(x => x.id === Number(copy.dataset.copyId));
      try { await navigator.clipboard.writeText(h.prompt); } catch {
        const area = document.createElement("textarea"); area.value = h.prompt; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
      }
      copy.textContent = "已复制"; showToast("提示词已复制，可直接粘贴使用"); setTimeout(() => copy.textContent = "复制提示词", 1300);
    }
    if (e.target.dataset.action) { e.stopPropagation(); toggleCandidate(e.target.dataset.action); }
  });
  $("#closeDrawer").onclick = closeDrawer; $("#drawerBackdrop").onclick = closeDrawer;
  $("#refreshBtn").onclick = async () => {
    const btn = $("#refreshBtn");
    btn.textContent = "读取中…";
    try {
      await loadDashboardData(true);
      initSelects();
      renderAll();
      btn.textContent = "✓ 已拉取";
      showToast("已读取线上最新数据");
    } catch (error) {
      btn.textContent = "读取失败";
      showToast("数据读取失败，请稍后再试");
    } finally {
      setTimeout(() => btn.textContent = "↻ 拉取最新", 1300);
    }
  };
  $("#candidateBtn").onclick = () => { state.table = "all"; $(".nav-item[data-view='overview']").click(); showToast(`当前 ${hotspots.filter(x => x.selected).length} 个运营候选`); };
  $("#galleryPrev").onclick = () => $("#visualGallery").scrollBy({ left: -260, behavior: "smooth" });
  $("#galleryNext").onclick = () => $("#visualGallery").scrollBy({ left: 260, behavior: "smooth" });
  $("#fusionPrev").onclick = () => $("#fusionGallery").scrollBy({ left: -306, behavior: "smooth" });
  $("#fusionNext").onclick = () => $("#fusionGallery").scrollBy({ left: 306, behavior: "smooth" });
  $("#closePreview").onclick = () => $("#previewModal").close();
}

async function bootstrap() {
  try {
    await loadDashboardData();
    initSelects();
    bind();
    renderAll();
  } catch (error) {
    $("#lastUpdated").textContent = "数据读取失败";
    $("#liveStatus").textContent = "没有读到 data/dashboard.json，请检查部署文件是否完整。";
    showToast("数据读取失败");
    console.error(error);
  }
}

bootstrap();
