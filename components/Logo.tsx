import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 shrink-0 bg-white rounded-xl flex items-center justify-center shadow-md ring-1 ring-black/5 dark:ring-white/10">
        <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-bold text-hispa-red dark:text-gray-100 tracking-tight">
            LA HISPANIDAD
          </span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-[0.2em]">
            COLEGIO
          </span>
        </div>
      )}
    </div>
  );
};