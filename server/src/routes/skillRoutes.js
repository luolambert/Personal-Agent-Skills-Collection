import express from 'express';
import multer from 'multer';
import { processUploadedFile, readDB, writeDB, getSkillContent, createSkillFromContent, getFileContent } from '../services/fileService.js';
import { generateTags, updateTagsFile } from '../services/llmService.js';
import { moveToTrash } from '../services/trashService.js';
import { exportSkills } from '../services/exportService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const db = readDB();
    const results = [];
    
    for (const file of files) {
      const skillData = await processUploadedFile(file);
      
      const skillContent = getSkillContent(skillData.id);
      const tags = await generateTags({
        name: skillData.name,
        description: skillData.description,
        contentPreview: skillContent?.content || ''
      });
      
      skillData.tags = tags;
      updateTagsFile(tags);
      
      db.skills.push(skillData);
      results.push(skillData);
    }
    
    writeDB(db);
    
    res.json({ success: true, skills: results });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { name, description, content } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const skillData = await createSkillFromContent(name, description, content);
    
    const tags = await generateTags({
      name: skillData.name,
      description: skillData.description,
      contentPreview: content
    });
    
    skillData.tags = tags;
    updateTagsFile(tags);
    
    const db = readDB();
    db.skills.push(skillData);
    writeDB(db);
    
    res.json({ success: true, skill: skillData });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Create failed' });
  }
});

router.get('/', (req, res) => {
  try {
    const { search, tags, starred } = req.query;
    const db = readDB();
    
    let skills = db.skills.filter(s => !s.deleted);
    
    if (search) {
      const searchLower = search.toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      skills = skills.filter(s => 
        tagList.some(t => s.tags.includes(t))
      );
    }
    
    if (starred === 'true') {
      skills = skills.filter(s => s.starred);
    }
    
    res.json({ skills });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const skill = getSkillContent(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json(skill);
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

router.put('/:id/star', (req, res) => {
  try {
    const db = readDB();
    const skill = db.skills.find(s => s.id === req.params.id);
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    skill.starred = !skill.starred;
    writeDB(db);
    
    res.json({ success: true, starred: skill.starred });
  } catch (error) {
    console.error('Star error:', error);
    res.status(500).json({ error: 'Failed to update star' });
  }
});

router.put('/:id/tags', (req, res) => {
  try {
    const { tags } = req.body;
    const db = readDB();
    const skill = db.skills.find(s => s.id === req.params.id);
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    skill.tags = tags;
    updateTagsFile(tags);
    writeDB(db);
    
    res.json({ success: true, tags: skill.tags });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

router.post('/:id/regenerate-tags', async (req, res) => {
  try {
    const db = readDB();
    const skill = db.skills.find(s => s.id === req.params.id);
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    const skillContent = getSkillContent(skill.id);
    const tags = await generateTags({
      name: skill.name,
      description: skill.description,
      contentPreview: skillContent?.content || ''
    });
    
    skill.tags = tags;
    updateTagsFile(tags);
    writeDB(db);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Regenerate tags error:', error);
    res.status(500).json({ error: 'Failed to regenerate tags' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const skill = moveToTrash(req.params.id);
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

router.post('/export', (req, res) => {
  try {
    const { skillIds } = req.body;
    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({ error: 'No skills selected' });
    }
    
    const zipBuffer = exportSkills(skillIds);
    
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

router.get('/:id/file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const file = getFileContent(req.params.id, filePath);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

export default router;
