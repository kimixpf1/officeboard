# Todolist

## 已完成（v5.16 第三批优化）
- ✅ ocr.js `applyRecognitionActionPlan` 批量写入替代逐条串行
- ✅ ocr.js `buildRecognitionActionPlan` 按类型 Map 分组去重
- ✅ ocr.js `checkDuplicateItem` 移除冗余类型判断
- ✅ db.js `getItemsByType` 走 IndexedDB type 索引
- ✅ 版本提升到 v5.16，资源版本更新
- ✅ node --check / diagnostics 0 错误
- ✅ 已提交推送 `f400b07` 到 origin/main
- ✅ 线上验证通过

## 已完成（v5.15）
- ✅ CSP 添加 open-meteo 免费天气回退
- ✅ sync.js 三个恢复点添加 loadApiKeysFromDB + updateApiKeyStatus
- ✅ app.js checkApiKey 主动调用 loadApiKeysFromDB
- ✅ mergeData 补充 crypto_master_key 恢复
- ✅ 已提交推送 `a4be34e` 到 origin/main

## 已完成（v5.14）
- ✅ DeepSeek/Kimi API Key 加密存储
- ✅ 云端同步不再传输明文 API Key
- ✅ 密码记住降级为加密可用时才记住
- ✅ upload-flow.js innerHTML escapeHtml 防 XSS
- ✅ CSP meta 标签
- ✅ 已提交推送 `398302e` 到 origin/main

## 后续优化计划（待执行）
- 第四批：体验细节打磨（删除文案优化、预览增量更新、内联 style 迁移）
- 第五批：代码健康度（escapeHtml 去重、领导优先级统一、副数据同步去重）

## 待用户线上验证（v5.16）
- 浏览器强刷确认版本号 `2026-05-03 v5.16`
- 实际 OCR 识别测试：上传图片/PDF 验证批量写入正常
- 验证会议去重仍准确（不误判、不漏判）

## 已跳过
- 暂不在本轮继续拆分 OCR、同步、表单弹窗等高耦合链路
