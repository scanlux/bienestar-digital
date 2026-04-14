'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = 'https://trendy.sytes.net';

export default function StoresManagementPage({ params }: { params: { brandId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ brand_id: params.brandId, nombre_sucursal: '', direccion: '', horario_atencion: '', estado: 'abierto' });

  useEffect(() => {
    fetchStores();
  }, [params.brandId]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/stores/${params.brandId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStores(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      await axios.post(`${API_URL}/api/manage/stores`, { ...formData, latitud: 0, longitud: 0 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setFormData({ brand_id: params.brandId, nombre_sucursal: '', direccion: '', horario_atencion: '', estado: 'abierto' });
      fetchStores();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="space-y-8 relative"
    >
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push('/admin/dashboard/brands')}
            className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2 mb-2"
          >
            ← Volver a Marcas
          </button>
          <h1 className="text-3xl font-light mb-1">Sedes Físicas <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Activas</span></h1>
          <p className="text-white/50 text-sm">Gestiona los locales comerciales para la marca seleccionada.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-colors shadow-lg shadow-green-500/20 whitespace-nowrap"
          >
            + Nueva Sede
          </button>
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
            <div className="loader border-t-2 border-green-500 rounded-full w-8 h-8 animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((store) => (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={store.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-green-500/30 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl drop-shadow-md">{store.nombre_sucursal}</h3>
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${store.estado === 'abierto' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {store.estado}
                  </span>
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-white/70 flex items-center gap-2">
                    <span className="text-white/30 truncate">📍</span> {store.direccion}
                  </p>
                  <p className="text-sm text-white/50 flex items-center gap-2 italic">
                    <span className="text-white/30 truncate">🕒</span> {store.horario_atencion}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => router.push(`/admin/dashboard/stores/${store.id}`)}
                    className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white/80 hover:text-white"
                  >
                    Menús y Productos →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {stores.length === 0 && (
             <div className="col-span-full py-20 text-center text-white/40 border border-dashed border-white/10 rounded-2xl">
                 No hay sedes registradas para esta marca. <br/><span className="text-xs">Usa el botón superior para crear una sucursal.</span>
             </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-6">Añadir Sucursal</h2>
              
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Nombre (Ej: Sede Centro)</label>
                  <input required type="text" value={formData.nombre_sucursal} onChange={e => setFormData({...formData, nombre_sucursal: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Dirección Exacta</label>
                  <input required type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Horario (Ej: Lun a Vie 8am - 5pm)</label>
                  <input type="text" value={formData.horario_atencion} onChange={e => setFormData({...formData, horario_atencion: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Estado</label>
                  <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 text-white">
                    <option value="abierto" className="bg-[#111]">Operando (Abierto)</option>
                    <option value="cerrado" className="bg-[#111]">Pausado (Cerrado temporalmente)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-colors mt-4">
                  Guardar Sucursal
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
