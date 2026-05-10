# Todolist

## 已完成（v5.52 PDF 地点识别修复）
- ✅ `isLocationLikeCell` 辅助函数——判断 PDF 单元格是否为会议地点
- ✅ `extractPDFTableRows` 延续行改为"续："标记独立输出，AI 语义合并
- ✅ y-tolerance 从 0.30 放宽到 `Math.max(4, height * 0.55)`
- ✅ AI prompt 修正表格列结构（着装要求在会议名称列，非地点列）
- ✅ DeepSeek 模型切换到 v4-flash，禁用 thinking mode
- ✅ 自动备份开关（默认每晚 20:00 开启）
- ✅ 本地 v4-flash 测试通过：司法局 PDF 地点正确识别
- ✅ 已提交推送 `9418994` 到 origin/main

## 已完成（v5.52 会话收尾）
- ✅ 项目规则从 `.trae/rules/` 迁移到 `.claude/rules/`
- ✅ 迭代日志补齐 5/7-5/10 缺失条目
- ✅ 用量报告修复：不再 rm state 文件
- ✅ `/unsafe` 模式启用
- ✅ 永久记忆：会话结束必写 todo + framework + 迭代日志

## 待执行（P0 高优先）
- 🔴 部分部门名称（"办公室""机关党委"）在 PDF 识别中仍可能被误判为地点——需优化 `isLocationLikeCell`
- 🔴 Supabase CDN 本地化（index.html + vendor/）
- 🔴 参会人关联准确性优化（AI 识别结果中参会人与会议匹配不够精确——已存在的老问题）

## 待执行（P1-P3）
- 🟡P1 loadItems 防抖合并
- 🟡P1 console.log 生产环境静默
- 🟡P2 定时器合并
- 🟢P3 app.js 按功能域拆分

## 已跳过
- 暂不在本轮拆分 OCR、同步、表单弹窗等高耦合链路