import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readDB, writeDB, deleteSkillFiles } from './fileService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRASH_DIR = path.join(__dirname, '../../data/trash');
const SKILLS_DIR = path.join(__dirname, '../../data/skills');

const TRASH_DAYS = 30;

export function moveToTrash(skillId) {
  const db = readDB();
  const skillIndex = db.skills.findIndex(s => s.id === skillId);
  
  if (skillIndex === -1) return null;
  
  const skill = db.skills[skillIndex];
  skill.deleted = true;
  skill.deletedAt = new Date().toISOString();
  
  writeDB(db);
  
  return skill;
}

export function restoreFromTrash(skillId) {
  const db = readDB();
  const skill = db.skills.find(s => s.id === skillId);
  
  if (!skill) return null;
  
  skill.deleted = false;
  skill.deletedAt = null;
  
  writeDB(db);
  
  return skill;
}

export function getTrashItems() {
  const db = readDB();
  return db.skills.filter(s => s.deleted).map(skill => {
    const deletedAt = new Date(skill.deletedAt);
    const expireAt = new Date(deletedAt.getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((expireAt - new Date()) / (24 * 60 * 60 * 1000));
    
    return {
      ...skill,
      expireAt: expireAt.toISOString(),
      daysRemaining: Math.max(0, daysRemaining)
    };
  });
}

export function permanentDelete(skillId) {
  const db = readDB();
  const skillIndex = db.skills.findIndex(s => s.id === skillId);
  
  if (skillIndex === -1) return false;
  
  deleteSkillFiles(skillId);
  
  db.skills.splice(skillIndex, 1);
  writeDB(db);
  
  return true;
}

export function cleanupExpiredTrash() {
  const db = readDB();
  const now = new Date();
  const expireThreshold = now.getTime() - TRASH_DAYS * 24 * 60 * 60 * 1000;
  
  const expiredSkills = db.skills.filter(s => {
    if (!s.deleted || !s.deletedAt) return false;
    return new Date(s.deletedAt).getTime() < expireThreshold;
  });
  
  for (const skill of expiredSkills) {
    console.log(`Cleaning up expired skill: ${skill.name}`);
    deleteSkillFiles(skill.id);
  }
  
  db.skills = db.skills.filter(s => {
    if (!s.deleted) return true;
    if (!s.deletedAt) return true;
    return new Date(s.deletedAt).getTime() >= expireThreshold;
  });
  
  writeDB(db);
  
  console.log(`Cleaned up ${expiredSkills.length} expired skills`);
}
