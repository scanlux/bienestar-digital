'use client';

import React from 'react';

interface FolderTreeSelectorProps {
  deviceId: string;
  enabledPaths: string[];
  onTogglePath: (folderPath: string, isEnabled: boolean) => void;
  isSaving?: boolean;
}

const COMMON_FOLDERS = [
  {
    name: 'WhatsApp Voice Notes (.opus)',
    path: '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes',
    icon: '🎙️',
    description: 'Notas de voz enviadas y recibidas en WhatsApp'
  },
  {
    name: 'WhatsApp Audio (.opus / .mp3)',
    path: '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio',
    icon: '🎵',
    description: 'Archivos de audio transferidos por WhatsApp'
  },
  {
    name: 'Descargas (/Download)',
    path: '/Download',
    icon: '📥',
    description: 'Documentos y archivos descargados'
  },
  {
    name: 'Documentos (/Documents)',
    path: '/Documents',
    icon: '📄',
    description: 'Archivos PDF, DOCX, XLSX'
  },
  {
    name: 'Fotos de Cámara (/DCIM/Camera)',
    path: '/DCIM/Camera',
    icon: '📷',
    description: 'Fotografías tomadas con la cámara'
  },
  {
    name: 'Música (/Music)',
    path: '/Music',
    icon: '🎧',
    description: 'Archivos de música de la biblioteca'
  }
];

export const FolderTreeSelector: React.FC<FolderTreeSelectorProps> = ({
  deviceId,
  enabledPaths,
  onTogglePath,
  isSaving = false
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Directivas de Sincronización</h3>
          <p className="text-xs text-gray-500">Selecciona qué carpetas tienen autorización de descarga automática o bajo demanda</p>
        </div>
        {isSaving && (
          <span className="text-xs font-medium text-blue-600 animate-pulse">
            Guardando reglas...
          </span>
        )}
      </div>

      <div className="space-y-3">
        {COMMON_FOLDERS.map((folder) => {
          const isChecked = enabledPaths.some(p => p.toLowerCase() === folder.path.toLowerCase());
          return (
            <label
              key={folder.path}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                isChecked
                  ? 'bg-blue-50/60 border-blue-200'
                  : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onTogglePath(folder.path, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{folder.icon}</span>
                  <span className="text-xs font-bold text-gray-800">{folder.name}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">{folder.path}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{folder.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
