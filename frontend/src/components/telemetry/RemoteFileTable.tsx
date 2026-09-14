'use client';

import React, { useState, useMemo } from 'react';

export interface FileItem {
  name: string;
  path: string;
  relativePath?: string;
  size: number;
  lastModified?: number | string;
  status: 'on_phone' | 'requested' | 'on_server';
}

interface RemoteFileTableProps {
  deviceId: string;
  files: FileItem[];
  onRequestUpload: (file: FileItem) => void;
  onPlayAudio?: (file: FileItem) => void;
  isLoading?: boolean;
}

export const RemoteFileTable: React.FC<RemoteFileTableProps> = ({
  deviceId,
  files,
  onRequestUpload,
  onPlayAudio,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'opus' | 'audio' | 'docs'>('all');

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const nameMatch = (file.name || file.path || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!nameMatch) return false;

      const ext = (file.name || file.path || '').split('.').pop()?.toLowerCase() || '';
      if (filterType === 'opus') return ext === 'opus';
      if (filterType === 'audio') return ['opus', 'mp3', 'ogg', 'wav', 'm4a'].includes(ext);
      if (filterType === 'docs') return ['pdf', 'docx', 'xlsx', 'txt', 'csv'].includes(ext);

      return true;
    });
  }, [files, searchTerm, filterType]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isAudioFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['opus', 'mp3', 'ogg', 'wav', 'm4a'].includes(ext);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header Bar: Search & Filter Tabs */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            placeholder="Buscar por nombre o ruta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Extension Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({files.length})
          </button>
          <button
            onClick={() => setFilterType('opus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'opus'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Notas .opus
          </button>
          <button
            onClick={() => setFilterType('audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'audio'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Audios
          </button>
          <button
            onClick={() => setFilterType('docs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'docs'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Documentos
          </button>
        </div>
      </div>

      {/* File Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Nombre de Archivo / Ruta</th>
              <th className="py-3 px-4">Tamaño</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Cargando índice de archivos...
                </td>
              </tr>
            ) : filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  {searchTerm ? 'No se encontraron archivos con ese criterio.' : 'No hay archivos indexados.'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((file, idx) => {
                const isAudio = isAudioFile(file.name || file.path);
                const relPath = file.relativePath || file.name || file.path;

                return (
                  <tr key={file.path || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                        <span>{isAudio ? '🎙️' : '📄'}</span>
                        <span className="truncate">{file.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono truncate">{file.path}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {file.status === 'on_server' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          🟢 En Servidor
                        </span>
                      )}
                      {file.status === 'requested' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                          ⏳ Solicitado
                        </span>
                      )}
                      {file.status === 'on_phone' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                          ⚪ En teléfono
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {file.status === 'on_phone' && (
                        <button
                          onClick={() => onRequestUpload(file)}
                          className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-lg transition-colors shadow-sm"
                        >
                          Solicitar Subida
                        </button>
                      )}
                      {file.status === 'requested' && (
                        <span className="text-[11px] text-amber-600 font-medium">En espera de sync...</span>
                      )}
                      {file.status === 'on_server' && (
                        <div className="flex items-center justify-end gap-2">
                          {isAudio && onPlayAudio && (
                            <button
                              onClick={() => onPlayAudio(file)}
                              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1"
                            >
                              <span>▶</span> Reproducir
                            </button>
                          )}
                          <a
                            href={`/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&filePath=${encodeURIComponent(relPath)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium rounded-lg transition-colors"
                          >
                            ⬇ Abrir
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
