#!/usr/bin/env node

/**
 * 社媒平台凭证自检。
 *
 * 只验证连接是否成功，不输出任何 Token，也不写入数据文件。
 */

const cleanSecret = value => (value || "").trim().replace(/^([\"\'])(.*)\1$/, "$2");

const xBearerToken = cleanSecret(process.env.X_BEARER_TOKEN);
const metaAccessToken = cleanSecret(process.env.META_ACCESS_TOKEN);
let instagramBusinessAccountId = cleanSecret(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
const facebookPageIds = (process.env.FACEBOOK_PAGE_IDS || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);
const metaGraphVersion = (process.env.META_GRAPH_VERSION || "v24.0").trim();
const metaPageAccessTokens = new Map();

let configuredFailures = 0;

function pending(name, detail) {
  console.log(`○ ${name}：待配置。${detail}`);
}

function passed(name, detail) {
  console.log(`✓ ${name}：连接成功。${detail}`);
}

function failed(name, error) {
  configuredFailures += 1;
  console.error(`✗ ${name}：连接失败。${error.message}`);
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${body.slice(0, 220)}`);
  }
  return body ? JSON.parse(body) : {};
}

async function checkX() {
  if (!xBearerToken) {
    pending("X", "需要 GitHub Secret：X_BEARER_TOKEN");
    return;
  }
  try {
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", "design -is:retweet");
    url.searchParams.set("max_results", "10");
    const json = await getJson(url, { authorization: `Bearer ${xBearerToken}` });
    passed("X", `Recent Search 可用，本次返回 ${json.data?.length || 0} 条。`);
  } catch (error) {
    if (error.message.includes("HTTP 402") && error.message.includes("credits depleted")) {
      configuredFailures += 1;
      console.error("△ X：Bearer Token 有效，但账户 API credits 已用尽。请在 X Developer Console 的 Billing → Credits 充值后重试。");
      return;
    }
    failed("X", error);
  }
}

async function discoverMetaAccounts() {
  if (!metaAccessToken) return;
  const permissionsUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/me/permissions`);
  permissionsUrl.searchParams.set("access_token", metaAccessToken);
  const permissionsJson = await getJson(permissionsUrl);
  const grantedPermissions = new Set(
    (permissionsJson.data || [])
      .filter(permission => permission.status === "granted")
      .map(permission => permission.permission)
  );
  const requiredPermissions = ["instagram_basic", "pages_show_list", "pages_read_engagement"];
  const missingPermissions = requiredPermissions.filter(permission => !grantedPermissions.has(permission));
  if (missingPermissions.length) {
    throw new Error(`Token 缺少权限：${missingPermissions.join(", ")}`);
  }

  const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", metaAccessToken);
  const json = await getJson(url);
  const pages = json.data || [];
  if (!pages.length) {
    const subjectUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/me`);
    subjectUrl.searchParams.set("fields", "id,instagram_business_account");
    subjectUrl.searchParams.set("metadata", "1");
    subjectUrl.searchParams.set("access_token", metaAccessToken);
    const subject = await getJson(subjectUrl);
    if (String(subject.metadata?.type || "").toLowerCase() === "page" && subject.id) {
      pages.push({
        id: String(subject.id),
        access_token: metaAccessToken,
        instagram_business_account: subject.instagram_business_account
      });
      console.log("○ Meta：检测到 Page Access Token，已切换为单 Page 接入模式。");
    }
  }
  if (!pages.length) {
    throw new Error("Token 权限已授予，但当前 Facebook 账号没有返回可管理的 Page；请检查 Page 管理权限及 Instagram 专业账号关联关系");
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
  passed("Meta", `自动识别 ${facebookPageIds.length} 个 Facebook Page${instagramBusinessAccountId ? "及关联的 Instagram 专业账号" : ""}。`);
}

async function checkInstagram() {
  if (!metaAccessToken || !instagramBusinessAccountId) {
    pending("Instagram", "需要 META_ACCESS_TOKEN，并确保 Facebook Page 已关联 Instagram 专业账号");
    return;
  }
  try {
    const searchUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/ig_hashtag_search`);
    searchUrl.searchParams.set("user_id", instagramBusinessAccountId);
    searchUrl.searchParams.set("q", "music");
    searchUrl.searchParams.set("access_token", metaAccessToken);
    const hashtag = (await getJson(searchUrl)).data?.[0];
    if (!hashtag?.id) throw new Error("Hashtag Search 未返回可用结果");
    const mediaUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/${hashtag.id}/recent_media`);
    mediaUrl.searchParams.set("user_id", instagramBusinessAccountId);
    mediaUrl.searchParams.set("fields", "id,permalink,timestamp");
    mediaUrl.searchParams.set("limit", "1");
    mediaUrl.searchParams.set("access_token", metaAccessToken);
    const json = await getJson(mediaUrl);
    passed("Instagram", `Hashtag Search 与近期媒体接口可用，本次返回 ${json.data?.length || 0} 条。`);
  } catch (error) {
    failed("Instagram", error);
  }
}

async function checkFacebook() {
  if (!metaAccessToken || !facebookPageIds.length) {
    pending("Facebook", "需要 META_ACCESS_TOKEN，并确保该账号可管理至少一个 Facebook Page");
    return;
  }
  try {
    const pageId = facebookPageIds[0];
    const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/${pageId}/posts`);
    url.searchParams.set("fields", "id,created_time");
    url.searchParams.set("limit", "1");
    url.searchParams.set("access_token", metaPageAccessTokens.get(String(pageId)) || metaAccessToken);
    const json = await getJson(url);
    passed("Facebook", `Page Posts 接口可用，本次返回 ${json.data?.length || 0} 条。`);
  } catch (error) {
    failed("Facebook", error);
  }
}

async function run() {
  console.log("社媒平台凭证自检（不会显示或保存 Token）");
  await checkX();
  if (metaAccessToken) {
    try {
      await discoverMetaAccounts();
    } catch (error) {
      failed("Meta", error);
    }
  } else {
    pending("Meta", "需要 GitHub Secret：META_ACCESS_TOKEN");
  }
  await checkInstagram();
  await checkFacebook();
  console.log("○ TikTok：未作为商业运营数据源启用。Research API 需要研究资质，且短时 Token 不适合当前每日定时链路。");
  process.exitCode = configuredFailures ? 1 : 0;
}

run().catch(error => {
  console.error(`自检异常：${error.message}`);
  process.exitCode = 1;
});
