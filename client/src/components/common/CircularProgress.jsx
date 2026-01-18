import './CircularProgress.css';

export default function CircularProgress({ 
  progress = null, 
  size = 'md', 
  text = '' 
}) {
  const isIndeterminate = progress === null || progress === undefined;
  const normalizedProgress = isIndeterminate ? 0 : Math.min(100, Math.max(0, progress));
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - normalizedProgress / 100);

  return (
    <div className={`circular-progress circular-progress--${size} ${isIndeterminate ? 'circular-progress--indeterminate' : ''}`}>
      <svg viewBox="0 0 100 100" className="circular-progress__svg">
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-light, #60a5fa)" />
          </linearGradient>
        </defs>
        <circle
          className="circular-progress__track"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="6"
        />
        <circle
          className="circular-progress__indicator"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          stroke={isIndeterminate ? "url(#progress-gradient)" : "var(--color-primary)"}
        />
      </svg>
      <div className="circular-progress__content">
        {!isIndeterminate && (
          <span className="circular-progress__value">{Math.round(normalizedProgress)}%</span>
        )}
      </div>
      {text && <p className="circular-progress__text">{text}</p>}
    </div>
  );
}
