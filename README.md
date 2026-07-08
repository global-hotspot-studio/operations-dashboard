# 全球热点运营看板

面向设计与运营团队的热点发现、筛选和 AIGC 模板转化演示系统。

## 核心能力

- 全球重点市场热点池与趋势监测
- 爆发预警与模板潜力评分
- 运营候选管理
- AI 样图、提示词一键复制和原图下载
- 桌面端与移动端自适应

## 长期运营数据链路

当前版本已经从“静态展示页”升级为“定时更新工具底座”：

- `data/dashboard.json`：页面读取的唯一数据源，包含热点池、地区池、趋势曲线、样图和提示词。
- `scripts/update-hotspots.js`：热点数据更新器，负责刷新热度、趋势、状态和汇总指标；已支持 YouTube Data API、Google Trends RSS、本地媒体 RSS，并预留 X / Instagram / Facebook / TikTok 官方接口连接器。
- `.github/workflows/update-hotspots.yml`：GitHub Actions 自动任务，每 6 小时更新一次数据，也支持手动触发。

### YouTube 真实热点接入

GitHub 仓库需要配置 Secret：

```text
YOUTUBE_API_KEY
```

配置后，GitHub Actions 会按重点市场调用 YouTube Data API 的 `videos.list` 热门榜接口，抓取印度、印尼、南美、SSA、俄罗斯等国家/地区的热门视频，并自动映射成看板热点：

- 热点名称：YouTube 视频标题
- 地区/国家：按 `regionCode` 映射
- 来源：YouTube
- 热度：播放量
- 趋势/模板潜力：基于播放量、互动量和榜单排名计算
- 提示词：根据标题关键词生成初版主题创作方向

如果没有配置 `YOUTUBE_API_KEY`，脚本会自动跳过 YouTube 抓取，保留当前示例数据和定时刷新结构。

### Google Trends 真实热点接入

Google Trends 使用公开 RSS 趋势源，不需要额外配置 Secret。GitHub Actions 每次更新时会按重点市场抓取搜索趋势，并自动映射成看板热点：

- 热点名称：Google Trends 搜索词
- 地区/国家：按 `geo` 映射
- 来源：Google Trends
- 热度：RSS 中的 `approx_traffic`
- 趋势/模板潜力：基于搜索热度、地区和排序计算
- 原始链接：点击热点标题或来源标签可打开对应 Google Trends 查询页
- 新闻线索：保留 RSS 关联新闻标题、媒体源和新闻链接，用于设计师判断视觉符号

### 本地平台 / 本地媒体真实热点接入

本地平台目前先用 Google News RSS 作为合规公开来源，不需要额外 Secret。它会按印度、印尼、南美、SSA、俄罗斯等重点国家抓取本地媒体热点，用于补充本地语境：

- 来源：本地平台
- 热点名称：本地媒体新闻标题
- 地区/国家：按新闻 RSS 的 `gl/ceid` 映射
- 原始链接：点击热点标题或来源标签可进入新闻源页面
- 价值：帮助运营判断本地文化、体育、音乐、影视、时尚等热点是否值得转模板

### 其他社媒平台真实接入

X / Instagram / Facebook / TikTok 都需要官方开发者权限和 token。代码连接器已经写好，拿到权限后在 GitHub 仓库 Secrets 里补齐即可启用：

```text
X_BEARER_TOKEN
META_ACCESS_TOKEN
INSTAGRAM_BUSINESS_ACCOUNT_ID
FACEBOOK_PAGE_IDS
TIKTOK_ACCESS_TOKEN
```

启用逻辑：

- X：调用 X API recent search，获取实时讨论与互动数据。
- Instagram：调用 Instagram Graph API 的 hashtag search / recent media，获取视觉内容线索。
- Facebook：调用 Facebook Graph API 的 Page posts，获取公开页面传播数据。
- TikTok：调用 TikTok Research API，获取短视频播放、互动、标签数据。

如果 Secret 未配置，脚本会明确跳过该平台，不会生成假数据。

后续接入更多热点源时，只需要扩展 `scripts/update-hotspots.js` 里的 `fetchExternalSignals()`：

- 飞书表格 / 内部 CMS：用于运营手动入选、备注、复盘和样图资产管理。

> 当前 YouTube、Google Trends、本地平台/本地媒体已接入真实来源；TikTok / Instagram / X / Facebook 已完成接口框架，等待官方权限和 token。
