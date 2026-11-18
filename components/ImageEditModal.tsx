import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Trash2 } from 'lucide-react';
import { saveDashboardImage } from '../services/dataService';

// Editor de imágenes común: tarjetas del inicio, banner y portadas de las secciones.
export interface ImageEditTarget {
  key: string;
  w: number;
  h: number;
  label: string;
}

// ── Canvas-based resize / crop ───────────────────────────────────────────────
export const processImage = (
  file: File,
  targetW: number,
  targetH: number,
  mode: 'cover' | 'contain',
): Promise<Blob> =>
  new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); resolve(new Blob()); };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;

      const imgRatio = img.width / img.height;
      const targetRatio = targetW / targetH;

      if (mode === 'contain') {
        // Fill background then draw full image centred (letterbox)
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, targetW, targetH);
        let drawW: number, drawH: number;
        if (imgRatio > targetRatio) {
          drawW = targetW;
          drawH = targetW / imgRatio;
        } else {
          drawH = targetH;
          drawW = targetH * imgRatio;
        }
        ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
      } else {
        // Cover: centre-crop to fill
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      }

      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.82);
    };
    img.src = url;
  });

interface ImageEditModalProps {
  target: ImageEditTarget | null;
  onClose: () => void;
  onSaved: (key: string, url: string) => void;
  /** Si se pasa, aparece «Quitar imagen» (portadas opcionales). */
  onRemove?: () => void;
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({ target, onClose, onSaved, onRemove }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [cropMode, setCropMode] = useState<'cover' | 'contain'>('cover');
  const [isProcessing, setIsProcessing] = useState(false);

  // Cada vez que se abre para otra imagen, empieza de cero
  useEffect(() => {
    setSelectedFile(null);
    setPreviewBlob(null);
    setCropMode('cover');
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  }, [target?.key]);

  const showPreview = (blob: Blob) => {
    setPreviewBlob(blob);
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !target) return;
    setSelectedFile(file);
    setIsProcessing(true);
    showPreview(await processImage(file, target.w, target.h, cropMode));
    setIsProcessing(false);
  };

  const handleModeChange = async (mode: 'cover' | 'contain') => {
    setCropMode(mode);
    if (selectedFile && target) {
      setIsProcessing(true);
      showPreview(await processImage(selectedFile, target.w, target.h, mode));
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!previewBlob || !target) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/upload?type=dashboard&key=${encodeURIComponent(target.key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Filename': encodeURIComponent(`${target.key}.jpg`),
          },
          body: previewBlob,
        }
      );
      const data = await res.json();
      if (data.success) {
        saveDashboardImage(target.key, data.url);
        onSaved(target.key, data.url);
        onClose();
      }
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-zinc-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Cambiar imagen</h3>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {target.label} · {target.w} × {target.h} px
            </p>

            {/* Preview */}
            <div
              className="w-full rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-zinc-800 relative flex items-center justify-center"
              style={{ aspectRatio: `${target.w}/${target.h}` }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-400 dark:text-zinc-500">Vista previa</span>
              )}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Mode selector */}
            <div className="flex gap-2 mb-4">
              {(['cover', 'contain'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${cropMode === mode
                    ? 'bg-hispa-red text-white'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                >
                  {mode === 'cover' ? 'Recortar para rellenar' : 'Ajustar sin recortar'}
                </button>
              ))}
            </div>

            {/* File input */}
            <label className="block w-full cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <div className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl text-center text-gray-500 dark:text-gray-400 hover:border-hispa-red dark:hover:border-hispa-blue transition text-sm flex items-center justify-center gap-2">
                <Upload size={15} />
                {selectedFile ? selectedFile.name : 'Seleccionar imagen'}
              </div>
            </label>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!previewBlob || isProcessing}
              className="mt-4 w-full py-3 bg-hispa-red text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Guardar imagen
            </button>

            {onRemove && (
              <button
                onClick={() => { onRemove(); onClose(); }}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition flex items-center justify-center gap-2"
              >
                <Trash2 size={15} />
                Quitar imagen
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
