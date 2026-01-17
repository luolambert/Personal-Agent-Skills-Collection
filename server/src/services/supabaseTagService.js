import { supabase } from '../config/supabaseClient.js';

export async function getAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('name')
    .order('name');
  
  if (error) throw error;
  return data.map(t => t.name);
}

export async function getOrCreateTag(name) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('name', name)
    .single();
  
  if (existing) return existing.id;
  
  const { data, error } = await supabase
    .from('tags')
    .insert({ name })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function updateTagName(oldName, newName) {
  const { error } = await supabase
    .from('tags')
    .update({ name: newName })
    .eq('name', oldName);
  
  if (error) throw error;
  return getAllTags();
}

export async function deleteTag(name) {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('name', name);
  
  if (error) throw error;
  return getAllTags();
}

export async function associateTagsWithSkill(skillId, tagNames) {
  await supabase
    .from('skill_tags')
    .delete()
    .eq('skill_id', skillId);
  
  if (!tagNames || tagNames.length === 0) return;
  
  const tagIds = [];
  for (const name of tagNames) {
    const tagId = await getOrCreateTag(name);
    tagIds.push(tagId);
  }
  
  const associations = tagIds.map(tagId => ({
    skill_id: skillId,
    tag_id: tagId
  }));
  
  const { error } = await supabase
    .from('skill_tags')
    .insert(associations);
  
  if (error) throw error;
}

export async function getSkillTags(skillId) {
  const { data, error } = await supabase
    .from('skill_tags')
    .select('tag_id, tags(name)')
    .eq('skill_id', skillId);
  
  if (error) throw error;
  return data.map(st => st.tags.name);
}

export async function updateTagsFile(newTags) {
  // Supabase version - ensure all tags exist in database
  for (const tag of newTags) {
    await getOrCreateTag(tag);
  }
}
