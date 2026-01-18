import express from 'express';
import { getAllTags, getOrCreateTag, updateTagName, deleteTag, cleanupUnusedTags } from '../services/supabaseTagService.js';
import { getAllSkills, updateSkill } from '../services/supabaseSkillService.js';

const router = express.Router();

router.post('/cleanup', async (req, res) => {
  try {
    await cleanupUnusedTags();
    const tags = await getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Cleanup tags error:', error);
    res.status(500).json({ error: 'Failed to cleanup tags' });
  }
});

router.get('/', async (req, res) => {
  try {
    const tags = await getAllTags();
    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tag name required' });
    }
    
    await getOrCreateTag(name);
    const tags = await getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

router.put('/:name', async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'New tag name required' });
    }
    
    const oldName = decodeURIComponent(req.params.name);
    await updateTagName(oldName, newName);
    
    const skills = await getAllSkills();
    for (const skill of skills) {
      if (skill.tags.includes(oldName)) {
        const updatedTags = skill.tags.map(t => t === oldName ? newName : t);
        await updateSkill(skill.id, { tags: updatedTags });
      }
    }
    
    const tags = await getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

router.delete('/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    await deleteTag(name);
    
    const skills = await getAllSkills();
    for (const skill of skills) {
      if (skill.tags.includes(name)) {
        const updatedTags = skill.tags.filter(t => t !== name);
        await updateSkill(skill.id, { tags: updatedTags });
      }
    }
    
    const tags = await getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
