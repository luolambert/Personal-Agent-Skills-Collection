import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import TagBadge from '../common/TagBadge';

export default function Sidebar({ 
  tags, 
  selectedTags, 
  onTagSelect, 
  skillCount,
  showStarred,
  onStarredToggle
}) {
  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagSelect(selectedTags.filter(t => t !== tag));
    } else {
      onTagSelect([...selectedTags, tag]);
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive && !showStarred ? 'active' : ''}`}
          onClick={() => onStarredToggle(false)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          全部
        </NavLink>
        
        <button 
          className={`nav-item ${showStarred ? 'active' : ''}`}
          onClick={() => onStarredToggle(!showStarred)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.23L9 13.02L4.82 15.23L5.5 10.34L2 6.97L6.91 6.26L9 2Z" 
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
              fill={showStarred ? 'var(--color-warning)' : 'none'}
            />
          </svg>
          收藏
        </button>
        
        <NavLink to="/trash" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5H15M6 5V3C6 2.45 6.45 2 7 2H11C11.55 2 12 2.45 12 3V5M14 5V15C14 15.55 13.55 16 13 16H5C4.45 16 4 15.55 4 15V5H14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          回收站
        </NavLink>
      </nav>
      
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">标签</h3>
        <div className="sidebar-tags">
          {tags.map(tag => (
            <TagBadge 
              key={tag} 
              tag={tag} 
              selected={selectedTags.includes(tag)}
              onClick={() => handleTagClick(tag)}
            />
          ))}
          {tags.length === 0 && (
            <span className="sidebar-empty">暂无标签</span>
          )}
        </div>
      </div>
      
      <div className="sidebar-stats">
        <div className="stats-item">
          <span className="stats-value">{skillCount}</span>
          <span className="stats-label">个 Skills</span>
        </div>
      </div>
    </aside>
  );
}
