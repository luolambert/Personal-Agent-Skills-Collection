import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TAGS_PATH = path.join(__dirname, '../../data/tags.json');

function getConfig() {
  const baseUrl = process.env.LLM_BASE_URL;
  return {
    baseUrl,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
    provider: baseUrl ? detectProvider(baseUrl) : null
  };
}

function detectProvider(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('anthropic')) return 'anthropic';
  if (lowerUrl.includes('openai') || lowerUrl.includes('openrouter')) return 'openai';
  if (lowerUrl.includes('googleapis') || lowerUrl.includes('generativelanguage')) return 'google';
  return 'anthropic';
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
  
  const prompt = `# 任务：为 AI Agent Skill 生成精准分类标签

## 背景：什么是 Agent Skills？

Agent Skills 是 AI 编程助手（如 Claude Code、Cursor、Windsurf、Antigravity）的**模块化能力扩展**。每个 Skill 是一个结构化的专业知识包，通过 SKILL.md 文件定义，让 AI Agent 在特定场景下动态加载专业能力。

### SKILL.md 标准结构
- **Frontmatter（YAML 元数据）**：name（动词+名词命名）、description（触发条件）、version、categories
- **触发器（Triggers）**：关键词/短语，告诉 Agent 何时加载此 Skill
- **内容主体**：决策流程、操作指南、子文档路由、完成标准检查清单
- **输入/输出**：Skill 期望的输入和产出

Skills 使 AI Agent 从简单的代码补全工具升级为**具有规划、执行、自我纠正能力的自主编程伙伴**。

---

## 标签分类体系（6 大维度）

请从以下维度分析 Skill 并选择最匹配的标签：

### 1. 功能域（必选 1-2 个）
描述此 Skill 帮助 Agent 完成**什么类型**的任务：
- 代码生成、代码规范、代码审查、重构优化
- 测试编写、调试排错、性能优化
- 项目架构、模块设计、依赖管理
- 文档编写、注释规范、API 设计
- 构建部署、CI/CD、环境配置
- 动画实现、UI 设计、样式规范

### 2. 触发场景（必选 1 个）
描述**何时**会触发加载此 Skill：
- 新项目创建、新模块开发、功能迭代
- 代码评审、合并请求、技术债务清理
- Bug 修复、性能瓶颈、安全审计
- 架构决策、技术选型、方案设计

### 3. 技术栈（如适用）
涉及的**特定技术**，有则标注：
- 前端：React、Vue、CSS、TypeScript
- 动画：Framer Motion、GSAP、CSS Animation
- 后端：Node.js、Python、Go
- 工具：ESLint、Webpack、Git

### 4. 复杂度级别（可选）
此 Skill 处理的任务复杂度：
- 简单任务（规则驱动，如格式化）
- 中等任务（需要上下文理解）
- 复杂任务（需要规划和多步骤执行）

### 5. 自动化程度（可选）
Skill 的自主执行程度：
- 高自主（Agent 可独立完成）
- 中自主（需部分确认）
- 低自主（需人工审批）

### 6. 特殊属性（可选）
- 核心规范（必读类 Skill）
- 最佳实践（推荐遵循）
- 决策支持（提供选择建议）

---

## 标签规范

1. **长度**：2-6 个中文字符
2. **精准性**：优先使用**精确描述 Skill 独特价值**的标签
3. **避免宽泛**：禁止使用「开发」「编程」「代码」等过于通用的标签
4. **复用优先**：如现有标签库中有语义匹配的标签，优先使用，避免创建近义词标签
5. **技术栈格式**：技术名称保持原样（React、GSAP），不要翻译

## 现有标签库（请优先从中选择）
${existingTags.length > 0 ? existingTags.join('、') : '暂无现有标签'}

---

## Few-shot 示例

**示例 1**：
- 名称：applying-code-standards
- 描述：Enforces SOLID, DRY, KISS principles and React component patterns
- 输出标签：["代码规范", "SOLID原则", "React", "代码审查", "核心规范"]

**示例 2**：
- 名称：implementing-animations
- 描述：Implements animations using Framer Motion or GSAP
- 输出标签：["动画实现", "Framer Motion", "GSAP", "UI交互"]

**示例 3**：
- 名称：structuring-projects
- 描述：Designs project architecture and module organization
- 输出标签：["项目架构", "模块设计", "新项目创建"]

---

## 待分析的 Skill

**名称**：${skillInfo.name}
**描述**：${skillInfo.description || '无描述'}

**完整内容**：
\`\`\`markdown
${skillInfo.contentPreview || '无内容'}
\`\`\`

---

## 输出要求

分析以上 Skill 内容，生成 3-6 个最能精准描述此 Skill 的中文标签。
- 必须包含：1-2 个功能域标签 + 1 个触发场景标签
- 如涉及特定技术：添加技术栈标签
- 如是核心规范类：添加「核心规范」标签

**严格按以下格式返回，不要任何其他内容**：
["标签1", "标签2", "标签3", "标签4"]`;

  try {
    const { endpoint, headers, body } = buildRequest(config, prompt);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      console.error('LLM API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    const text = extractText(data, config.provider);
    
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

function buildRequest(config, prompt) {
  const { baseUrl, apiKey, model, provider } = config;
  
  switch (provider) {
    case 'openai':
      return {
        endpoint: `${baseUrl}/v1/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: {
          model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        }
      };
    
    case 'google':
      return {
        endpoint: `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
        headers: { 'Content-Type': 'application/json' },
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 }
        }
      };
    
    case 'anthropic':
    default:
      return {
        endpoint: `${baseUrl}/v1/messages`,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: {
          model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        }
      };
  }
}

function extractText(data, provider) {
  switch (provider) {
    case 'openai':
      return data.choices?.[0]?.message?.content || '';
    case 'google':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'anthropic':
    default:
      return data.content?.[0]?.text || '';
  }
}

export function updateTagsFile(newTags) {
  const existingTags = getTags();
  const allTags = [...new Set([...existingTags, ...newTags])];
  fs.writeFileSync(TAGS_PATH, JSON.stringify({ tags: allTags }, null, 2));
}
