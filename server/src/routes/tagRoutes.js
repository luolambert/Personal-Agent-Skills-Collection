import express from 'express';
import { getAllTags, addTag, updateTag, deleteTag } from '../services/tagService.js';
import { readDB, writeDB } from '../services/fileService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const tags = getAllTags();
    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tag name required' });
    }
    
    const tags = addTag(name);
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

router.put('/:name', (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'New tag name required' });
    }
    
    const oldName = decodeURIComponent(req.params.name);
    const tags = updateTag(oldName, newName);
    
    const db = readDB();
    for (const skill of db.skills) {
      const tagIndex = skill.tags.indexOf(oldName);
      if (tagIndex !== -1) {
        skill.tags[tagIndex] = newName;
      }
    }
    writeDB(db);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

router.delete('/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const tags = deleteTag(name);
    
    const db = readDB();
    for (const skill of db.skills) {
      skill.tags = skill.tags.filter(t => t !== name);
    }
    writeDB(db);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
