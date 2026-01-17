import { supabase, BUCKET_NAME } from '../config/supabaseClient.js';
import path from 'path';

export async function uploadFile(skillId, fileName, fileBuffer) {
  const filePath = `${skillId}/${fileName}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: true
    });
  
  if (error) throw error;
  return filePath;
}

export async function uploadMultipleFiles(skillId, files) {
  const uploadPromises = files.map(file => 
    uploadFile(skillId, file.name, file.buffer)
  );
  
  return Promise.all(uploadPromises);
}

export async function downloadFile(skillId, filePath) {
  const fullPath = `${skillId}/${filePath}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(fullPath);
  
  if (error) throw error;
  
  const buffer = await data.arrayBuffer();
  return Buffer.from(buffer);
}

export async function listFiles(skillId) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(skillId, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });
  
  if (error) throw error;
  
  const files = [];
  for (const item of data) {
    if (item.name) {
      files.push(item.name);
    }
  }
  
  return files;
}

export async function deleteFile(skillId, filePath) {
  const fullPath = `${skillId}/${filePath}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fullPath]);
  
  if (error) throw error;
}

export async function deleteAllFiles(skillId) {
  const files = await listFiles(skillId);
  
  if (files.length === 0) return;
  
  const filePaths = files.map(f => `${skillId}/${f}`);
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths);
  
  if (error) throw error;
}

export async function getFileUrl(skillId, filePath) {
  const fullPath = `${skillId}/${filePath}`;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fullPath);
  
  return data.publicUrl;
}
