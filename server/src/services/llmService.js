import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TAGS_PATH = path.join(__dirname, '../../data/tags.json');

function getConfig() {
  return {
    baseUrl: process.env.LLM_BASE_URL || 'http://127.0.0.1:8045',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gemini-3-flash'
  };
}

function getTags() {
  const data = JSON.parse(fs.readFileSync(TAGS_PATH, 'utf-8'));
  return data.tags || [];
}

export async function generateTags(skillInfo) {
  const config = getConfig();
  const existingTags = getTags();
  
  if (!config.apiKey) {
    console.warn('LLM_API_KEY not set, skipping tag generation');
    return [];
  }
  
  const prompt = `# 任务：为 AI Agent Skill 生成精准标签

## 什么是 Skills？
Skills 是 AI 编程助手（如 Claude Code、Antigravity）的模块化能力扩展。每个 Skill 是一个结构化的专业知识包，包含：
- **name**: 动词+名词命名（如 applying-code-standards）
- **description**: 触发条件描述，告诉 Agent 何时加载此 Skill
- **内容**: 决策流程、操作指南、子文档路由、完成标准检查清单

## 标签要求
1. **功能导向**：标签应描述此 Skill 帮助 Agent 完成什么任务（如：代码规范、动画实现、项目架构）
2. **场景导向**：标签应描述何时会用到此 Skill（如：代码审查、重构、新项目创建）
3. **技术栈**：如涉及特定技术，应标注（如：React、GSAP、Node.js）
4. **精准优先**：优先使用能精确描述此 Skill 独特价值的标签

## 标签规范
- 2-6 个汉字
- 避免过于宽泛的标签（如"开发"、"编程"）
- 避免与现有标签语义重复

## 现有标签库
${existingTags.length > 0 ? existingTags.join('、') : '暂无'}

## 待分析的 Skill

**名称**: ${skillInfo.name}
**描述**: ${skillInfo.description || '无描述'}

**完整内容**:
\`\`\`markdown
${skillInfo.contentPreview || '无内容'}
\`\`\`

## 输出
返回 3-5 个最能精准描述此 Skill 的中文标签。
格式: ["标签1", "标签2", "标签3"]
只返回 JSON 数组，不要其他内容。`;

  try {
    const response = await fetch(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      console.error('LLM API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    const match = text.match(/\[.*?\]/s);
    if (match) {
      const tags = JSON.parse(match[0]);
      return Array.isArray(tags) ? tags : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
}

export function updateTagsFile(newTags) {
  const existingTags = getTags();
  const allTags = [...new Set([...existingTags, ...newTags])];
  fs.writeFileSync(TAGS_PATH, JSON.stringify({ tags: allTags }, null, 2));
}
