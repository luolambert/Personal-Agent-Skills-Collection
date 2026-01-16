import { useState } from 'react';
import './Header.css';
import UploadModal from '../skills/UploadModal';

export default function Header({ onUploadSuccess }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="currentColor" strokeWidth="2" fill="var(--color-primary-bg)"/>
            <path d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z" fill="var(--color-primary)"/>
          </svg>
          <span className="header-title">Skills Hub</span>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          上传
        </button>
      </header>
      
      {showUpload && (
        <UploadModal 
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            onUploadSuccess?.();
          }}
        />
      )}
    </>
  );
}
