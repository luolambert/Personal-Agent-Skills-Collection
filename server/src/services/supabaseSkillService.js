import { supabase } from '../config/supabaseClient.js';
import { associateTagsWithSkill, getSkillTags } from './supabaseTagService.js';
import { listFiles } from './supabaseStorageService.js';

export async function createSkill(skillData) {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      id: skillData.id,
      name: skillData.name,
      description: skillData.description || '',
      type: skillData.type,
      main_file: skillData.mainFile,
      starred: skillData.starred || false,
      deleted: skillData.deleted || false,
      deleted_at: skillData.deletedAt || null,
      created_at: skillData.createdAt || new Date().toISOString()
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
  
  const { data, error } = await supabase
    .from('skills')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  if (updates.tags !== undefined) {
    await associateTagsWithSkill(id, updates.tags);
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
    starred: dbSkill.starred,
    deleted: dbSkill.deleted,
    deletedAt: dbSkill.deleted_at,
    createdAt: dbSkill.created_at,
    tags,
    files: files || []
  };
}
