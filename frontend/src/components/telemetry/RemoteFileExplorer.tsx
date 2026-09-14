'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FolderTreeSelector } from './FolderTreeSelector';
import { RemoteFileTable, FileItem } from './RemoteFileTable';
import { OpusAudioPlayer } from './OpusAudioPlayer';

interface RemoteFileExplorerProps {
  deviceId: string;
  onBack: () => void;
  onSelectAudio?: (file: FileItem) => void;
}

export const RemoteFileExplorer: React.FC<RemoteFileExplorerProps> = ({
  deviceId,
  onBack,
  onSelectAudio
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [enabledPaths, setEnabledPaths] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingSignal, setIsSendingSignal] = useState(false);
  const [signalMsg, setSignalMsg] = useState<string | null>(null);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeAudioFile, setActiveAudioFile] = useState<FileItem | null>(null);

  const fetchIndexAndRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const [indexRes, rulesRes] = await Promise.all([
        fetch(`/api/telemetry/device-index?deviceId=${encodeURIComponent(deviceId)}`),
        fetch(`/api/telemetry/sync-rules?deviceId=${encodeURIComponent(deviceId)}`)
      ]);

      const indexData = await indexRes.json();
      const rulesData = await rulesRes.json();

      if (indexData.success && Array.isArray(indexData.files)) {
        setFiles(indexData.files);
        setLastScanned(indexData.last_scanned);
      }

      if (rulesData.success && rulesData.rules?.enabled_paths) {
        setEnabledPaths(rulesData.rules.enabled_paths);
      }
    } catch (err) {
      console.error('Error loading file index or rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchIndexAndRules();
  }, [fetchIndexAndRules]);

  const handleTriggerSignal = async () => {
    try {
      setIsSendingSignal(true);
      setSignalMsg(null);
      const res = await fetch('/api/telemetry/signal-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const data = await res.json();
      if (data.success) {
        setSignalMsg('Senal inmediata enviada al telefono correctamente.');
        setTimeout(() => setSignalMsg(null), 5000);
      }
    } catch (err) {
      console.error('Error sending sync signal:', err);
    } finally {
      setIsSendingSignal(false);
    }
  };

  const handleTogglePath = async (folderPath: string, isEnabled: boolean) => {
    let updatedPaths: string[];
    if (isEnabled) {
      updatedPaths = [...enabledPaths, folderPath];
    } else {
      updatedPaths = enabledPaths.filter(p => p.toLowerCase() !== folderPath.toLowerCase());
    }
    setEnabledPaths(updatedPaths);

    try {
      setIsSavingRules(true);
      await fetch('/api/telemetry/sync-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, enabled_paths: updatedPaths })
      });
    } catch (err) {
      console.error('Error updating sync rules:', err);
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleRequestUpload = async (file: FileItem) => {
    try {
      // Immediate UI state feedback
      setFiles(prev =>
        prev.map(f => (f.path === file.path ? { ...f, status: 'requested' } : f))
      );

      await fetch('/api/telemetry/request-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          path: file.path,
          relativePath: file.relativePath || file.name
        })
      });
    } catch (err) {
      console.error('Error requesting upload:', err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1"
          >
            &larr; Volver al Hub de Modulos
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Explorador Remoto de Archivos</h1>
          <p className="text-xs text-gray-500">
            Dispositivo: <span className="font-mono font-semibold text-gray-700">{deviceId}</span> | 
            Ultimo escaneo: <span className="font-semibold">{lastScanned ? new Date(lastScanned).toLocaleString() : 'N/A'}</span>
          </p>
        </div>

        {/* Sync Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchIndexAndRules}
            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            🔄 Refrescar Estado
          </button>
          <button
            onClick={handleTriggerSignal}
            disabled={isSendingSignal}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span>⚡</span> {isSendingSignal ? 'Enviando...' : 'Sincronizar Ahora / Enviar Senal'}
          </button>
        </div>
      </div>

      {signalMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{signalMsg}</span>
          <button onClick={() => setSignalMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}

      {/* Main Grid: Folder Rules Sidebar + File Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FolderTreeSelector
            deviceId={deviceId}
            enabledPaths={enabledPaths}
            onTogglePath={handleTogglePath}
            isSaving={isSavingRules}
          />
        </div>

        <div className="lg:col-span-3">
          <RemoteFileTable
            deviceId={deviceId}
            files={files}
            onRequestUpload={handleRequestUpload}
            onPlayAudio={(file) => {
              setActiveAudioFile(file);
              if (onSelectAudio) onSelectAudio(file);
            }}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Floating Opus & Audio Player */}
      <OpusAudioPlayer
        deviceId={deviceId}
        file={activeAudioFile}
        onClose={() => setActiveAudioFile(null)}
      />
    </div>
  );
};
