import express from 'express';
import { getTrashItems, restoreFromTrash, permanentDelete, cleanupExpiredTrash } from '../services/trashService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const items = getTrashItems();
    res.json({ items });
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ error: 'Failed to get trash items' });
  }
});

router.post('/:id/restore', (req, res) => {
  try {
    const skill = restoreFromTrash(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found in trash' });
    }
    
    res.json({ success: true, skill });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore skill' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const success = permanentDelete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ success: true, message: 'Skill permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

router.post('/cleanup', (req, res) => {
  try {
    cleanupExpiredTrash();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup trash' });
  }
});

export default router;
