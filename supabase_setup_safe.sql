-- ============================================================
-- 办公面板 Supabase 数据库安全配置脚本（安全重置版）
-- 此脚本会先删除已存在的策略，再重新创建
-- ============================================================

-- 1. 确保 user_data 表存在
CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- 3. 启用行级安全策略 (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 4. 删除所有已存在的策略（避免重复错误）
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;
DROP POLICY IF EXISTS "Enable all for all users" ON user_data;
DROP POLICY IF EXISTS "Public access" ON user_data;
DROP POLICY IF EXISTS "Allow all access" ON user_data;

-- 5. 创建安全策略
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 自动更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 验证配置（查看当前所有策略）
SELECT policyname, cmd as operation FROM pg_policies WHERE tablename = 'user_data';

-- 执行完成！应该显示4条策略：
-- Users can view own data | SELECT
-- Users can insert own data | INSERT
-- Users can update own data | UPDATE
-- Users can delete own data | DELETE