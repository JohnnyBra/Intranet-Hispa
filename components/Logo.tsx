import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="Logo La Hispanidad"
        className="h-10 w-auto object-contain dark:brightness-0 dark:invert"
      />
    </div>
  );
};