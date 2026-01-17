import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname} from 'path';
import AdmZip from 'adm-zip';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';

const MAC_HIDDEN_PATTERNS = [
  /^\.DS_Store$/,
  /^\._/,
  /^\.Spotlight-/,
  /^\.Trashes$/,
  /^\.fseventsd$/,
  /^\.TemporaryItems$/,
  /^\.DocumentRevisions-/,
  /^__MACOSX$/,
];

export function isMacHiddenFile(filename) {
  const basename = path.basename(filename);
  return MAC_HIDDEN_PATTERNS.some(pattern => pattern.test(basename));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const SKILLS_DIR = path.join(DATA_DIR, 'skills');
const DB_PATH = path.join(DATA_DIR, 'db.json');

export function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function parseMarkdown(content) {
  const { data, content: body } = matter(content);
  return {
    frontmatter: data,
    content: body
  };
}

export async function processUploadedFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const skillId = uuidv4();
  const skillDir = path.join(SKILLS_DIR, skillId);
  
  fs.mkdirSync(skillDir, { recursive: true });
  
  let skillData = {
    id: skillId,
    name: '',
    description: '',
    tags: [],
    type: 'md',
    starred: false,
    deleted: false,
    deletedAt: null,
    createdAt: new Date().toISOString()
  };
  
  if (ext === '.md') {
    const destPath = path.join(skillDir, file.originalname);
    fs.writeFileSync(destPath, file.buffer);
    
    const parsed = parseMarkdown(file.buffer.toString());
    skillData.name = parsed.frontmatter.name || parsed.frontmatter.description || path.basename(file.originalname, '.md');
    skillData.description = parsed.frontmatter.description || '';
    skillData.type = 'md';
    skillData.mainFile = file.originalname;
    
  } else if (ext === '.skill' || ext === '.zip') {
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();
    for (const entry of entries) {
      const entryName = entry.entryName;
      const pathParts = entryName.split(/[\/\\]/);
      const hasHiddenPart = pathParts.some(part => isMacHiddenFile(part));
      if (!hasHiddenPart && !entry.isDirectory) {
        zip.extractEntryTo(entry, skillDir, true, true);
      }
    }
    
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const parsed = parseMarkdown(content);
      skillData.name = parsed.frontmatter.name || 'Unnamed Skill';
      skillData.description = parsed.frontmatter.description || '';
    } else {
      const files = fs.readdirSync(skillDir);
      const mdFile = files.find(f => f.endsWith('.md'));
      if (mdFile) {
        const content = fs.readFileSync(path.join(skillDir, mdFile), 'utf-8');
        const parsed = parseMarkdown(content);
        skillData.name = parsed.frontmatter.name || path.basename(mdFile, '.md');
        skillData.description = parsed.frontmatter.description || '';
        skillData.mainFile = mdFile;
      } else {
        skillData.name = path.basename(file.originalname, ext);
      }
    }
    skillData.type = 'folder';
    skillData.mainFile = skillData.mainFile || 'SKILL.md';
  }
  
  return skillData;
}

export function getSkillContent(skillId) {
  const db = readDB();
  const skill = db.skills.find(s => s.id === skillId);
  if (!skill) return null;
  
  const skillDir = path.join(SKILLS_DIR, skillId);
  const mainFile = skill.mainFile || 'SKILL.md';
  const mainFilePath = path.join(skillDir, mainFile);
  
  let content = '';
  if (fs.existsSync(mainFilePath)) {
    content = fs.readFileSync(mainFilePath, 'utf-8');
  }
  
  let files = [];
  if (fs.existsSync(skillDir)) {
    files = getAllFiles(skillDir, skillDir);
  }
  
  return { ...skill, content, files };
}

function getAllFiles(dir, baseDir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (isMacHiddenFile(item)) continue;
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, baseDir, fileList);
    } else {
      fileList.push(relativePath);
    }
  }
  return fileList;
}

export function deleteSkillFiles(skillId) {
  const skillDir = path.join(SKILLS_DIR, skillId);
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true });
  }
}

export async function createSkillFromContent(name, description, content) {
  const skillId = uuidv4();
  const skillDir = path.join(SKILLS_DIR, skillId);
  
  fs.mkdirSync(skillDir, { recursive: true });
  
  const mdContent = `---
name: ${name}
description: ${description || ''}
---

${content || ''}
`;
  
  const fileName = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}.md`;
  const filePath = path.join(skillDir, fileName);
  fs.writeFileSync(filePath, mdContent);
  
  return {
    id: skillId,
    name: name.trim(),
    description: description || '',
    tags: [],
    type: 'md',
    mainFile: fileName,
    starred: false,
    deleted: false,
    deletedAt: null,
    createdAt: new Date().toISOString()
  };
}

export function getFileContent(skillId, filePath) {
  const skillDir = path.join(SKILLS_DIR, skillId);
  const fullPath = path.join(skillDir, filePath);
  
  const resolvedPath = path.resolve(fullPath);
  const resolvedSkillDir = path.resolve(skillDir);
  if (!resolvedPath.startsWith(resolvedSkillDir)) {
    throw new Error('Invalid file path');
  }
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return null;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  
  return {
    content,
    ext,
    name: path.basename(filePath)
  };
}
