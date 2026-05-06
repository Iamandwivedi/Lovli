import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Reading the vibe…',
  'Finding natural replies…',
  'Making it sound like you…',
  'Keeping it respectful…',
];

export default function LoadingState({ subtle = false, className = '' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      data-testid="loading-state"
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span
          className="h-2 w-2 rounded-full bg-violet-400"
          style={{ animation: 'lovli-pulse 1.2s ease-in-out infinite' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-indigo-400"
          style={{ animation: 'lovli-pulse 1.2s ease-in-out 0.15s infinite' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-sky-400"
          style={{ animation: 'lovli-pulse 1.2s ease-in-out 0.3s infinite' }}
        />
      </div>
      {!subtle && (
        <p className="text-sm text-white/70" data-testid="loading-state-message">
          {MESSAGES[i]}
        </p>
      )}
    </div>
  );
}
