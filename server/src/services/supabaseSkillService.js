import { supabase } from '../config/supabaseClient.js';
import { associateTagsWithSkill, getSkillTags, cleanupUnusedTags } from './supabaseTagService.js';
import { listFiles } from './supabaseStorageService.js';

function generateStorageFolder(name, id) {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  const shortId = id.substring(0, 8);
  return `${sanitized}-${shortId}`;
}

export async function createSkill(skillData) {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      id: skillData.id,
      name: skillData.name,
      description: skillData.description || '',
      type: skillData.type,
      main_file: skillData.mainFile,
      storage_folder: skillData.storageFolder || generateStorageFolder(skillData.name, skillData.id),
      starred: skillData.starred || false,
      deleted: skillData.deleted || false,
      deleted_at: skillData.deletedAt || null,
      created_at: skillData.createdAt || new Date().toISOString(),
      github_url: skillData.githubUrl || null,
      github_last_commit: skillData.githubLastCommit || null,
      github_last_check: skillData.githubLastCheck || null,
      has_update: skillData.hasUpdate || false,
      is_customized: skillData.isCustomized || false
    })
    .select()
    .single();
  
  if (error) throw error;
  
  if (skillData.tags && skillData.tags.length > 0) {
    await associateTagsWithSkill(data.id, skillData.tags);
  }
  
  return formatSkill(data, skillData.tags || []);
}

export async function getSkillById(id) {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  const tags = await getSkillTags(id);
  const files = await listFiles(id);
  
  return formatSkill(data, tags, files);
}

export async function getAllSkills(filters = {}) {
  let query = supabase
    .from('skills')
    .select('*')
    .eq('deleted', false)
    .order('created_at', { ascending: false });
  
  if (filters.starred === 'true') {
    query = query.eq('starred', true);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  let skills = await Promise.all(
    data.map(async skill => {
      const tags = await getSkillTags(skill.id);
      return formatSkill(skill, tags);
    })
  );
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.description.toLowerCase().includes(searchLower) ||
      s.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  
  if (filters.tags) {
    const tagList = filters.tags.split(',').map(t => t.trim());
    skills = skills.filter(s =>
      tagList.some(t => s.tags.includes(t))
    );
  }
  
  return skills;
}

export async function updateSkill(id, updates) {
  const updateData = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.starred !== undefined) updateData.starred = updates.starred;
  if (updates.deleted !== undefined) updateData.deleted = updates.deleted;
  if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt;
  if (updates.githubUrl !== undefined) updateData.github_url = updates.githubUrl;
  if (updates.githubLastCommit !== undefined) updateData.github_last_commit = updates.githubLastCommit;
  if (updates.githubLastCheck !== undefined) updateData.github_last_check = updates.githubLastCheck;
  if (updates.hasUpdate !== undefined) updateData.has_update = updates.hasUpdate;
  if (updates.isCustomized !== undefined) updateData.is_customized = updates.isCustomized;
  
  let data;
  
  if (Object.keys(updateData).length > 0) {
    const result = await supabase
      .from('skills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (result.error) throw result.error;
    data = result.data;
  } else {
    const result = await supabase
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();
    
    if (result.error) throw result.error;
    data = result.data;
  }
  
  if (updates.tags !== undefined) {
    await associateTagsWithSkill(id, updates.tags);
    await cleanupUnusedTags();
  }
  
  const tags = await getSkillTags(id);
  return formatSkill(data, tags);
}

export async function deleteSkill(id) {
  const deletedAt = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('skills')
    .update({ 
      deleted: true,
      deleted_at: deletedAt 
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  const tags = await getSkillTags(id);
  return formatSkill(data, tags);
}

export async function permanentlyDeleteSkill(id) {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function getDeletedSkills() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('deleted', true)
    .order('deleted_at', { ascending: false });
  
  if (error) throw error;
  
  return Promise.all(
    data.map(async skill => {
      const tags = await getSkillTags(skill.id);
      return formatSkill(skill, tags);
    })
  );
}

function formatSkill(dbSkill, tags = [], files = []) {
  return {
    id: dbSkill.id,
    name: dbSkill.name,
    description: dbSkill.description,
    type: dbSkill.type,
    mainFile: dbSkill.main_file,
    storageFolder: dbSkill.storage_folder || dbSkill.id,
    starred: dbSkill.starred,
    deleted: dbSkill.deleted,
    deletedAt: dbSkill.deleted_at,
    createdAt: dbSkill.created_at,
    githubUrl: dbSkill.github_url,
    githubLastCommit: dbSkill.github_last_commit,
    githubLastCheck: dbSkill.github_last_check,
    hasUpdate: dbSkill.has_update,
    isCustomized: dbSkill.is_customized,
    tags,
    files: files || []
  };
}

export async function getSkillsWithGitHub() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('deleted', false)
    .not('github_url', 'is', null);
  
  if (error) throw error;
  
  return data.map(skill => formatSkill(skill));
}

export async function markSkillsUpdated(ids, hasUpdate = true) {
  const { error } = await supabase
    .from('skills')
    .update({ 
      has_update: hasUpdate,
      github_last_check: new Date().toISOString()
    })
    .in('id', ids);
  
  if (error) throw error;
}
