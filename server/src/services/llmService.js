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
  
  const prompt = `请为这个 Skill 生成 3-5 个中文标签。
查看现有标签，看是否有相匹配的，避免创建与现有标签意思相近的标签。

现有标签: ${existingTags.join(', ') || '暂无'}

Skill 名称: ${skillInfo.name}
Skill 描述: ${skillInfo.description || '无描述'}
${skillInfo.contentPreview ? `内容预览: ${skillInfo.contentPreview.slice(0, 300)}` : ''}

返回格式: ["标签1", "标签2", "标签3"]
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
