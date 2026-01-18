import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  getSkill, toggleStar, updateSkillTags, regenerateTags, deleteSkill,
  bindGitHub, unbindGitHub, checkGitHubUpdate, syncGitHub, toggleCustomized, detectGitHubLinks
} from '../../services/api';
import TagBadge from '../common/TagBadge';
import FileExplorer from '../files/FileExplorer';
import LoadingSpinner from '../common/LoadingSpinner';
import './SkillDetail.css';

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindUrl, setBindUrl] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);
  const [detectedLinks, setDetectedLinks] = useState([]);

  useEffect(() => {
    loadSkill();
  }, [id]);

  const loadSkill = async () => {
    setLoading(true);
    try {
      const data = await getSkill(id);
      setSkill(data);
    } catch (err) {
      console.error('Failed to load skill:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async () => {
    const result = await toggleStar(id);
    setSkill(prev => ({ ...prev, starred: result.starred }));
  };

  const handleRegenerateTags = async () => {
    setRegenerating(true);
    setError('');
    try {
      const result = await regenerateTags(id);
      if (result.success) {
        setSkill(prev => ({ ...prev, tags: result.tags }));
      } else {
        setError(result.message || '标签生成失败');
      }
    } catch (err) {
      console.error('Failed to regenerate tags:', err);
      setError('标签生成失败，请稍后重试');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRemoveTag = async (tag) => {
    const newTags = skill.tags.filter(t => t !== tag);
    await updateSkillTags(id, newTags);
    setSkill(prev => ({ ...prev, tags: newTags }));
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || skill.tags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    const newTags = [...skill.tags, newTag.trim()];
    await updateSkillTags(id, newTags);
    setSkill(prev => ({ ...prev, tags: newTags }));
    setNewTag('');
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这个 Skill 吗？删除后可在回收站恢复。')) return;
    await deleteSkill(id);
    navigate('/');
  };

  const handleBindGitHub = async () => {
    if (!bindUrl.trim()) return;
    setGithubLoading(true);
    setError('');
    try {
      const result = await bindGitHub(id, bindUrl);
      if (result.success) {
        setSkill(prev => ({ ...prev, githubUrl: result.githubUrl, githubLastCommit: result.githubLastCommit, hasUpdate: false }));
        setShowBindModal(false);
        setBindUrl('');
      } else {
        setError(result.message || '绑定失败');
      }
    } catch (err) {
      setError(err.message || '绑定失败');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleUnbindGitHub = async () => {
    if (!confirm('确定解除 GitHub 绑定吗？')) return;
    setGithubLoading(true);
    try {
      await unbindGitHub(id);
      setSkill(prev => ({ ...prev, githubUrl: null, githubLastCommit: null, hasUpdate: false }));
    } catch (err) {
      setError(err.message || '解绑失败');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    setGithubLoading(true);
    setError('');
    try {
      const result = await checkGitHubUpdate(id);
      if (result.success) {
        setSkill(prev => ({ ...prev, hasUpdate: result.hasUpdate }));
        if (!result.hasUpdate) {
          alert('已是最新版本');
        }
      }
    } catch (err) {
      setError(err.message || '检查失败');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleSyncGitHub = async () => {
    if (!confirm('确定更新吗？这将覆盖本地内容。')) return;
    setGithubLoading(true);
    setError('');
    try {
      const result = await syncGitHub(id);
      if (result.success) {
        setSkill(prev => ({ ...prev, ...result.skill, hasUpdate: false }));
        loadSkill();
      }
    } catch (err) {
      setError(err.message || '同步失败');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleToggleCustomized = async () => {
    try {
      const result = await toggleCustomized(id, !skill.isCustomized);
      if (result.success) {
        setSkill(prev => ({ ...prev, isCustomized: result.isCustomized }));
      }
    } catch (err) {
      setError(err.message || '操作失败');
    }
  };

  const handleDetectLinks = async () => {
    setGithubLoading(true);
    try {
      const result = await detectGitHubLinks(id);
      if (result.success && result.links.length > 0) {
        setDetectedLinks(result.links);
        setShowBindModal(true);
      } else {
        alert('未在内容中检测到 GitHub 链接');
      }
    } catch (err) {
      setError(err.message || '检测失败');
    } finally {
      setGithubLoading(false);
    }
  };

  if (loading) {
    return <div className="detail-loading"><LoadingSpinner text="加载 Skill..." /></div>;
  }

  if (!skill) {
    return <div className="detail-error">Skill 不存在</div>;
  }

  return (
    <div className="skill-detail">
      <div className="detail-header">
        <Link to="/" className="detail-back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </Link>
        
        <div className="detail-actions">
          <button 
            className={`btn btn-ghost btn-icon ${skill.starred ? 'starred' : ''}`}
            onClick={handleStar}
            title="收藏"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path 
                d="M10 2L12.09 6.26L17 6.97L13.5 10.34L14.18 15.23L10 13.02L5.82 15.23L6.5 10.34L3 6.97L7.91 6.26L10 2Z" 
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                fill={skill.starred ? 'var(--color-warning)' : 'none'}
              />
            </svg>
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            删除
          </button>
        </div>
      </div>

      <h1 className="detail-title">{skill.name}</h1>
      
      {skill.description && (
        <p className="detail-description">{skill.description}</p>
      )}

      <div className="detail-tags">
        <div className="tags-list">
          {skill.tags.length > 0 ? skill.tags.map(tag => (
            <TagBadge 
              key={tag} 
              tag={tag} 
              onRemove={editingTags ? handleRemoveTag : undefined}
            />
          )) : (
            !editingTags && (
              <span className="tags-empty-hint">
                暂无标签，点击右侧按钮生成
              </span>
            )
          )}
          
          {editingTags && (
            <div className="tag-input-wrap">
              <input
                type="text"
                className="tag-input"
                placeholder="添加标签..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
            </div>
          )}
        </div>
        
        <div className="tags-actions">
          {error && <div className="tags-error">{error}</div>}
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => setEditingTags(!editingTags)}
          >
            {editingTags ? '完成' : '编辑标签'}
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleRegenerateTags}
            disabled={regenerating}
          >
            {regenerating ? '生成中...' : (skill.tags.length === 0 ? '生成标签' : '重新生成')}
          </button>
        </div>
      </div>

      {skill.files && skill.files.length > 1 && (
        <FileExplorer files={skill.files} skillId={skill.id} />
      )}

      {/* GitHub 来源卡片 */}
      <div className="github-source-card">
        <div className="card-header">
          <h4>🔗 GitHub 来源</h4>
          {skill.githubUrl && (
            <div className="card-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { setBindUrl(skill.githubUrl); setShowBindModal(true); }}>
                编辑
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleUnbindGitHub} disabled={githubLoading}>
                解绑
              </button>
            </div>
          )}
        </div>
        
        {skill.githubUrl ? (
          <div className="github-info">
            <a href={skill.githubUrl} target="_blank" rel="noopener noreferrer" className="github-url">
              {skill.githubUrl}
            </a>
            
            {skill.hasUpdate ? (
              <div className="update-available">
                <span>⚠️ 有可用更新</span>
                {skill.isCustomized ? (
                  <p className="update-hint">本地已标记为 Customized，建议手动处理</p>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleSyncGitHub} disabled={githubLoading}>
                    {githubLoading ? '同步中...' : '立即更新'}
                  </button>
                )}
              </div>
            ) : (
              <p className="update-status">✅ 已是最新版本</p>
            )}
            
            <button className="btn btn-ghost btn-sm" onClick={handleCheckUpdate} disabled={githubLoading}>
              {githubLoading ? '检查中...' : '🔄 手动检查'}
            </button>
          </div>
        ) : (
          <div className="no-github">
            <p>未绑定</p>
            <div className="github-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBindModal(true)}>
                手动绑定
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleDetectLinks} disabled={githubLoading}>
                🔍 自动识别
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customized 开关 */}
      <div className="customized-toggle">
        <label className="toggle-label">
          <input 
            type="checkbox" 
            checked={skill.isCustomized || false}
            onChange={handleToggleCustomized}
          />
          <span>Customized</span>
        </label>
        <p className="toggle-hint">标记此 Skill 为本地定制版本</p>
      </div>

      {/* 绑定弹窗 */}
      {showBindModal && (
        <div className="modal-overlay" onClick={() => setShowBindModal(false)}>
          <div className="modal-content bind-modal" onClick={e => e.stopPropagation()}>
            <h3>绑定 GitHub 来源</h3>
            
            {detectedLinks.length > 0 && (
              <div className="detected-links">
                <p>检测到的链接：</p>
                {detectedLinks.map((link, i) => (
                  <button key={i} className="detected-link" onClick={() => setBindUrl(link)}>
                    {link}
                  </button>
                ))}
              </div>
            )}
            
            <input
              type="url"
              className="form-input"
              placeholder="https://github.com/user/repo"
              value={bindUrl}
              onChange={e => setBindUrl(e.target.value)}
            />
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowBindModal(false); setDetectedLinks([]); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleBindGitHub} disabled={!bindUrl.trim() || githubLoading}>
                {githubLoading ? '绑定中...' : '绑定'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              return inline ? (
                <code className="inline-code" {...props}>{children}</code>
              ) : (
                <pre className="code-block">
                  <code className={className} {...props}>{children}</code>
                </pre>
              );
            }
          }}
        >
          {skill.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
