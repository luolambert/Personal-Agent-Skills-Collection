import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TAGS_PATH = path.join(__dirname, '../../data/tags.json');

export function getAllTags() {
  const data = JSON.parse(fs.readFileSync(TAGS_PATH, 'utf-8'));
  return data.tags || [];
}

export function addTag(tagName) {
  const tags = getAllTags();
  if (!tags.includes(tagName)) {
    tags.push(tagName);
    fs.writeFileSync(TAGS_PATH, JSON.stringify({ tags }, null, 2));
  }
  return tags;
}

export function updateTag(oldName, newName) {
  const tags = getAllTags();
  const index = tags.indexOf(oldName);
  if (index !== -1) {
    tags[index] = newName;
    fs.writeFileSync(TAGS_PATH, JSON.stringify({ tags }, null, 2));
  }
  return tags;
}

export function deleteTag(tagName) {
  let tags = getAllTags();
  tags = tags.filter(t => t !== tagName);
  fs.writeFileSync(TAGS_PATH, JSON.stringify({ tags }, null, 2));
  return tags;
}
