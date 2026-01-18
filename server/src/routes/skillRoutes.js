import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { generateTags } from '../services/llmService.js';
import { updateTagsFile } from '../services/supabaseTagService.js';
import { createSkill, getSkillById, getAllSkills, updateSkill, deleteSkill, getSkillsWithGitHub, markSkillsUpdated } from '../services/supabaseSkillService.js';
import { uploadFile, downloadFile } from '../services/supabaseStorageService.js';
import { 
  parseGitHubUrl, 
  getLatestCommit, 
  downloadAndProcessFiles, 
  extractSkillName, 
  extractDescription,
  detectGitHubLinks,
  getDefaultBranch
} from '../services/githubService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

function isMacHiddenFile(filename) {
  const basename = path.basename(filename);
  return MAC_HIDDEN_PATTERNS.some(pattern => pattern.test(basename));
}

function parseMarkdown(content) {
  const { data, content: body } = matter(content);
  return {
    frontmatter: data,
    content: body
  };
}

router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('[Upload] Received files:', req.files?.map(f => f.originalname));
    
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const results = [];
    
    for (const file of files) {
      try {
        console.log(`[Upload] Processing file: ${file.originalname}`);
        const ext = path.extname(file.originalname).toLowerCase();
        const skillId = uuidv4();
        
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
        
        let contentForTags = '';
        
        if (ext === '.md') {
          console.log(`[Upload] Uploading .md file to Storage`);
          await uploadFile(skillId, file.originalname, file.buffer);
          
          const parsed = parseMarkdown(file.buffer.toString());
          skillData.name = parsed.frontmatter.name || parsed.frontmatter.description || path.basename(file.originalname, '.md');
          skillData.description = parsed.frontmatter.description || '';
          skillData.type = 'md';
          skillData.mainFile = file.originalname;
          contentForTags = parsed.content;
          
        } else if (ext === '.skill' || ext === '.zip') {
          console.log(`[Upload] Processing .skill/.zip file`);
          const zip = new AdmZip(file.buffer);
          const entries = zip.getEntries();
          
          // Upload all files
          console.log(`[Upload] Found ${entries.length} entries in ZIP`);
          for (const entry of entries) {
            const entryName = entry.entryName;
            const pathParts = entryName.split(/[\/\\]/);
            const hasHiddenPart = pathParts.some(part => isMacHiddenFile(part));
            
            if (!hasHiddenPart && !entry.isDirectory) {
              const fileData = entry.getData();
              console.log(`[Upload] Uploading file from ZIP: ${entryName}`);
              await uploadFile(skillId, entryName, fileData);
            }
          }
          
          // Extract metadata
          const skillMdEntry = entries.find(e => e.entryName.endsWith('SKILL.md') || e.entryName.endsWith('Skill.md'));
          if (skillMdEntry) {
            const content = skillMdEntry.getData().toString();
            const parsed = parseMarkdown(content);
            skillData.name = parsed.frontmatter.name || 'Unnamed Skill';
            skillData.description = parsed.frontmatter.description || '';
            skillData.mainFile = skillMdEntry.entryName;
            contentForTags = parsed.content;
          } else {
            const mdEntry = entries.find(e => e.entryName.endsWith('.md') && !e.isDirectory);
            if (mdEntry) {
              const content = mdEntry.getData().toString();
              const parsed = parseMarkdown(content);
              skillData.name = parsed.frontmatter.name || path.basename(mdEntry.entryName, '.md');
              skillData.description = parsed.frontmatter.description || '';
              skillData.mainFile = mdEntry.entryName;
              contentForTags = parsed.content;
            } else {
              skillData.name = path.basename(file.originalname, ext);
              skillData.mainFile = 'SKILL.md';
            }
          }
          skillData.type = 'folder';
        }
        
        // Generate tags
        console.log(`[Upload] Generating tags for: ${skillData.name}`);
        const tags = await generateTags({
          name: skillData.name,
          description: skillData.description,
          contentPreview: contentForTags.substring(0, 2000) // Limit preview length
        });
        
        skillData.tags = tags;
        if (tags.length > 0) {
          console.log(`[Upload] Generated ${tags.length} tags:`, tags);
          await updateTagsFile(tags);
        } else {
          console.warn(`[Upload] No tags generated for: ${skillData.name}`);
        }
        
        // Create skill in database
        console.log(`[Upload] Creating skill in database`);
        const createdSkill = await createSkill(skillData);
        results.push(createdSkill);
        console.log(`[Upload] Successfully created skill: ${skillData.name}`);
        
      } catch (fileError) {
        console.error(`[Upload] Error processing file ${file.originalname}:`, fileError);
        throw fileError;
      }
    }
    
    console.log(`[Upload] Upload completed successfully, returning ${results.length} skills`);
    res.json({ success: true, skills: results });
  } catch (error) {
    console.error('[Upload] Upload error:', error);
    console.error('[Upload] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { name, description, content } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const skillId = uuidv4();
    const mdContent = `---
name: ${name}
description: ${description || ''}
---

${content || ''}
`;
    
    const fileName = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}.md`;
    await uploadFile(skillId, fileName, Buffer.from(mdContent));
    
    const skillData = {
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
    
    const tags = await generateTags({
      name: skillData.name,
      description: skillData.description,
      contentPreview: content
    });
    
    skillData.tags = tags;
    if (tags.length > 0) {
      await updateTagsFile(tags);
    }
    
    const createdSkill = await createSkill(skillData);
    
    res.json({ success: true, skill: createdSkill });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Create failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, tags, starred } = req.query;
    const skills = await getAllSkills({ search, tags, starred });
    res.json({ skills });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    let content = '';
    if (skill.mainFile) {
      const fileBuffer = await downloadFile(skill.id, skill.mainFile).catch(() => null);
      if (fileBuffer) {
        content = fileBuffer.toString();
      }
    }
    
    res.json({ ...skill, content });
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

router.put('/:id/star', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    const updated = await updateSkill(req.params.id, { 
      starred: !skill.starred 
    });
    
    res.json({ success: true, starred: updated.starred });
  } catch (error) {
    console.error('Star error:', error);
    res.status(500).json({ error: 'Failed to update star' });
  }
});

router.put('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;
    const updated = await updateSkill(req.params.id, { tags });
    res.json({ success: true, tags: updated.tags });
  } catch (error) {
    console.error('[Tags Update] Error:', error);
    res.status(500).json({ error: 'Failed to update tags', message: error.message });
  }
});

router.post('/:id/regenerate-tags', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    let contentPreview = '';
    if (skill.mainFile) {
      const fileBuffer = await downloadFile(skill.id, skill.mainFile).catch(() => null);
      if (fileBuffer) {
        contentPreview = fileBuffer.toString();
      }
    }
    
    const tags = await generateTags({
      name: skill.name,
      description: skill.description,
      contentPreview
    });
    
    if (tags.length === 0) {
      return res.json({ 
        success: false, 
        message: 'LLM API 不可用，无法生成标签。请检查环境变量配置或稍后重试。',
        tags: [] 
      });
    }
    
    const updated = await updateSkill(req.params.id, { tags });
    await updateTagsFile(tags);
    
    res.json({ success: true, tags: updated.tags });
  } catch (error) {
    console.error('Regenerate tags error:', error);
    res.status(500).json({ error: 'Failed to regenerate tags' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const skill = await deleteSkill(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    const expireAt = new Date(new Date(skill.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    res.json({ success: true, message: 'Skill moved to trash', expireAt: expireAt.toISOString() });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { skillIds } = req.body;
    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({ error: 'No skills selected' });
    }
    
    const zip = new AdmZip();
    
    for (const skillId of skillIds) {
      const skill = await getSkillById(skillId);
      if (!skill) continue;
      
      for (const file of skill.files) {
        const fileBuffer = await downloadFile(skillId, file);
        zip.addFile(`${skill.name}/${file}`, fileBuffer);
      }
    }
    
    const zipBuffer = zip.toBuffer();
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="skills.zip"'
    });
    res.send(zipBuffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export skills' });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const fileBuffer = await downloadFile(req.params.id, filePath);
    if (!fileBuffer) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const content = fileBuffer.toString();
    
    res.json({
      content,
      ext,
      name: path.basename(filePath)
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.post('/import-github', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }
    
    console.log('[GitHub Import] Parsing URL:', url);
    const { owner, repo, path: repoPath, branch: urlBranch, type } = parseGitHubUrl(url);
    
    const branch = urlBranch || await getDefaultBranch(owner, repo);
    console.log('[GitHub Import] Using branch:', branch);
    
    console.log('[GitHub Import] Downloading files...');
    const files = await downloadAndProcessFiles(owner, repo, repoPath, branch);
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'No valid files found in repository' });
    }
    
    const skillId = uuidv4();
    
    let skillName = '';
    let skillDescription = '';
    let mainFile = '';
    let contentForTags = '';
    
    const skillMd = files.find(f => f.name === 'SKILL.md' || f.name === 'Skill.md');
    if (skillMd) {
      skillName = extractSkillName(skillMd.content) || repo;
      skillDescription = extractDescription(skillMd.content);
      mainFile = skillMd.path;
      contentForTags = skillMd.content;
    } else {
      const anyMd = files.find(f => f.name.endsWith('.md'));
      if (anyMd) {
        skillName = extractSkillName(anyMd.content) || repo;
        skillDescription = extractDescription(anyMd.content);
        mainFile = anyMd.path;
        contentForTags = anyMd.content;
      } else {
        skillName = repo;
        mainFile = files[0].path;
      }
    }
    
    console.log('[GitHub Import] Uploading files to storage...');
    for (const file of files) {
      await uploadFile(skillId, file.path, Buffer.from(file.content));
    }
    
    const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
    
    const skillData = {
      id: skillId,
      name: skillName,
      description: skillDescription,
      tags: [],
      type: files.length > 1 ? 'folder' : 'md',
      mainFile,
      starred: false,
      deleted: false,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      githubUrl: url,
      githubLastCommit: latestCommit,
      githubLastCheck: new Date().toISOString(),
      hasUpdate: false,
      isCustomized: false
    };
    
    console.log('[GitHub Import] Generating tags...');
    const tags = await generateTags({
      name: skillData.name,
      description: skillData.description,
      contentPreview: contentForTags.substring(0, 2000)
    });
    
    skillData.tags = tags;
    if (tags.length > 0) {
      await updateTagsFile(tags);
    }
    
    console.log('[GitHub Import] Creating skill in database...');
    const createdSkill = await createSkill(skillData);
    
    console.log('[GitHub Import] Success:', skillName);
    res.json({ success: true, skill: createdSkill });
  } catch (error) {
    console.error('[GitHub Import] Error:', error);
    res.status(500).json({ error: 'Failed to import from GitHub', message: error.message });
  }
});

router.get('/import-github-stream', async (req, res) => {
  const { url } = req.query;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (progress, text) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', progress, text })}\n\n`);
  };

  const sendComplete = (result) => {
    res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
    res.end();
  };

  const sendError = (message) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    res.end();
  };

  try {
    if (!url) {
      return sendError('GitHub URL is required');
    }
    
    sendProgress(5, '解析链接...');
    const { owner, repo, path: repoPath, branch: urlBranch } = parseGitHubUrl(url);
    
    sendProgress(10, '获取仓库信息...');
    const branch = urlBranch || await getDefaultBranch(owner, repo);
    
    sendProgress(20, '下载文件...');
    const files = await downloadAndProcessFiles(owner, repo, repoPath, branch);
    
    if (files.length === 0) {
      return sendError('No valid files found in repository');
    }
    
    sendProgress(50, '处理文件内容...');
    const skillId = uuidv4();
    
    let skillName = '';
    let skillDescription = '';
    let mainFile = '';
    let contentForTags = '';
    
    const skillMd = files.find(f => f.name === 'SKILL.md' || f.name === 'Skill.md');
    if (skillMd) {
      skillName = extractSkillName(skillMd.content) || repo;
      skillDescription = extractDescription(skillMd.content);
      mainFile = skillMd.path;
      contentForTags = skillMd.content;
    } else {
      const anyMd = files.find(f => f.name.endsWith('.md'));
      if (anyMd) {
        skillName = extractSkillName(anyMd.content) || repo;
        skillDescription = extractDescription(anyMd.content);
        mainFile = anyMd.path;
        contentForTags = anyMd.content;
      } else {
        skillName = repo;
        mainFile = files[0].path;
      }
    }
    
    sendProgress(60, '上传到存储...');
    const totalFiles = files.length;
    for (let i = 0; i < files.length; i++) {
      await uploadFile(skillId, files[i].path, Buffer.from(files[i].content));
      const uploadProgress = 60 + Math.round((i + 1) / totalFiles * 20);
      sendProgress(uploadProgress, `上传文件 (${i + 1}/${totalFiles})...`);
    }
    
    sendProgress(85, '生成标签...');
    const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
    
    const skillData = {
      id: skillId,
      name: skillName,
      description: skillDescription,
      tags: [],
      type: files.length > 1 ? 'folder' : 'md',
      mainFile,
      starred: false,
      deleted: false,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      githubUrl: url,
      githubLastCommit: latestCommit,
      githubLastCheck: new Date().toISOString(),
      hasUpdate: false,
      isCustomized: false
    };
    
    const tags = await generateTags({
      name: skillData.name,
      description: skillData.description,
      contentPreview: contentForTags.substring(0, 2000)
    });
    
    skillData.tags = tags;
    if (tags.length > 0) {
      await updateTagsFile(tags);
    }
    
    sendProgress(95, '保存到数据库...');
    const createdSkill = await createSkill(skillData);
    
    sendProgress(100, '完成');
    sendComplete({ success: true, skill: createdSkill });
  } catch (error) {
    console.error('[GitHub Import Stream] Error:', error);
    sendError(error.message || 'Import failed');
  }
});

router.post('/:id/bind-github', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }
    
    const { owner, repo, path: repoPath, branch: urlBranch } = parseGitHubUrl(url);
    const branch = urlBranch || await getDefaultBranch(owner, repo);
    const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
    
    const updated = await updateSkill(req.params.id, {
      githubUrl: url,
      githubLastCommit: latestCommit,
      githubLastCheck: new Date().toISOString(),
      hasUpdate: false
    });
    
    res.json({ 
      success: true, 
      githubUrl: updated.githubUrl,
      githubLastCommit: updated.githubLastCommit
    });
  } catch (error) {
    console.error('Bind GitHub error:', error);
    res.status(500).json({ error: 'Failed to bind GitHub', message: error.message });
  }
});

router.delete('/:id/unbind-github', async (req, res) => {
  try {
    const updated = await updateSkill(req.params.id, {
      githubUrl: null,
      githubLastCommit: null,
      githubLastCheck: null,
      hasUpdate: false
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Unbind GitHub error:', error);
    res.status(500).json({ error: 'Failed to unbind GitHub' });
  }
});

router.post('/:id/check-update', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill || !skill.githubUrl) {
      return res.status(400).json({ error: 'Skill has no GitHub binding' });
    }
    
    const { owner, repo, path: repoPath, branch: urlBranch } = parseGitHubUrl(skill.githubUrl);
    const branch = urlBranch || await getDefaultBranch(owner, repo);
    const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
    
    const hasUpdate = latestCommit !== skill.githubLastCommit;
    
    await updateSkill(req.params.id, {
      githubLastCheck: new Date().toISOString(),
      hasUpdate
    });
    
    res.json({ 
      success: true, 
      hasUpdate,
      currentCommit: skill.githubLastCommit,
      latestCommit
    });
  } catch (error) {
    console.error('Check update error:', error);
    res.status(500).json({ error: 'Failed to check update', message: error.message });
  }
});

router.post('/:id/sync-github', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill || !skill.githubUrl) {
      return res.status(400).json({ error: 'Skill has no GitHub binding' });
    }
    
    const { owner, repo, path: repoPath, branch: urlBranch } = parseGitHubUrl(skill.githubUrl);
    const branch = urlBranch || await getDefaultBranch(owner, repo);
    
    console.log('[GitHub Sync] Downloading latest files...');
    const files = await downloadAndProcessFiles(owner, repo, repoPath, branch);
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'No valid files found' });
    }
    
    for (const file of files) {
      await uploadFile(skill.id, file.path, Buffer.from(file.content));
    }
    
    const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
    
    let newName = skill.name;
    let newDescription = skill.description;
    const skillMd = files.find(f => f.name === 'SKILL.md' || f.name === 'Skill.md');
    if (skillMd) {
      newName = extractSkillName(skillMd.content) || skill.name;
      newDescription = extractDescription(skillMd.content) || skill.description;
    }
    
    const updated = await updateSkill(req.params.id, {
      name: newName,
      description: newDescription,
      githubLastCommit: latestCommit,
      githubLastCheck: new Date().toISOString(),
      hasUpdate: false
    });
    
    console.log('[GitHub Sync] Success');
    res.json({ success: true, skill: updated });
  } catch (error) {
    console.error('Sync GitHub error:', error);
    res.status(500).json({ error: 'Failed to sync from GitHub', message: error.message });
  }
});

router.patch('/:id/customized', async (req, res) => {
  try {
    const { isCustomized } = req.body;
    
    const updated = await updateSkill(req.params.id, {
      isCustomized: Boolean(isCustomized)
    });
    
    res.json({ success: true, isCustomized: updated.isCustomized });
  } catch (error) {
    console.error('Toggle customized error:', error);
    res.status(500).json({ error: 'Failed to update customized status' });
  }
});

router.post('/:id/detect-links', async (req, res) => {
  try {
    const skill = await getSkillById(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    let content = '';
    if (skill.mainFile) {
      const fileBuffer = await downloadFile(skill.id, skill.mainFile).catch(() => null);
      if (fileBuffer) {
        content = fileBuffer.toString();
      }
    }
    
    const links = detectGitHubLinks(content);
    res.json({ success: true, links });
  } catch (error) {
    console.error('Detect links error:', error);
    res.status(500).json({ error: 'Failed to detect links' });
  }
});

router.post('/cron/check-updates', async (req, res) => {
  try {
    console.log('[Cron] Starting update check...');
    
    const skills = await getSkillsWithGitHub();
    console.log(`[Cron] Found ${skills.length} skills with GitHub binding`);
    
    const updatedIds = [];
    
    for (const skill of skills) {
      try {
        const { owner, repo, path: repoPath, branch: urlBranch } = parseGitHubUrl(skill.githubUrl);
        const branch = urlBranch || await getDefaultBranch(owner, repo);
        const latestCommit = await getLatestCommit(owner, repo, repoPath, branch);
        
        if (latestCommit && latestCommit !== skill.githubLastCommit) {
          updatedIds.push(skill.id);
          console.log(`[Cron] Update available for: ${skill.name}`);
        }
      } catch (err) {
        console.error(`[Cron] Failed to check ${skill.name}:`, err.message);
      }
    }
    
    if (updatedIds.length > 0) {
      await markSkillsUpdated(updatedIds, true);
    }
    
    console.log(`[Cron] Check complete. ${updatedIds.length} skills have updates.`);
    res.json({ 
      success: true, 
      checked: skills.length,
      updated: updatedIds.length
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    res.status(500).json({ error: 'Cron job failed', message: error.message });
  }
});

export default router;
