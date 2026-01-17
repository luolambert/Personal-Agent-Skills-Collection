import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSkill, toggleStar, updateSkillTags, regenerateTags, deleteSkill } from '../../services/api';
import TagBadge from '../common/TagBadge';
import FileExplorer from '../files/FileExplorer';
import './SkillDetail.css';

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');

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
    try {
      const result = await regenerateTags(id);
      setSkill(prev => ({ ...prev, tags: result.tags }));
    } catch (err) {
      console.error('Failed to regenerate tags:', err);
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

  if (loading) {
    return <div className="detail-loading">加载中...</div>;
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
          {skill.tags.map(tag => (
            <TagBadge 
              key={tag} 
              tag={tag} 
              onRemove={editingTags ? handleRemoveTag : undefined}
            />
          ))}
          
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
            {regenerating ? '生成中...' : '重新生成'}
          </button>
        </div>
      </div>

      {skill.files && skill.files.length > 1 && (
        <FileExplorer files={skill.files} skillId={skill.id} />
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
