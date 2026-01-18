import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'md', text = '加载中...' }) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <div className="loading-spinner__ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {text && <p className="loading-spinner__text">{text}</p>}
    </div>
  );
}
