import { Link } from 'react-router-dom';
import './SkillCard.css';
import TagBadge from '../common/TagBadge';

export default function SkillCard({ 
  skill, 
  selected, 
  onSelect, 
  onStar 
}) {
  const handleCheckboxClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(skill.id);
  };

  const handleStarClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onStar(skill.id);
  };

  return (
    <Link to={`/skill/${skill.id}`} className="skill-card">
      <div className="skill-card-header">
        <button 
          className={`skill-star ${skill.starred ? 'starred' : ''}`}
          onClick={handleStarClick}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path 
              d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.23L9 13.02L4.82 15.23L5.5 10.34L2 6.97L6.91 6.26L9 2Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinejoin="round"
              fill={skill.starred ? 'var(--color-warning)' : 'none'}
            />
          </svg>
        </button>
        <label className="skill-checkbox" onClick={handleCheckboxClick}>
          <input 
            type="checkbox" 
            checked={selected}
            onChange={() => {}}
          />
          <span className="checkbox-mark"></span>
        </label>
      </div>
      
      <div className="skill-card-body">
        <div className="skill-type">
          {skill.type === 'folder' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4C2 3.45 2.45 3 3 3H6L8 5H13C13.55 5 14 5.45 14 6V12C14 12.55 13.55 13 13 13H3C2.45 13 2 12.55 2 12V4Z" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2H10L13 5V14H4V2Z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M10 2V5H13" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          )}
        </div>
        <h3 className="skill-name">{skill.name}</h3>
        {skill.description && (
          <p className="skill-description">{skill.description}</p>
        )}
      </div>
      
      {skill.tags.length > 0 && (
        <div className="skill-card-footer">
          {skill.tags.slice(0, 3).map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {skill.tags.length > 3 && (
            <span className="skill-tags-more">+{skill.tags.length - 3}</span>
          )}
        </div>
      )}
      
      {(skill.githubUrl || skill.isCustomized || skill.hasUpdate) && (
        <div className="skill-card-badges">
          {skill.githubUrl && (
            <span className="badge badge-github" title="已绑定 GitHub">🔗</span>
          )}
          {skill.isCustomized && (
            <span className="badge badge-customized" title="Customized">✏️</span>
          )}
          {skill.hasUpdate && (
            <span className="badge badge-update" title="有可用更新">🔄</span>
          )}
        </div>
      )}
    </Link>
  );
}
