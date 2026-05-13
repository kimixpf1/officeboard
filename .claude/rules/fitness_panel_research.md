# 运动面板自动同步可行性研究

> 研究日期：2026-05-12
> 状态：规划完成，待实施

## 核心结论

可以实现从佳明自动每天同步运动数据到办公面板。推荐方案是 **Intervals.icu 作为桥接层 + Supabase Edge Functions 定时拉取**。

## 各平台接入现状

| 平台 | API 开放程度 | 接入可行性 | 说明 |
|------|:----------:|:--------:|------|
| **Intervals.icu** | REST API 开放 | **高** | Swagger 文档、Python SDK、JS 数据模型 npm 包，支持 Garmin/Strava/Wahoo/Polar/Suunto 等多源同步 |
| **Garmin Connect** | 封闭（仅对企业） | 低 | 2026年3月部署Cloudflare防护，多数社区库被破坏。`python-garminconnect` v0.3.0+ 用 `curl_cffi` 伪造TLS指纹绕过，但属猫鼠游戏 |
| **华为运动健康** | 仅对企业开放 | 极低 | 需50万-500万注册资本 |
| **训记** | 无公开 API | 极低 | 只有图片分享报告和私有格式云备份 |
| **Apple Health** | 无 Web API | 极低 | 仅原生 iOS 可访问 |
| **Strava** | API 受限 | 中 | 2024年后收紧第三方数据展示限制 |

## 推荐架构：Intervals.icu 桥接

```
Garmin → Intervals.icu（用户一次性绑定）
       → REST API（Swagger 文档）
       → Supabase Edge Function (Deno)
       → Supabase fitness_activities 表
       → 前端面板读取展示
```

### 为什么走 Intervals.icu 而不是直连 Garmin

- Intervals.icu 已经解决了 Garmin SSO/Cloudflare 问题
- Intervals.icu 有正式的 REST API，无 Cloudflare 拦截
- Deno Edge Function 直接 `fetch()` 调用，无需 Python 依赖
- 数据维度齐全：活动详情、心率、功率、训练负荷(CTL/ATL/TSB)、HRV、睡眠
- 完全免费（可自愿捐赠）

### 定时同步链路

```
pg_cron (每天 08:00)
  → pg_net.http_post()
  → Edge Function: sync-fitness
    ├─ 读取 Vault 中的 intervals_icu_api_key
    ├─ GET /api/v1/athlete/{id}/activities
    ├─ 解析 → 写入 fitness_activities 表
    └─ 返回同步结果
```

## 实施计划

### 第一阶段：后端同步管道

- Supabase 新建 `fitness_activities` 表
- 编写 Edge Function `sync-fitness`（Deno/TS）
- 配置 pg_cron 每天定时触发
- API Key 存入 Supabase Vault
- 手动触发测试

### 第二阶段：前端运动面板

- 新增 `js/panels/fitness.js` 模块（mixin 模式）
- 右侧折叠面板 + 统计卡片 + Canvas 图表
- API Key 设置页（加密存储，复用 cryptoManager）
- "立即同步"按钮
- 移动端适配

### 数据结构设计

```javascript
{
  id: 'fitness_xxx',
  date: '2026-05-12',
  type: 'run' | 'cycle' | 'swim' | 'strength' | 'other',
  duration: 45,        // 分钟
  distance: 8.5,       // 公里
  calories: 420,       // 千卡
  avgHeartRate: 145,   // 可选
  source: 'intervals_icu' | 'manual',
  intervalsActivityId: 'xxx',  // Intervals.icu 活动 ID（去重用）
  notes: '',
  createdAt: '...'
}
```

## 待确认事项

1. 用户注册 Intervals.icu 免费账号，绑定 Garmin，获取 API Key
2. Supabase 项目是否支持 Edge Functions（免费版 500K 次/月）
3. pg_cron 扩展是否已启用
4. Intervals.icu API 的 CORS 支持情况（前端直连 vs Edge Function 代理）

## 参考资源

- Intervals.icu: https://intervals.icu/
- Intervals.icu API 文档: https://intervals.icu/api/v1/docs
- python-garminconnect: https://github.com/cyberjunky/python-garminconnect
- Supabase Edge Functions + pg_cron: https://supabase.com/docs/guides/functions
