# 本地热点运营看板

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
- `scripts/update-hotspots.js`：热点数据更新器，负责刷新热度、趋势、状态和汇总指标；已支持 YouTube Data API、Google Trends RSS、Google News RSS、本地媒体 RSS、GDELT 新闻源，并预留 X / Instagram / Facebook 官方接口连接器。
- `data/manual-hotspots.json`：人工热点入口，运营/设计师可手动补充 TikTok、Instagram、X 等暂未授权平台上观察到的热点。

### 每日更新与样图策略

`.github/workflows/update-hotspots.yml` 会在**每天北京时间早上 09:00**自动抓取数据（也支持手动触发）。

- 日常只保留有持续热度、强视觉符号且适合转成 OS 主题/壁纸玩法的热点；小热点不进入样图推荐。
- 大热点以连续观察为主，通常可持续一周以上；确认仍在升温或有新视觉角度时，才更新对应样图。
- 大型节假日、赛事或文化节点可由运营在 `data/manual-hotspots.json` 提前 4–6 周加入观察，提前准备模板。
- 样图不是按数量硬性生成：人物、涂鸦、插画、异形构图、材质、场景、图标化或动态感主题，均由热点属性决定；没有合适热点时，保留已审核样图，不强行更新。
- 真实图片样图由图片生成流程产出后写入 `data/generated-samples.json`；抓取任务只刷新热点数据，不会用低质量占位图覆盖已审核样图。

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

本地平台目前先用 Google News RSS 作为合规公开来源，不需要额外 Secret。它会按印度、印尼、南美、SSA、俄罗斯等重点国家抓取本地媒体热点，并按体育、音乐、影视、时尚、节日等垂类扩展，用于补充本地语境：

- 来源：本地平台
- 热点名称：本地媒体新闻标题
- 地区/国家：按新闻 RSS 的 `gl/ceid` 映射
- 原始链接：点击热点标题或来源标签可进入新闻源页面
- 价值：帮助运营判断本地文化、体育、音乐、影视、时尚等热点是否值得转模板

### GDELT 全球新闻源

GDELT 用于补充跨语言、跨国家的新闻热度信号，不需要额外 Secret。脚本会抓取近 24 小时内与体育、音乐、影视、时尚、节日、艺术等相关的全球新闻。

注意：GDELT 对请求频率有保护。如果临时限流，脚本会自动跳过 GDELT，不影响 YouTube、Google Trends、本地媒体等其他真实来源继续更新。

### 人工热点入口

如果 TikTok / Instagram / X 暂时拿不到官方 token，可以先用 `data/manual-hotspots.json` 人工补充：

```json
{
  "enabled": true,
  "name": "热点名称",
  "region": "南美洲",
  "country": "巴西",
  "source": "TikTok 人工观察",
  "url": "https://...",
  "heat": "人工判断",
  "trend": 45,
  "score": 88,
  "selected": true,
  "note": "为什么值得转模板"
}
```

这条数据会以「人工录入」来源进入看板，并保留原始链接。后续也可以把飞书表格同步到这个 JSON。

### 其他社媒平台真实接入

当前真实接入状态：

| 平台 | 当前状态 | 数据范围 |
| --- | --- | --- |
| X | 代码已完成，等待 Bearer Token | 最近 7 天公开讨论的 Recent Search |
| Instagram | 代码已完成，等待 Meta 权限与专业账号 | 指定 Hashtag 的近期媒体，不是全网热榜 |
| Facebook | 代码已完成，等待 Meta 权限与主页 ID | 指定 Facebook Page 的帖子，不是全网热榜 |
| TikTok | 不直接启用 Research API | 商业运营账号不满足 Research API 资格；先用人工观察或合规数据供应商 |

X / Instagram / Facebook 拿到官方权限后，在 GitHub 仓库 Secrets 里补齐：

```text
X_BEARER_TOKEN
META_ACCESS_TOKEN
```

`INSTAGRAM_BUSINESS_ACCOUNT_ID` 与 `FACEBOOK_PAGE_IDS` 现在是可选项。未配置时，脚本会使用 `META_ACCESS_TOKEN` 调用 `/me/accounts`，自动识别当前账号可管理的 Facebook Page，以及与 Page 关联的 Instagram 专业账号。需要限制监控范围时，再手动配置 `FACEBOOK_PAGE_IDS`（多个 ID 用英文逗号分隔）。

启用逻辑：

- X：在 X Developer Console 创建 App，生成 Bearer Token；脚本调用 X API Recent Search 获取公开讨论与互动数据。
- Instagram：需要 Meta App、Instagram 专业账号及关联 Facebook Page；令牌至少需要 `instagram_basic`、`pages_show_list`、`pages_read_engagement`。如果 Page 归属于 Business Portfolio，还需要 `business_management`。脚本调用 Instagram Graph API 的 Hashtag Search / Recent Media 获取视觉内容线索。
- Facebook：同一令牌会自动发现当前账号可管理的 Page；脚本调用 Facebook Graph API 的 Page Posts 获取指定主页传播数据。
- TikTok：Research API 面向符合条件的非营利研究人员，Token 也不适合当前长期定时任务；当前不把它冒充为已开通的商业实时源。

如果 Secret 未配置，脚本会明确跳过该平台，不会生成假数据。

配置完成后，可在 GitHub Actions 手动运行 `Check social platform access`。它只检查权限是否可用，不会显示或保存 Token。

后续接入更多热点源时，只需要扩展 `scripts/update-hotspots.js` 里的 `fetchExternalSignals()`：

- 飞书表格 / 内部 CMS：用于运营手动入选、备注、复盘和样图资产管理。

> 当前 YouTube、Google Trends、本地平台/本地媒体、GDELT、人工热点入口已接入或可用；X / Instagram / Facebook 已完成正式接口框架，等待官方权限和 token。TikTok 保留人工观察或合规供应商接入，不使用不符合商业运营资格的 Research API。
