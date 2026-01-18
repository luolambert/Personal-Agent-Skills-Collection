import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSkillFile, getGitHubFileContent } from '../../services/api';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import './FileExplorer.css';

function buildFileTree(files) {
  const root = [];
  
  for (const filePath of files) {
    const parts = filePath.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      
      let node = current.find(n => n.name === name);
      
      if (!node) {
        node = {
          name,
          path,
          type: isFile ? 'file' : 'folder',
          ext: isFile ? name.split('.').pop().toLowerCase() : null,
          children: isFile ? null : []
        };
        current.push(node);
      }
      
      if (!isFile) {
        current = node.children;
      }
    }
  }
  
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => n.children && sortNodes(n.children));
  };
  
  sortNodes(root);
  return root;
}

function convertGitHubTree(tree) {
  const convertNode = (node) => ({
    name: node.name,
    path: node.path,
    type: node.type === 'dir' ? 'folder' : 'file',
    ext: node.type === 'file' ? node.name.split('.').pop().toLowerCase() : null,
    children: node.children ? node.children.map(convertNode) : null
  });
  
  return tree.map(convertNode);
}

const FILE_ICONS = {
  folder: { icon: '📁', color: '#F59E0B' },
  md: { icon: '📄', color: '#3B82F6' },
  py: { icon: '🐍', color: '#10B981' },
  js: { icon: '📜', color: '#FBBF24' },
  jsx: { icon: '⚛️', color: '#61DAFB' },
  ts: { icon: '📜', color: '#3178C6' },
  tsx: { icon: '⚛️', color: '#3178C6' },
  json: { icon: '{ }', color: '#6B7280' },
  txt: { icon: '📝', color: '#9CA3AF' },
  css: { icon: '🎨', color: '#EC4899' },
  default: { icon: '📄', color: '#6B7280' }
};

function getFileIcon(node) {
  if (node.type === 'folder') return FILE_ICONS.folder;
  return FILE_ICONS[node.ext] || FILE_ICONS.default;
}

function buildGitHubUrl(baseUrl, filePath) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    const pathParts = url.pathname.split('/');
    const owner = pathParts[1];
    const repo = pathParts[2];
    
    if (pathParts[3] === 'tree' || pathParts[3] === 'blob') {
      const branch = pathParts[4];
      const basePath = pathParts.slice(5).join('/');
      const fullPath = basePath ? `${basePath}/${filePath}` : filePath;
      return `https://github.com/${owner}/${repo}/blob/${branch}/${fullPath}`;
    } else {
      return `https://github.com/${owner}/${repo}/blob/main/${filePath}`;
    }
  } catch {
    return null;
  }
}

export default function FileExplorer({ files, skillId, storageMode, githubFileTree, githubUrl }) {
  const [currentPath, setCurrentPath] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const isReferenceMode = storageMode === 'reference';
  
  let tree = [];
  if (isReferenceMode && githubFileTree) {
    tree = convertGitHubTree(githubFileTree);
  } else if (files && files.length > 0) {
    tree = buildFileTree(files);
  }
  
  let effectiveTree = tree;
  if (tree.length === 1 && tree[0].type === 'folder') {
    effectiveTree = tree[0].children || [];
  }
  
  let currentNodes = effectiveTree;
  for (const segment of currentPath) {
    const folder = currentNodes.find(n => n.name === segment && n.type === 'folder');
    if (folder && folder.children) {
      currentNodes = folder.children;
    } else {
      break;
    }
  }
  
  const handleClick = async (node) => {
    if (node.type === 'folder') {
      setCurrentPath([...currentPath, node.name]);
    } else {
      setLoading(true);
      
      if (isReferenceMode) {
        const content = await getGitHubFileContent(skillId, node.path);
        setPreviewFile({ ...node, githubViewUrl: content?.githubUrl });
        setPreviewContent(content);
      } else {
        const content = await getSkillFile(skillId, node.path);
        setPreviewFile(node);
        setPreviewContent(content);
      }
      
      setLoading(false);
    }
  };
  
  const handleBreadcrumb = (index) => {
    setCurrentPath(currentPath.slice(0, index));
  };
  
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
  };

  const openInGitHub = (filePath) => {
    const url = buildGitHubUrl(githubUrl, filePath);
    if (url) window.open(url, '_blank');
  };
  
  if (!currentNodes || currentNodes.length === 0) {
    return null;
  }
  
  return (
    <div className="file-explorer">
      {isReferenceMode && (
        <div className="reference-mode-hint">📎 引用模式 - 文件存储在 GitHub</div>
      )}
      
      {currentPath.length > 0 && (
        <div className="file-breadcrumb">
          <button 
            className="breadcrumb-item"
            onClick={() => setCurrentPath([])}
          >
            根目录
          </button>
          {currentPath.map((segment, index) => (
            <span key={index}>
              <span className="breadcrumb-separator">/</span>
              <button 
                className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`}
                onClick={() => handleBreadcrumb(index + 1)}
              >
                {segment}
              </button>
            </span>
          ))}
        </div>
      )}
      
      <div className="file-grid">
        {currentNodes.map(node => {
          const iconInfo = getFileIcon(node);
          return (
            <div 
              key={node.path} 
              className="file-item"
              onClick={() => handleClick(node)}
            >
              <div className="file-icon" style={{ color: iconInfo.color }}>
                {iconInfo.icon}
              </div>
              <div className="file-name">{node.name}</div>
              {isReferenceMode && node.type === 'file' && (
                <button 
                  className="file-github-link"
                  onClick={(e) => { e.stopPropagation(); openInGitHub(node.path); }}
                  title="在 GitHub 中打开"
                >
                  ↗
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {previewFile && (
        <Modal title={previewFile.name} onClose={closePreview}>
          <div className="file-preview">
            {previewFile.githubViewUrl && (
              <a 
                href={previewFile.githubViewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="preview-github-link"
              >
                在 GitHub 中查看 ↗
              </a>
            )}
            {loading ? (
              <div className="preview-loading"><LoadingSpinner size="sm" text="" /></div>
            ) : previewContent ? (
              previewFile.ext === 'md' ? (
                <div className="preview-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {previewContent.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="preview-code">
                  <code>{previewContent.content}</code>
                </pre>
              )
            ) : (
              <div className="preview-error">无法加载文件内容</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
