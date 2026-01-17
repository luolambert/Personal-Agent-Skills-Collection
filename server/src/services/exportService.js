import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import AdmZip from 'adm-zip';
import { readDB, isMacHiddenFile } from './fileService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILLS_DIR = path.join(__dirname, '../../data/skills');

export function exportSkills(skillIds) {
  const db = readDB();
  const zip = new AdmZip();
  
  for (const id of skillIds) {
    const skill = db.skills.find(s => s.id === id && !s.deleted);
    if (!skill) continue;
    
    const skillDir = path.join(SKILLS_DIR, id);
    if (!fs.existsSync(skillDir)) continue;
    
    const folderName = skill.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    addFolderToZip(zip, skillDir, folderName);
  }
  
  return zip.toBuffer();
}

function addFolderToZip(zip, folderPath, zipFolderName) {
  const items = fs.readdirSync(folderPath);
  
  for (const item of items) {
    if (isMacHiddenFile(item)) continue;
    const fullPath = path.join(folderPath, item);
    const zipPath = path.join(zipFolderName, item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      addFolderToZip(zip, fullPath, zipPath);
    } else {
      zip.addLocalFile(fullPath, path.dirname(zipPath));
    }
  }
}
