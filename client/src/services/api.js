const API_BASE = '/api';

export function uploadSkills(files, onProgress = null) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    const xhr = new XMLHttpRequest();
    
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, '上传中...');
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${API_BASE}/skills/upload`);
    xhr.send(formData);
  });
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

export function importFromGitHub(url, onProgress = null) {
  return new Promise((resolve, reject) => {
    if (!onProgress) {
      fetch(`${API_BASE}/skills/import-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
        .then(res => res.json())
        .then(resolve)
        .catch(reject);
      return;
    }

    const eventSource = new EventSource(
      `${API_BASE}/skills/import-github-stream?url=${encodeURIComponent(url)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          onProgress(data.progress, data.text);
        } else if (data.type === 'complete') {
          eventSource.close();
          resolve(data.result);
        } else if (data.type === 'error') {
          eventSource.close();
          reject(new Error(data.message));
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error('Connection error'));
    };
  });
}

export async function bindGitHub(skillId, url) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/bind-github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return response.json();
}

export async function unbindGitHub(skillId) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/unbind-github`, {
    method: 'DELETE'
  });
  return response.json();
}

export async function checkGitHubUpdate(skillId) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/check-update`, {
    method: 'POST'
  });
  return response.json();
}

export async function syncGitHub(skillId) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/sync-github`, {
    method: 'POST'
  });
  return response.json();
}

export async function toggleCustomized(skillId, isCustomized) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/customized`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isCustomized })
  });
  return response.json();
}

export async function detectGitHubLinks(skillId) {
  const response = await fetch(`${API_BASE}/skills/${skillId}/detect-links`, {
    method: 'POST'
  });
  return response.json();
}
