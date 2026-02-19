import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Recreation of the Logo */}
      <div className="relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Color: hispa-red (now Dark Blue) */}
          <g className="text-hispa-red dark:text-blue-400" fill="currentColor">
             {/* Base/Boat */}
             <path d="M25 95 L35 110 L65 110 L75 95 L65 95 L35 95 Z" />
             <rect x="35" y="90" width="30" height="5" />
             
             {/* Column */}
             <rect x="42" y="50" width="16" height="45" />
             <rect x="40" y="45" width="20" height="5" />
             
             {/* Sphere */}
             <circle cx="50" cy="35" r="10" />
             
             {/* Cross */}
             <rect x="46" y="10" width="8" height="15" />
             <rect x="42" y="15" width="16" height="5" />
             
             {/* Side Arcs */}
             <path d="M30 30 A 40 40 0 0 0 30 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="square" />
             <path d="M70 30 A 40 40 0 0 1 70 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="square" />
          </g>
        </svg>
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