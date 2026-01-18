const GITHUB_API = 'https://api.github.com';

const EXCLUDED_PATTERNS = [
  /^README\.md$/i,
  /^README.*\.md$/i,
  /^LICENSE$/i,
  /^LICENSE\..*/i,
  /^CHANGELOG\.md$/i,
  /^CONTRIBUTING\.md$/i,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.github\//,
  /^node_modules\//,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^\.env.*/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /^__tests__\//,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i,
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
];

function shouldExclude(filePath) {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

export function parseGitHubUrl(url) {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)\/?$/,
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/,
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      if (match.length === 3) {
        return { owner: match[1], repo: match[2], path: '', branch: null, type: 'repo' };
      } else if (match.length === 5) {
        const type = url.includes('/blob/') ? 'file' : 'folder';
        return { owner: match[1], repo: match[2], branch: match[3], path: match[4], type };
      }
    }
  }
  
  throw new Error('Invalid GitHub URL format');
}

async function githubFetch(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Agent-Skills-Collection'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${GITHUB_API}${endpoint}`, { headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }
  
  return response.json();
}

export async function getDefaultBranch(owner, repo) {
  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`);
  return repoInfo.default_branch || 'main';
}

export async function getRepoContents(owner, repo, path = '', branch = 'main') {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`;
  return githubFetch(endpoint);
}

export async function getLatestCommit(owner, repo, path = '', branch = 'main') {
  const endpoint = `/repos/${owner}/${repo}/commits?path=${path}&sha=${branch}&per_page=1`;
  const commits = await githubFetch(endpoint);
  return commits[0]?.sha || null;
}

export async function getFileContent(owner, repo, path, branch = 'main') {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const file = await githubFetch(endpoint);
  
  if (file.encoding === 'base64') {
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }
  
  return file.content;
}

export async function downloadAndProcessFiles(owner, repo, path = '', branch = 'main', basePath = null) {
  if (basePath === null) {
    basePath = path;
  }
  
  const contents = await getRepoContents(owner, repo, path, branch);
  const files = [];
  
  const items = Array.isArray(contents) ? contents : [contents];
  
  for (const item of items) {
    let relativePath;
    if (basePath === '') {
      relativePath = item.path;
    } else {
      relativePath = item.path.startsWith(basePath + '/') 
        ? item.path.slice(basePath.length + 1) 
        : item.path;
    }
    
    if (shouldExclude(relativePath) || shouldExclude(item.name)) {
      continue;
    }
    
    if (item.type === 'file') {
      const content = await getFileContent(owner, repo, item.path, branch);
      files.push({
        name: item.name,
        path: relativePath,
        content,
        size: item.size
      });
    } else if (item.type === 'dir') {
      const subFiles = await downloadAndProcessFiles(owner, repo, item.path, branch, basePath);
      files.push(...subFiles);
    }
  }
  
  return files;
}

export async function getFileTree(owner, repo, path = '', branch = 'main', basePath = null) {
  if (basePath === null) {
    basePath = path;
  }
  
  const contents = await getRepoContents(owner, repo, path, branch);
  const tree = [];
  
  const items = Array.isArray(contents) ? contents : [contents];
  
  for (const item of items) {
    let relativePath;
    if (basePath === '') {
      relativePath = item.path;
    } else {
      relativePath = item.path.startsWith(basePath + '/') 
        ? item.path.slice(basePath.length + 1) 
        : item.path;
    }
    
    if (shouldExclude(relativePath) || shouldExclude(item.name)) {
      continue;
    }
    
    if (item.type === 'file') {
      tree.push({
        name: item.name,
        path: relativePath,
        type: 'file',
        size: item.size
      });
    } else if (item.type === 'dir') {
      const subTree = await getFileTree(owner, repo, item.path, branch, basePath);
      tree.push({
        name: item.name,
        path: relativePath,
        type: 'dir',
        children: subTree
      });
    }
  }
  
  return tree;
}

export function buildGitHubFileUrl(githubUrl, filePath) {
  const { owner, repo, branch, path: basePath } = parseGitHubUrl(githubUrl);
  const fullPath = basePath ? `${basePath}/${filePath}` : filePath;
  const branchRef = branch || 'main';
  return `https://github.com/${owner}/${repo}/blob/${branchRef}/${fullPath}`;
}

export function extractSkillName(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  return null;
}

export function extractDescription(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      return descMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  
  return '';
}

export function detectGitHubLinks(content) {
  const pattern = /https?:\/\/github\.com\/[^\s\)>\]]+/g;
  const matches = content.match(pattern) || [];
  return [...new Set(matches)];
}
