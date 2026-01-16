import { useState, useMemo } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import SkillCard from '../components/skills/SkillCard';
import SearchBar from '../components/common/SearchBar';
import { useSkills, useTags } from '../hooks/useSkills';
import { toggleStar, exportSkills, deleteSkill } from '../services/api';
import './HomePage.css';

export default function HomePage() {
  const { skills, loading, filters, setFilters, refetch } = useSkills();
  const { tags, refetch: refetchTags } = useTags();
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const filteredSkills = useMemo(() => {
    if (!filters.starred) return skills;
    return skills.filter(s => s.starred);
  }, [skills, filters.starred]);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleTagSelect = (tags) => {
    setFilters(prev => ({ ...prev, tags }));
  };

  const handleStarredToggle = (starred) => {
    setFilters(prev => ({ ...prev, starred }));
  };

  const handleStar = async (id) => {
    await toggleStar(id);
    refetch();
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSkills.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSkills.map(s => s.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    await exportSkills(selectedIds);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 个 Skills 吗？`)) return;
    
    for (const id of selectedIds) {
      await deleteSkill(id);
    }
    setSelectedIds([]);
    setSelectionMode(false);
    refetch();
  };

  const handleUploadSuccess = () => {
    refetch();
    refetchTags();
  };

  return (
    <div className="home-page">
      <Header onUploadSuccess={handleUploadSuccess} />
      
      <Sidebar
        tags={tags}
        selectedTags={filters.tags}
        onTagSelect={handleTagSelect}
        skillCount={filteredSkills.length}
        showStarred={filters.starred}
        onStarredToggle={handleStarredToggle}
      />
      
      <main className="main-content">
        <div className="content-header">
          <SearchBar 
            value={filters.search} 
            onChange={handleSearch}
          />
          
          <div className="content-actions">
            <button 
              className={`btn btn-secondary btn-sm ${selectionMode ? 'active' : ''}`}
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds([]);
              }}
            >
              {selectionMode ? '取消选择' : '批量操作'}
            </button>
          </div>
        </div>

        {selectionMode && (
          <div className="batch-actions">
            <label className="batch-select-all">
              <input 
                type="checkbox"
                checked={selectedIds.length === filteredSkills.length && filteredSkills.length > 0}
                onChange={handleSelectAll}
              />
              全选 ({selectedIds.length}/{filteredSkills.length})
            </label>
            
            <div className="batch-buttons">
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleExport}
                disabled={selectedIds.length === 0}
              >
                导出选中
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0}
              >
                删除选中
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : filteredSkills.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="16" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 24H56" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 8L32 16L40 8" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>{filters.search || filters.tags.length > 0 ? '没有找到匹配的 Skills' : '还没有 Skills，点击上传按钮添加'}</p>
          </div>
        ) : (
          <div className="skills-grid">
            {filteredSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                selected={selectedIds.includes(skill.id)}
                onSelect={handleSelect}
                onStar={handleStar}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
