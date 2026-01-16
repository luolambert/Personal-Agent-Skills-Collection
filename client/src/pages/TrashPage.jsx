import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { getTrash, restoreFromTrash, permanentDelete } from '../services/api';
import { useTags } from '../hooks/useSkills';
import './TrashPage.css';

export default function TrashPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tags } = useTags();

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const data = await getTrash();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    await restoreFromTrash(id);
    loadTrash();
  };

  const handleDelete = async (id) => {
    if (!confirm('确定永久删除这个 Skill 吗？此操作不可撤销。')) return;
    await permanentDelete(id);
    loadTrash();
  };

  const handleClearAll = async () => {
    if (!confirm(`确定清空回收站中的 ${items.length} 个 Skills 吗？此操作不可撤销。`)) return;
    for (const item of items) {
      await permanentDelete(item.id);
    }
    loadTrash();
  };

  return (
    <div className="trash-page">
      <Header />
      
      <Sidebar
        tags={tags}
        selectedTags={[]}
        onTagSelect={() => {}}
        skillCount={0}
        showStarred={false}
        onStarredToggle={() => {}}
      />
      
      <main className="main-content">
        <div className="trash-header">
          <h1>回收站</h1>
          {items.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
              清空回收站
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path d="M12 20H52M24 20V12C24 10.9 24.9 10 26 10H38C39.1 10 40 10.9 40 12V20M48 20V52C48 53.1 47.1 54 46 54H18C16.9 54 16 53.1 16 52V20H48Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>回收站是空的</p>
          </div>
        ) : (
          <div className="trash-list">
            <p className="trash-hint">删除的 Skills 会在 30 天后自动永久删除</p>
            
            {items.map(item => (
              <div key={item.id} className="trash-item">
                <div className="trash-item-info">
                  <h3 className="trash-item-name">{item.name}</h3>
                  <span className="trash-item-expire">
                    剩余 {item.daysRemaining} 天
                  </span>
                </div>
                
                <div className="trash-item-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestore(item.id)}
                  >
                    恢复
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    永久删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
