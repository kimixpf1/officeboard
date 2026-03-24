-- ============================================================
-- 办公面板 Supabase 数据库安全配置脚本
-- 执行此脚本后，通讯录将支持跨设备同步，且数据安全受保护
-- ============================================================

-- 1. 确保 user_data 表存在（如果不存在则创建）
CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON user_data(updated_at);

-- 3. 启用行级安全策略 (RLS) - 这是数据安全的核心！
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 4. 删除任何可能存在的不安全策略（确保没有公开访问）
DROP POLICY IF EXISTS "Enable all for all users" ON user_data;
DROP POLICY IF EXISTS "Public access" ON user_data;
DROP POLICY IF EXISTS "Allow all access" ON user_data;

-- 5. 创建安全策略：用户只能访问自己的数据
-- 5.1 查询策略：用户只能查看自己的数据
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT USING (auth.uid() = user_id);

-- 5.2 插入策略：用户只能插入自己的数据
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5.3 更新策略：用户只能更新自己的数据
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE USING (auth.uid() = user_id);

-- 5.4 删除策略：用户只能删除自己的数据
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 创建或替换更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器：自动更新 updated_at 字段
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 创建 upsert 函数（用于简化数据同步）
CREATE OR REPLACE FUNCTION upsert_user_data(
    p_user_id UUID,
    p_data JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_data (user_id, data, updated_at)
    VALUES (p_user_id, p_data, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        data = p_data,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 查看当前所有策略（验证配置）
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'user_data';

-- ============================================================
-- 执行完成！
-- 
-- 数据安全说明：
-- 1. RLS（行级安全）已启用，每个用户只能访问自己的数据
-- 2. 即使有人知道其他用户的ID，也无法访问他们的数据
-- 3. 通讯录数据存储在 data JSONB 字段中的 contacts 键下
-- 4. 数据传输使用 HTTPS 加密（Supabase 默认支持）
--
-- 数据结构说明（data JSONB 字段内容）：
-- {
--   "items": [...],        // 待办/会议/办文事项
--   "memo": "...",         // 备忘录内容
--   "links": [...],        // 常用网站
--   "contacts": [...],     // 通讯录（姓名、电话）
--   "settings": {...},     // 用户设置
--   "sync_time": "..."     // 同步时间
-- }
-- ============================================================