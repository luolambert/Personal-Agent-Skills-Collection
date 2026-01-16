import { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { uploadSkills } from '../../services/api';
import './UploadZone.css';

export default function UploadModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('upload');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    content: ''
  });

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.md') || f.name.endsWith('.skill') || f.name.endsWith('.zip')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    try {
      await uploadSkills(files);
      onSuccess();
    } catch (err) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSkill.name.trim()) {
      setError('请输入 Skill 名称');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill)
      });
      
      if (!response.ok) {
        throw new Error('创建失败');
      }
      
      onSuccess();
    } catch (err) {
      setError(err.message || '创建失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="添加 Skills" onClose={onClose}>
      <div className="upload-tabs">
        <button 
          className={`upload-tab ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          上传文件
        </button>
        <button 
          className={`upload-tab ${mode === 'create' ? 'active' : ''}`}
          onClick={() => setMode('create')}
        >
          新建文档
        </button>
      </div>

      {mode === 'upload' ? (
        <>
          <div 
            className="upload-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 8V32M24 8L16 16M24 8L32 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 32V36C8 38.21 9.79 40 12 40H36C38.21 40 40 38.21 40 36V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="upload-text">拖拽文件到这里</p>
            <p className="upload-hint">或 点击选择文件</p>
            <p className="upload-formats">支持: .md .skill .zip</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.skill,.zip"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <div className="upload-files">
              <h4>已选择 {files.length} 个文件</h4>
              <ul className="file-list">
                {files.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button 
                      className="file-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">名称 *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Skill 名称"
              value={newSkill.name}
              onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">描述</label>
            <input
              type="text"
              className="form-input"
              placeholder="简短描述（可选）"
              value={newSkill.description}
              onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">内容</label>
            <textarea
              className="form-textarea"
              placeholder="输入 Markdown 内容..."
              rows={10}
              value={newSkill.content}
              onChange={(e) => setNewSkill(prev => ({ ...prev, content: e.target.value }))}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">{error}</div>
      )}

      <div className="upload-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          取消
        </button>
        {mode === 'upload' ? (
          <button 
            className="btn btn-primary" 
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? '上传中...' : '开始上传'}
          </button>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={handleCreate}
            disabled={!newSkill.name.trim() || uploading}
          >
            {uploading ? '创建中...' : '创建 Skill'}
          </button>
        )}
      </div>
    </Modal>
  );
}
