'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DeviceModuleHub } from '@/components/telemetry/DeviceModuleHub';
import { RemoteFileExplorer } from '@/components/telemetry/RemoteFileExplorer';

interface DeviceItem {
  deviceId: string;
  model?: string;
  manufacturer?: string;
  android_version?: string;
  last_seen?: string | null;
  total_files?: number;
}

function ExplContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const deviceId = searchParams.get('device');
  const view = searchParams.get('view');

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  useEffect(() => {
    fetch('/api/telemetry/devices')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.devices)) {
          setDevices(data.devices);
        }
      })
      .catch((err) => console.error('Error fetching devices:', err))
      .finally(() => setIsLoadingDevices(false));
  }, []);

  const handleSelectDevice = (id: string) => {
    router.push(`/expl?device=${encodeURIComponent(id)}`);
  };

  const handleSelectModule = (selectedView: 'nlp' | 'files' | 'contacts') => {
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

  // Nivel 3: Vista de NLP, Archivos o Contactos
  if (deviceId && view === 'nlp') {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <button onClick={handleBackToHub} className="text-sm font-medium text-blue-600 mb-4 hover:underline">&larr; Volver al Hub</button>
        <h1 className="text-2xl font-bold mb-2">Explorador Dataset NLP</h1>
        <p className="text-gray-500">Visualizacion de registros de texto del dispositivo <span className="font-mono font-semibold">{deviceId}</span>.</p>
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

  if (deviceId && view === 'contacts') {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <button onClick={handleBackToHub} className="text-sm font-medium text-purple-600 mb-4 hover:underline">&larr; Volver al Hub</button>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Libreta de Contactos</h1>
          <p className="text-gray-500 mb-4">Copia de respaldo diaria de contactos para el dispositivo <span className="font-mono font-semibold">{deviceId}</span>.</p>
          <iframe 
            src={`/contacts-viewer/index.html?device=${encodeURIComponent(deviceId)}`}
            className="w-full h-[650px] border-0 rounded-xl"
            title="Vista de Libreta de Contactos"
          />
        </div>
      </div>
    );
  }

  // Nivel 1: Lista General de Dispositivos Conectados
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Telemetria &amp; Exploracion Remota</h1>
        <p className="text-sm text-gray-500">Selecciona un dispositivo para acceder a sus modulos de telemetria y exploracion de archivos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoadingDevices ? (
          <div className="col-span-3 text-center py-12 text-gray-400 text-sm">
            Cargando lista de dispositivos conectados...
          </div>
        ) : devices.length === 0 ? (
          /* Demo Fallback Card if no device has connected yet */
          <div
            onClick={() => handleSelectDevice('dev_android_01')}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full">
                Online
              </span>
              <span className="text-xs text-gray-400">Hace un momento</span>
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">dev_android_01</h3>
            <p className="text-xs text-gray-500 mb-4">Android Device Identity</p>
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              Abrir Hub de Seleccion &rarr;
            </div>
          </div>
        ) : (
          devices.map((dev) => (
            <div
              key={dev.deviceId}
              onClick={() => handleSelectDevice(dev.deviceId)}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Online
                </span>
                <span className="text-xs text-gray-400">
                  {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString() : 'Reciente'}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1 font-mono truncate">{dev.deviceId}</h3>
              <p className="text-xs text-gray-500 mb-1">{dev.manufacturer} {dev.model}</p>
              <p className="text-[11px] text-gray-400 mb-4">{dev.total_files || 0} archivos indexados</p>
              <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                Abrir Hub de Seleccion &rarr;
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ExplPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando modulo de telemetria...</div>}>
      <ExplContent />
    </Suspense>
  );
}
