import React from 'react';
import { FileText, Image, Video, Link as LinkIcon, Download, Trash2, Pencil, ExternalLink, Tag } from 'lucide-react';
import { Resource } from '../types';

interface ResourceCardProps {
  resource: Resource;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getIcon = (type: Resource['type']) => {
  switch (type) {
    case 'pdf': return <FileText className="text-red-500" />;
    case 'doc': return <FileText className="text-blue-500" />;
    case 'image': return <Image className="text-purple-500" />;
    case 'video': return <Video className="text-pink-500" />;
    case 'link': return <LinkIcon className="text-green-500" />;
    default: return <FileText className="text-gray-500" />;
  }
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, isAdmin, onEdit, onDelete }) => {
  const isDownloadable = resource.type === 'pdf' || resource.type === 'doc';
  
  const handleCardClick = () => {
    if (resource.url && resource.url !== '#') {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div 
        onClick={handleCardClick}
        className="group relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
          {getIcon(resource.type)}
        </div>
        <div className="flex flex-col items-end">
             <div className="text-xs text-gray-400">{resource.date}</div>
             {isAdmin && (
                 <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={handleActionClick} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-blue-500"><Pencil size={14}/></button>
                     <button onClick={handleDeleteClick} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-red-500"><Trash2 size={14}/></button>
                 </div>
             )}
        </div>
      </div>
      
      {/* Subject Badge */}
      {resource.subject && (
        <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {resource.subject}
            </span>
        </div>
      )}

      <h3 className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-hispa-blue transition-colors leading-tight mb-2">
        {resource.title}
      </h3>
      <p className="text-sm text-gray-500 mt-0 line-clamp-3 mb-4 flex-1">
        {resource.description}
      </p>

      {/* Courses Tags */}
      {resource.courses && resource.courses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {resource.courses.slice(0, 3).map(course => (
                <span key={course} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400">
                    {course}
                </span>
            ))}
            {resource.courses.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">+ {resource.courses.length - 3}</span>
            )}
          </div>
      )}
      
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
         <span className="text-xs text-gray-400 truncate max-w-[120px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
            {resource.uploadedBy}
         </span>
         
         <div className="text-gray-400 group-hover:text-hispa-blue transition-colors">
            {isDownloadable ? (
                <Download size={18} />
            ) : (
                <ExternalLink size={18} />
            )}
         </div>
      </div>
    </div>
  );
};