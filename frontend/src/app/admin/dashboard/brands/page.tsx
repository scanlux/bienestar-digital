'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = 'https://trendy.sytes.net';

export default function BrandsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', type: 'horizontal' });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/brands`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBrands(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      await axios.post(`${API_URL}/api/manage/brands`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setFormData({ nombre: '', descripcion: '', type: 'horizontal' });
      fetchBrands();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredBrands = brands.filter(b => 
    b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="space-y-8 relative"
    >
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light mb-1">Cátalogo de <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">Marcas</span></h1>
          <p className="text-white/50 text-sm">Gestiona todos los negocios registrados en la plataforma.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Buscar negocio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500/50 transition-colors placeholder:text-white/20"
            />
            <span className="absolute right-3 top-2.5 text-white/20">🔍</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-colors shadow-lg shadow-green-500/20 whitespace-nowrap"
          >
            + Nueva Marca
          </button>
        </div>
      </div>

      {/* Brands Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
            <div className="loader border-t-2 border-green-500 rounded-full w-8 h-8 animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={brand.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-green-500/30 hover:bg-white/[0.04] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                    <img src={brand.logo_url || 'https://via.placeholder.com/150'} alt={brand.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{brand.nombre}</h3>
                    <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60 mt-1 inline-block">
                      {brand.type}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/50 line-clamp-2 mb-6">{brand.descripcion}</p>
              </div>
              
              <div className="pt-4 border-t border-white/5 flex gap-2">
                <button 
                  onClick={() => router.push(`/admin/dashboard/brands/${brand.id}`)}
                  className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white/80 hover:text-white"
                >
                  Gestionar Sedes
                </button>
              </div>
            </motion.div>
          ))}
          
          {filteredBrands.length === 0 && (
             <div className="col-span-full py-20 text-center text-white/40">
                 No se encontraron resultados para &quot;{searchTerm}&quot;
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
              <h2 className="text-xl font-bold mb-6">Nueva Marca</h2>
              
              <form onSubmit={handleCreateBrand} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Nombre Comercial</label>
                  <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Descripción</label>
                  <textarea required value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 h-24 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Tipo de UI Predominante</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 text-white">
                    <option value="horizontal" className="bg-[#111]">Horizontal (Múltiples fotos)</option>
                    <option value="vertical" className="bg-[#111]">Vertical (Retrato/TikTok)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-colors mt-4">
                  Crear Negocio
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
