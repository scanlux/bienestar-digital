'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DeviceModuleHub } from '@/components/telemetry/DeviceModuleHub';
import { RemoteFileExplorer } from '@/components/telemetry/RemoteFileExplorer';

export default function ExplPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const deviceId = searchParams.get('device');
  const view = searchParams.get('view');

  const handleSelectDevice = (id: string) => {
    router.push(`/expl?device=${encodeURIComponent(id)}`);
  };

  const handleSelectModule = (selectedView: 'nlp' | 'files') => {
    router.push(`/expl?device=${encodeURIComponent(deviceId || '')}&view=${selectedView}`);
  };

  const handleBackToDevices = () => {
    router.push('/expl');
  };

  const handleBackToHub = () => {
    router.push(`/expl?device=${encodeURIComponent(deviceId || '')}`);
  };

  // Nivel 2: Hub Intermedio de Seleccion de Modulo
  if (deviceId && !view) {
    return (
      <DeviceModuleHub
        deviceId={deviceId}
        onSelectModule={handleSelectModule}
        onBack={handleBackToDevices}
      />
    );
  }

  // Nivel 3: Vista de NLP o Archivos
  if (deviceId && view === 'nlp') {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <button onClick={handleBackToHub} className="text-sm text-blue-600 mb-4">&larr; Volver al Hub</button>
        <h1 className="text-2xl font-bold mb-2">Explorador Dataset NLP</h1>
        <p className="text-gray-500">Visualizacion de registros de texto del dispositivo {deviceId}.</p>
      </div>
    );
  }

  if (deviceId && view === 'files') {
    return (
      <RemoteFileExplorer
        deviceId={deviceId}
        onBack={handleBackToHub}
      />
    );
  }

  // Nivel 1: Lista General de Dispositivos Conectados
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Telemetria &amp; Exploracion Remota</h1>
      <p className="text-sm text-gray-500 mb-8">Selecciona un dispositivo para acceder a sus modulos de telemetria y archivos.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => handleSelectDevice('dev_android_01')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:border-blue-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-md">Online</span>
            <span className="text-xs text-gray-400">Hace un momento</span>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">dev_android_01</h3>
          <p className="text-xs text-gray-500 mb-4">Android Device Identity</p>
          <div className="text-xs font-medium text-blue-600">Click para abrir Hub &rarr;</div>
        </div>
      </div>
    </div>
  );
}
