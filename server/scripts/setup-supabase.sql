-- ========================================
-- Supabase 数据库初始化脚本
-- ========================================
-- 使用方法：在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 创建 skills 表
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('md', 'folder')),
  main_file TEXT,
  starred BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 创建 skill_tags 关联表
CREATE TABLE IF NOT EXISTS skill_tags (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, tag_id)
);

-- 4. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_starred ON skills(starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_skills_deleted ON skills(deleted) WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_skill_tags_skill ON skill_tags(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_tags_tag ON skill_tags(tag_id);

-- 5. 创建 Storage bucket (注意：这需要在 Supabase Dashboard 中手动创建)
-- Bucket 名称: skills-files
-- Public: true (允许公开访问)

-- Storage Policies 会自动应用，如果需要自定义，可以在 Storage Settings 中配置

-- 完成！数据库结构已创建
