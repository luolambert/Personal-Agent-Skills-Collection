import express from 'express';
import { getDeletedSkills, updateSkill, permanentlyDeleteSkill } from '../services/supabaseSkillService.js';
import { deleteAllFiles } from '../services/supabaseStorageService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const skills = await getDeletedSkills();
    res.json({ skills });
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ error: 'Failed to get trash' });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const skill = await updateSkill(req.params.id, {
      deleted: false,
      deletedAt: null
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ success: true, skill });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore skill' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteAllFiles(req.params.id);
    await permanentlyDeleteSkill(req.params.id);
    
    res.json({ success: true, message: 'Skill permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete skill' });
  }
});

export default router;
