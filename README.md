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
- `scripts/update-hotspots.js`：热点数据更新器，负责刷新热度、趋势、状态和汇总指标；已支持 YouTube Data API。
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

后续接入更多热点源时，只需要扩展 `scripts/update-hotspots.js` 里的 `fetchExternalSignals()`：

- Google Trends / YouTube Trends：用于趋势和搜索热度。
- TikTok / Instagram / X：用于视觉符号、传播速度和社媒热度，通常需要第三方或内部数据权限。
- 飞书表格 / 内部 CMS：用于运营手动入选、备注、复盘和样图资产管理。

> 当前数据仍是产品评审用的可运行示例数据；结构已经支持长期运营，真实上线前建议补齐合规数据源、团队权限、数据库和操作日志。
