import './TagBadge.css';

const tagColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e'
];

function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

export default function TagBadge({ tag, selected, onClick, onRemove }) {
  const color = getTagColor(tag);
  
  return (
    <span 
      className={`tag-badge ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ 
        '--tag-color': color,
        '--tag-bg': `${color}20`
      }}
      onClick={onClick}
    >
      {tag}
      {onRemove && (
        <button 
          className="tag-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
