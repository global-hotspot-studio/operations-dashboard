# Meta Page Public Content Access 审核材料

## 申请功能

`Page Public Content Access`

## 合理用途

本地热点机会中心分析并展示 Facebook 公共主页的公开帖子及互动汇总，用于识别印度、印度尼西亚、俄罗斯、中东、撒哈拉以南非洲和拉美地区的长期热点、固定节日及内容趋势。系统不读取个人主页或私密内容，不用于身份识别、用户画像、广告定向或数据销售。

## 用户体验

1. 审核人员打开 `https://global-hotspot-studio.github.io/operations-dashboard/`。
2. 点击“拉取最新”查看 Instagram 与 Facebook 数据源状态。
3. 在“实时热点池”选择 Facebook，查看由重点市场公共主页公开帖子生成的热点条目。
4. 打开条目详情，核对公共主页名称、发布时间、公开互动汇总和原始帖子链接。
5. 在“配置中心”查看覆盖的目标地区。

## API 调用

- `GET /pages/search`：按照 `data/facebook-public-pages.json` 中的媒体、娱乐和文化主页名称定位公共主页。
- `GET /{page-id}/feed`：读取命中的非自有公共主页公开帖子。
- 请求使用受保护的 `META_ACCESS_TOKEN` 与由 `META_APP_SECRET` 生成的 `appsecret_proof`。

## 数据最小化

- 保存帖子文本摘要、公开链接、发布时间、Page 编号/名称及反应、评论、分享汇总。
- 不保存个人用户资料，不读取私信或非公开内容。
- 页面数据随定时更新替换；不再需要的数据从当前数据集中移除。
- Token 和 App Secret 仅保存在 GitHub Actions Secrets，不写入仓库或日志。

## 审核前检查

- [ ] 公司验证已完成。
- [ ] App 已由业务资产组合认领。
- [ ] 隐私政策 URL 已填写。
- [ ] 服务条款 URL 已填写。
- [ ] 用户数据删除 URL 已填写。
- [ ] `META_APP_SECRET` 已写入 GitHub Actions Secret。
- [ ] 管理主页中至少有一条公开测试帖子，供审核人员验证现有 Page 数据流程。
- [ ] 录制端到端审核视频，展示主页来源、抓取动作、结果和原始链接。
- [ ] 提交 `Page Public Content Access` App Review。
