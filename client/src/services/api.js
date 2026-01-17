const API_BASE = '/api';

export async function uploadSkills(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  
  const response = await fetch(`${API_BASE}/skills/upload`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

export async function getSkills(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.starred) searchParams.set('starred', 'true');
  
  const url = `${API_BASE}/skills${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const response = await fetch(url);
  return response.json();
}

export async function getSkill(id) {
  const response = await fetch(`${API_BASE}/skills/${id}`);
  return response.json();
}

export async function toggleStar(id) {
  const response = await fetch(`${API_BASE}/skills/${id}/star`, {
    method: 'PUT'
  });
  return response.json();
}

export async function updateSkillTags(id, tags) {
  const response = await fetch(`${API_BASE}/skills/${id}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags })
  });
  return response.json();
}

export async function regenerateTags(id) {
  const response = await fetch(`${API_BASE}/skills/${id}/regenerate-tags`, {
    method: 'POST'
  });
  return response.json();
}

export async function deleteSkill(id) {
  const response = await fetch(`${API_BASE}/skills/${id}`, {
    method: 'DELETE'
  });
  return response.json();
}

export async function exportSkills(skillIds) {
  const response = await fetch(`${API_BASE}/skills/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillIds })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skills.zip';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function getTags() {
  const response = await fetch(`${API_BASE}/tags`);
  return response.json();
}

export async function addTag(name) {
  const response = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return response.json();
}

export async function updateTag(oldName, newName) {
  const response = await fetch(`${API_BASE}/tags/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName })
  });
  return response.json();
}

export async function deleteTag(name) {
  const response = await fetch(`${API_BASE}/tags/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
  return response.json();
}

export async function getTrash() {
  const response = await fetch(`${API_BASE}/trash`);
  return response.json();
}

export async function restoreFromTrash(id) {
  const response = await fetch(`${API_BASE}/trash/${id}/restore`, {
    method: 'POST'
  });
  return response.json();
}

export async function permanentDelete(id) {
  const response = await fetch(`${API_BASE}/trash/${id}`, {
    method: 'DELETE'
  });
  return response.json();
}

export async function getSkillFile(skillId, filePath) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/file?path=${encodeURIComponent(filePath)}`);
  if (!response.ok) return null;
  return response.json();
}
