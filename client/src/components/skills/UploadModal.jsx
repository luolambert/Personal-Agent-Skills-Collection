import { useState, useRef } from 'react';
import Modal from '../common/Modal';
import CircularProgress from '../common/CircularProgress';
import { uploadSkills, importFromGitHub } from '../../services/api';
import './UploadZone.css';

const isMacHiddenFile = (filename) => {
  const hiddenPatterns = [
    /^\.DS_Store$/,
    /^\._/,
    /^\.Spotlight-/,
    /^\.Trashes$/,
    /^\.fseventsd$/,
    /^\.TemporaryItems$/,
    /^\.DocumentRevisions-/,
    /^__MACOSX$/,
  ];
  return hiddenPatterns.some(pattern => pattern.test(filename));
};

export default function UploadModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('upload');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    content: ''
  });
  
  const [githubUrl, setGithubUrl] = useState('');
  const [storageMode, setStorageMode] = useState('local');

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => !isMacHiddenFile(f.name) && 
           (f.name.endsWith('.md') || f.name.endsWith('.skill') || f.name.endsWith('.zip'))
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      f => !isMacHiddenFile(f.name)
    );
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgressText('上传文件中...');
    setError(null);
    
    try {
      await uploadSkills(files, (percent, text) => {
        if (percent < 100) {
          setProgressText(`上传中 ${percent}%`);
        } else {
          setProgressText('处理中，请稍候...');
        }
      });
      onSuccess();
    } catch (err) {
      setError(err.message || '上传失败');
      setUploading(false);
      setProgressText('');
    }
  };

  const handleCreate = async () => {
    if (!newSkill.name.trim()) {
      setError('请输入 Skill 名称');
      return;
    }
    
    setUploading(true);
    setProgressText('创建中...');
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
      setUploading(false);
      setProgressText('');
    }
  };

  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) {
      setError('请输入 GitHub 链接');
      return;
    }
    
    if (!githubUrl.includes('github.com')) {
      setError('请输入有效的 GitHub 链接');
      return;
    }
    
    setUploading(true);
    setProgressText('开始导入...');
    setError(null);
    
    try {
      const result = await importFromGitHub(githubUrl, storageMode, (percent, text) => {
        setProgressText(text || '处理中...');
      });
      if (result.error) {
        throw new Error(result.message || result.error);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || '导入失败');
      setUploading(false);
      setProgressText('');
    }
  };

  return (
    <Modal title="添加 Skills" onClose={onClose}>
      {uploading && (
        <div className="upload-overlay">
          <CircularProgress 
            progress={null}
            size="lg" 
            text={progressText} 
          />
        </div>
      )}

      <div className="upload-tabs">
        <button 
          className={`upload-tab ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
          disabled={uploading}
        >
          上传文件
        </button>
        <button 
          className={`upload-tab ${mode === 'create' ? 'active' : ''}`}
          onClick={() => setMode('create')}
          disabled={uploading}
        >
          新建文档
        </button>
        <button 
          className={`upload-tab ${mode === 'github' ? 'active' : ''}`}
          onClick={() => setMode('github')}
          disabled={uploading}
        >
          GitHub 导入
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
      ) : mode === 'create' ? (
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
      ) : (
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">GitHub 链接</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://github.com/user/repo 或 .../tree/main/folder"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
          <p className="form-hint">支持仓库、文件夹或单文件链接，将自动过滤 README、LICENSE 等文件</p>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">存储模式</label>
            <div className="storage-mode-options">
              <label className="storage-mode-option">
                <input
                  type="radio"
                  name="storageMode"
                  value="local"
                  checked={storageMode === 'local'}
                  onChange={(e) => setStorageMode(e.target.value)}
                />
                <div className="option-content">
                  <span className="option-title">💾 本地模式</span>
                  <span className="option-desc">完整下载文件，支持编辑</span>
                </div>
              </label>
              <label className="storage-mode-option">
                <input
                  type="radio"
                  name="storageMode"
                  value="reference"
                  checked={storageMode === 'reference'}
                  onChange={(e) => setStorageMode(e.target.value)}
                />
                <div className="option-content">
                  <span className="option-title">📎 引用模式</span>
                  <span className="option-desc">只读，跳转 GitHub 查看</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">{error}</div>
      )}

      <div className="upload-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
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
        ) : mode === 'create' ? (
          <button 
            className="btn btn-primary" 
            onClick={handleCreate}
            disabled={!newSkill.name.trim() || uploading}
          >
            {uploading ? '创建中...' : '创建 Skill'}
          </button>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={handleGitHubImport}
            disabled={!githubUrl.trim() || uploading}
          >
            {uploading ? '导入中...' : '导入 Skill'}
          </button>
        )}
      </div>
    </Modal>
  );
}
