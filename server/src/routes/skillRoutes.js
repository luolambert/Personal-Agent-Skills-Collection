import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { generateTags } from '../services/llmService.js';
import { updateTagsFile } from '../services/supabaseTagService.js';
import { createSkill, getSkillById, getAllSkills, updateSkill, deleteSkill } from '../services/supabaseSkillService.js';
import { uploadFile, downloadFile } from '../services/supabaseStorageService.js';

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
    
    await updateTagsFile(tags);
    
    res.json({ success: true, tags: updated.tags });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Failed to update tags' });
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

export default router;
