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
  
  const tagIds = await Promise.all(tagNames.map(name => getOrCreateTag(name)));
  
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
  await Promise.all(newTags.map(tag => getOrCreateTag(tag)));
}

export async function cleanupUnusedTags() {
  const [tagsResult, skillsResult, associationsResult] = await Promise.all([
    supabase.from('tags').select('id, name'),
    supabase.from('skills').select('id').eq('deleted', false),
    supabase.from('skill_tags').select('tag_id, skill_id')
  ]);
  
  if (tagsResult.error) throw tagsResult.error;
  if (skillsResult.error) throw skillsResult.error;
  if (associationsResult.error) throw associationsResult.error;
  
  const activeSkillIds = new Set(skillsResult.data.map(s => s.id));
  
  const usedTagIds = new Set(
    associationsResult.data
      .filter(a => activeSkillIds.has(a.skill_id))
      .map(a => a.tag_id)
  );
  
  const unusedTagIds = tagsResult.data
    .filter(t => !usedTagIds.has(t.id))
    .map(t => t.id);
  
  if (unusedTagIds.length > 0) {
    await supabase.from('tags').delete().in('id', unusedTagIds);
  }
}
