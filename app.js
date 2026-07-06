const regions=["全球","印度","印度尼西亚","俄罗斯（东欧）","撒哈拉以南非洲","南美洲"];
const sources=["全部平台","TikTok","YouTube","Google Trends","Instagram","X","Facebook","本地平台"];
const hotspots=[
 {id:1,name:"世界杯淘汰赛",region:"南美洲",country:"阿根廷 / 巴西",source:["X","Google Trends"],heat:"2.4M",trend:68,score:94,status:"爆发",type:"predictable",selected:true,preview:"./assets/worldcup_argentina_victory.png",previewTitle:"阿根廷｜胜利身份大片",previewMeta:"南美洲 · 世界杯 · 人像封面",prompt:"9:16 手机锁屏壁纸，成年阿根廷年轻男性球迷站在夜间足球场，蓝白围巾与脸部彩绘，手放心口，蓝白金色纸屑，胜利后的克制喜悦，高级体育杂志摄影，真实肤质，顶部留出时钟区域，无文字、无品牌标识。",reason:"强烈的国家情绪与应援视觉符号，适合生成球衣色、国旗色和漫画应援主题。"},
 {id:2,name:"排灯节视觉季",region:"印度",country:"印度",source:["Instagram","本地平台"],heat:"1.8M",trend:42,score:91,status:"上升",type:"predictable",selected:true,preview:"./assets/diwali_template.png",previewTitle:"印度｜排灯节金色肖像",previewMeta:"印度 · 节日文化 · 金色纹样",prompt:"9:16 手机锁屏壁纸，成年印度女性身着优雅藏红花色传统服饰，置身排灯节真实家庭场景，油灯、万寿菊与曼陀罗光影，金色暖光，高级人像摄影，细腻真实，构图简洁，顶部留出时钟区域，无文字、无品牌标识。",reason:"可提前准备，灯光、曼陀罗和金色纹样具有明确视觉资产价值。"},
 {id:3,name:"夏日音乐节",region:"俄罗斯（东欧）",country:"俄罗斯",source:["TikTok","YouTube"],heat:"960K",trend:39,score:87,status:"上升",type:"realtime",selected:false,reason:"持续时间较长，舞台灯光、音乐人物和年轻情绪适合动态壁纸。"},
 {id:4,name:"嘉年华街头色彩",region:"南美洲",country:"巴西 / 哥伦比亚",source:["Instagram","TikTok"],heat:"824K",trend:35,score:89,status:"上升",type:"predictable",selected:true,preview:"./assets/carnival_template.png",previewTitle:"巴西｜嘉年华街头色彩",previewMeta:"南美洲 · 城市时尚 · 高饱和色彩",prompt:"9:16 手机锁屏壁纸，28 岁巴西女性穿钴蓝西装与珊瑚色长裙，站在圣保罗现代街区，青绿、珊瑚、蓝色与暖黄色几何节庆装置，高级拉美时尚大片，阳光自然，色彩鲜明但克制，无文字、无品牌标识。",reason:"鲜明服饰和高饱和色彩可快速转成多风格模板。"},
 {id:5,name:"本地偶像新歌发布",region:"印度尼西亚",country:"印度尼西亚",source:["YouTube","本地平台"],heat:"720K",trend:28,score:78,status:"观察",type:"realtime",selected:false,reason:"热度较高，但版权与肖像风险需要进一步审核。"},
 {id:6,name:"非洲城市时尚周",region:"撒哈拉以南非洲",country:"尼日利亚 / 南非 / 加纳 / 肯尼亚",source:["Instagram","Facebook"],heat:"618K",trend:31,score:85,status:"上升",type:"predictable",selected:true,preview:"./assets/africa_fashion_template.png",previewTitle:"尼日利亚｜城市时尚大片",previewMeta:"非洲 · 高级时装 · 几何纹样",prompt:"9:16 手机锁屏壁纸，29 岁非洲女性身着靛蓝与铜色几何纹样高级时装，站在拉各斯现代建筑前，西非织物灵感与城市建筑融合，奢华杂志摄影，真实肤质与面料，电影感自然光，无文字、无品牌标识。",reason:"服饰纹样、城市文化和正向情绪具备模板化空间。"},
 {id:7,name:"雨季治愈氛围",region:"印度尼西亚",country:"印度尼西亚",source:["TikTok","Google Trends"],heat:"510K",trend:19,score:82,status:"观察",type:"realtime",selected:false,reason:"持续性较好，可转成动态雨滴和治愈系锁屏。"},
 {id:8,name:"板球决赛应援",region:"印度",country:"印度",source:["X","YouTube"],heat:"1.2M",trend:56,score:92,status:"爆发",type:"predictable",selected:true,preview:"./assets/cricket_template.png",previewTitle:"印度｜板球决赛应援",previewMeta:"印度 · 体育赛事 · 蓝金氛围",prompt:"9:16 手机锁屏壁纸，27 岁印度女性球迷身着皇家蓝外套，在现代板球场自信欢呼，蓝色光带与少量金色纸屑，蓝金应援氛围，高级体育广告摄影，活力但不杂乱，顶部留出时钟区域，无文字、无球队标识。",reason:"赛事节点明确，可提前定模板并在赛前三天上线。"}
];
const regionStats={
 "印度":{count:86,growth:28,countries:["印度"],top:["排灯节视觉季","板球决赛应援","宝莱坞复古风"]},
 "印度尼西亚":{count:64,growth:19,countries:["印度尼西亚"],top:["本地偶像新歌","雨季治愈氛围","开斋节穿搭"]},
 "俄罗斯（东欧）":{count:51,growth:22,countries:["俄罗斯"],top:["夏日音乐节","城市霓虹夜","足球漫画"]},
 "撒哈拉以南非洲":{count:47,growth:31,countries:["尼日利亚","南非","加纳","肯尼亚"],top:["城市时尚周","非洲音乐节","传统纹样"]},
 "南美洲":{count:78,growth:36,countries:["巴西","阿根廷","哥伦比亚","智利","秘鲁"],top:["世界杯淘汰赛","嘉年华色彩","拉美街头艺术"]}
};
const fusionStyles=[
 {id:101,preview:"./assets/fusion-fashion-city.png",previewTitle:"三图融合｜人物 × 穿搭 × 城市",previewMeta:"南美 · 写实人像 · 城市时尚",prompt:"使用三张参考图：人物自拍、钴蓝与珊瑚色穿搭、圣保罗彩色街头背景。保持人物身份与五官一致，将服装和背景自然融合，统一日光方向、肤色、透视和景深，生成 9:16 高级时尚摄影锁屏壁纸，顶部留出时钟区域，无文字、无品牌标识。"},
 {id:102,preview:"./assets/fusion-diwali-frame.png",previewTitle:"双图融合｜人物 × 节日框景",previewMeta:"印度 · 纸雕风格 · 节日限定",prompt:"使用两张参考图：人物肖像和排灯节纸雕装饰框。保持人物身份与姿态自然，将人物嵌入油灯、万寿菊和曼陀罗组成的节日框景，转化为有真实纸张层次的高级纸雕插画，9:16 锁屏构图，藏红花、洋红、深靛蓝与金色，无文字。"},
 {id:103,preview:"./assets/fusion-pet-city.png",previewTitle:"三图融合｜人物 × 宠物 × 场景",previewMeta:"非洲 · 宠物合照 · 城市生活",prompt:"使用三张参考图：人物肖像、宠物照片和拉各斯日落屋顶背景。保持人物与宠物特征一致，让互动姿态自然，统一暖色轮廓光、视角和阴影；为人物融合靛蓝铜色几何纹样服装，生成 9:16 高级生活方式摄影壁纸，顶部留出时钟区域，无文字、无品牌标识。"}
];
let state={region:"全球",source:"全部平台",table:"all"};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function initSelects(){
 $("#regionFilter").innerHTML=regions.map(x=>`<option>${x}</option>`).join("");
 $("#sourceFilter").innerHTML=sources.map(x=>`<option>${x}</option>`).join("");
}
function filtered(){
 return hotspots.filter(h=>(state.region==="全球"||h.region===state.region)&&(state.source==="全部平台"||h.source.includes(state.source))&&(state.table==="all"||h.type===state.table));
}
function renderMetrics(){
 const list=filtered(), selected=list.filter(x=>x.selected).length;
 const metrics=[
  ["抓取热点","1,284","较昨日 +18%","#1976ed"],
  ["有效热点",state.region==="全球"?"326":list.length*12,"有效率 25.4%","#16b7d5"],
  ["爆发预警",list.filter(x=>x.status==="爆发").length||2,"高优先级需响应","#ff6b24"],
  ["模板候选",selected||Math.max(1,Math.round(list.length*.4)),"可进入 AIGC 工作流","#13a66a"]
 ];
 $("#metrics").innerHTML=metrics.map(m=>`<div class="metric" style="--accent:${m[3]}"><div class="metric-head"><span>${m[0]}</span><span>↗</span></div><strong>${m[1]}</strong><small class="up">${m[2]}</small></div>`).join("");
 $("#candidateCount").textContent=hotspots.filter(x=>x.selected).length;
}
function renderChart(){
 const blue=[38,46,44,63,58,72,86,78,96,104,118,126];
 const orange=[9,12,11,18,20,27,32,34,41,47,52,61];
 const svg=$("#trendChart"), w=780,h=280,p=38,max=140;
 const pts=data=>data.map((v,i)=>`${p+i*(w-2*p)/(data.length-1)},${h-p-v*(h-2*p)/max}`).join(" ");
 let grid=""; for(let i=0;i<5;i++){const y=p+i*(h-2*p)/4;grid+=`<line class="grid-line" x1="${p}" y1="${y}" x2="${w-p}" y2="${y}"/><text class="axis-text" x="4" y="${y+4}">${140-i*35}</text>`}
 const area=`${p},${h-p} ${pts(blue)} ${w-p},${h-p}`;
 svg.innerHTML=`<defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1976ed" stop-opacity=".22"/><stop offset="1" stop-color="#1976ed" stop-opacity="0"/></linearGradient></defs>${grid}<polygon class="trend-area" points="${area}"/><polyline class="trend-line" points="${pts(blue)}"/><polyline class="template-line" points="${pts(orange)}"/>${blue.map((v,i)=>i%3===0?`<circle class="chart-dot" cx="${p+i*(w-2*p)/(blue.length-1)}" cy="${h-p-v*(h-2*p)/max}" r="4"/>`:"").join("")}<text class="axis-text" x="${p}" y="${h-8}">00:00</text><text class="axis-text" x="${w/2-20}" y="${h-8}">12:00</text><text class="axis-text" x="${w-p-35}" y="${h-8}">24:00</text>`;
}
function renderAlerts(){
 $("#alerts").innerHTML=hotspots.filter(h=>h.status!=="观察").slice(0,4).map(h=>`<div class="alert" data-id="${h.id}"><div><strong>${h.name}</strong><small>${h.region} · ${h.source.join(" + ")}</small></div><span class="score">${h.score}</span></div>`).join("");
}
function renderTable(){
 const list=filtered();
 $("#hotspotRows").innerHTML=list.map((h,i)=>`<tr data-id="${h.id}"><td class="rank">${String(i+1).padStart(2,"0")}</td><td class="event-name">${h.name}</td><td><b>${h.region}</b><small class="country-line">${h.country||h.region}</small></td><td class="source-tags">${h.source.map(s=>`<span>${s}</span>`).join("")}</td><td>${h.heat}</td><td class="trend-up">↑ ${h.trend}%</td><td><div class="potential"><div class="potential-bar"><i style="width:${h.score}%"></i></div><b>${h.score}</b></div></td><td><span class="status ${h.status==="爆发"?"burst":h.status==="上升"?"rising":"watch"}">${h.status}</span></td><td><button class="action-btn ${h.selected?"selected":""}" data-action="${h.id}">${h.selected?"已入选":"加入候选"}</button></td></tr>`).join("")||`<tr><td colspan="9" style="text-align:center;color:#8b97a8;padding:40px">当前筛选条件下暂无热点</td></tr>`;
}
function renderRegions(){
 $("#regionCards").innerHTML=Object.entries(regionStats).map(([name,v])=>`<article class="region-card"><div class="top"><h3>${name}</h3><span class="badge ${v.growth>30?"danger":""}">↑ ${v.growth}%</span></div><div class="country-tags">${v.countries.map(c=>`<span>${c}</span>`).join("")}</div><div class="big">${v.count}</div><small>有效热点 / 近 24 小时</small><div class="mini-list">${v.top.map((x,i)=>`<div><span>${i+1}. ${x}</span><b>${92-i*5}</b></div>`).join("")}</div></article>`).join("");
}
function renderGallery(){
 const list=hotspots.filter(h=>h.selected&&h.preview);
 $("#galleryCount").textContent=`${list.length} 个已入选样图`;
 $("#visualGallery").innerHTML=list.map(h=>`<article class="visual-card">
  <button class="visual-preview" data-preview="${h.preview}" data-caption="${h.previewTitle}" aria-label="预览${h.previewTitle}"><img src="${h.preview}" alt="${h.previewTitle}"></button>
  <div class="visual-info"><b>${h.previewTitle}</b><small>${h.previewMeta}</small>
   <div class="prompt-block"><span>AI 生成提示词</span><p>${h.prompt}</p></div>
   <div class="visual-actions"><button class="copy-prompt" data-copy-id="${h.id}">复制提示词</button><a href="${h.preview}" download="${h.preview.split("/").pop()}">下载原图</a></div>
  </div>
 </article>`).join("");
}
function renderFusionGallery(){
 $("#fusionGallery").innerHTML=fusionStyles.map(h=>`<article class="visual-card">
  <button class="visual-preview" data-preview="${h.preview}" data-caption="${h.previewTitle}" aria-label="预览${h.previewTitle}"><img src="${h.preview}" alt="${h.previewTitle}"></button>
  <div class="visual-info"><b>${h.previewTitle}</b><small>${h.previewMeta}</small>
   <div class="prompt-block"><span>多图融合提示词</span><p>${h.prompt}</p></div>
   <div class="visual-actions"><button class="copy-prompt" data-copy-id="${h.id}">复制提示词</button><a href="${h.preview}" download="${h.preview.split("/").pop()}">下载原图</a></div>
  </div>
 </article>`).join("");
}
function openDrawer(id){
 const h=hotspots.find(x=>x.id===Number(id)); if(!h)return;
 $("#drawerContent").innerHTML=`<p class="eyebrow">HOTSPOT DETAIL</p><h2>${h.name}</h2><p class="meta">${h.region} · ${h.source.join(" / ")} · ${h.type==="predictable"?"可预测热点":"实时热点"}</p><div class="drawer-score"><div><small>综合评分</small><b>${h.score}</b></div><div><small>24h 增速</small><b class="up">+${h.trend}%</b></div></div><h3>为什么值得转模板？</h3><p class="meta" style="line-height:1.7">${h.reason}</p><h3>筛选标准</h3><div class="criteria"><div><span>持续性热度</span><span class="pass">通过</span></div><div><span>强视觉符号</span><span class="pass">通过</span></div><div><span>正向情绪</span><span class="pass">通过</span></div><div><span>可个性化</span><span class="pass">通过</span></div></div><button class="primary drawer-action" data-action="${h.id}">${h.selected?"已加入运营候选":"加入候选并转模板"}</button>`;
 $("#detailDrawer").classList.add("open");$("#drawerBackdrop").classList.add("open");
}
function closeDrawer(){$("#detailDrawer").classList.remove("open");$("#drawerBackdrop").classList.remove("open")}
function toggleCandidate(id){
 const h=hotspots.find(x=>x.id===Number(id));h.selected=!h.selected;renderAll();openDrawer(id);showToast(h.selected?"已加入运营候选":"已移出运营候选");
}
function showToast(text){const t=$("#toast");t.textContent=text;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1500)}
function renderAll(){renderMetrics();renderChart();renderAlerts();renderTable();renderRegions();renderGallery();renderFusionGallery()}
function bind(){
 $("#regionFilter").onchange=e=>{state.region=e.target.value;renderAll()};
 $("#sourceFilter").onchange=e=>{state.source=e.target.value;renderAll()};
 $$(".nav-item").forEach(b=>b.onclick=()=>{
  $$(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $$(".view").forEach(v=>v.classList.remove("active"));
  const mode=b.dataset.view;
  if(mode==="pool"){$("#poolView").classList.add("active");window.scrollTo({top:0,behavior:"smooth"});return}
  if(mode==="strategy"){$("#strategyView").classList.add("active");window.scrollTo({top:0,behavior:"smooth"});return}
  $("#overviewView").classList.add("active");
  if(mode==="trend")setTimeout(()=>$(".trend-card").scrollIntoView({behavior:"smooth",block:"center"}),50);
  else if(mode==="alerts")setTimeout(()=>$(".alert-card").scrollIntoView({behavior:"smooth",block:"center"}),50);
  else if(mode==="candidates"){state.table="all";renderTable();setTimeout(()=>$(".table-card").scrollIntoView({behavior:"smooth",block:"start"}),50)}
  else window.scrollTo({top:0,behavior:"smooth"});
 });
 $$(".chip").forEach(b=>b.onclick=()=>{$$(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.table=b.dataset.table;renderTable()});
 document.addEventListener("click",async e=>{const row=e.target.closest("tr[data-id],.alert[data-id]");const preview=e.target.closest("[data-preview]");const copy=e.target.closest("[data-copy-id]");if(row&&!e.target.dataset.action)openDrawer(row.dataset.id);if(preview){$("#previewImage").src=preview.dataset.preview;$("#previewCaption").textContent=preview.dataset.caption;$("#previewModal").showModal()}if(copy){const h=[...hotspots,...fusionStyles].find(x=>x.id===Number(copy.dataset.copyId));try{await navigator.clipboard.writeText(h.prompt)}catch{const area=document.createElement("textarea");area.value=h.prompt;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove()}copy.textContent="已复制";showToast("提示词已复制，可直接粘贴使用");setTimeout(()=>copy.textContent="复制提示词",1300)}if(e.target.dataset.action){e.stopPropagation();toggleCandidate(e.target.dataset.action)}});
 $("#closeDrawer").onclick=closeDrawer;$("#drawerBackdrop").onclick=closeDrawer;
 $("#refreshBtn").onclick=()=>{showToast("数据已更新 · 17:16");$("#refreshBtn").textContent="✓ 已更新";setTimeout(()=>$("#refreshBtn").textContent="↻ 刷新数据",1300)};
 $("#candidateBtn").onclick=()=>{state.table="all";$(".nav-item[data-view='overview']").click();showToast(`当前 ${hotspots.filter(x=>x.selected).length} 个运营候选`)};
 $("#galleryPrev").onclick=()=>$("#visualGallery").scrollBy({left:-260,behavior:"smooth"});
 $("#galleryNext").onclick=()=>$("#visualGallery").scrollBy({left:260,behavior:"smooth"});
 $("#fusionPrev").onclick=()=>$("#fusionGallery").scrollBy({left:-306,behavior:"smooth"});
 $("#fusionNext").onclick=()=>$("#fusionGallery").scrollBy({left:306,behavior:"smooth"});
 $("#closePreview").onclick=()=>$("#previewModal").close();
}
initSelects();bind();renderAll();
