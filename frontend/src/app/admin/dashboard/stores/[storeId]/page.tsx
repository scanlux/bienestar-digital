'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = 'https://trendy.sytes.net';

export default function StoreContentPage({ params }: { params: { storeId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [menus, setMenus] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | null>(null);

  // Modals state
  const [modalType, setModalType] = useState<null | 'menu' | 'categoria' | 'product'>('menu');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchInitialData();
  }, [params.storeId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const headers = { Authorization: `Bearer ${token}` };
      
      const [menusRes, ingRes, allProductsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/menus/${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/ingredients`, { headers }),
        axios.get(`${API_URL}/api/manage/products`, { headers }) // Getting all for now, filter client side
      ]);
      
      setMenus(menusRes.data);
      setIngredients(ingRes.data);
      setProducts(allProductsRes.data);
      
      if(menusRes.data.length > 0) {
        setActiveMenuId(menusRes.data[0].id);
        fetchCategorias(menusRes.data[0].id, headers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (menuId: number, existingHeaders?: any) => {
    try {
      const headers = existingHeaders || { Authorization: `Bearer ${document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]}` };
      const res = await axios.get(`${API_URL}/api/manage/categorias/${menuId}`, { headers });
      setCategorias(res.data);
      if(res.data.length > 0) setActiveCategoriaId(res.data[0].id);
      else setActiveCategoriaId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMenuSelect = (menuId: number) => {
    setActiveMenuId(menuId);
    fetchCategorias(menuId);
  };

  const openForm = (type: 'menu' | 'categoria' | 'product', initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      if (modalType === 'menu') {
        const payload = { ...formData, store_id: params.storeId };
        await axios.post(`${API_URL}/api/manage/menus`, payload, { headers });
        fetchInitialData(); // Refresh all
      } else if (modalType === 'categoria') {
        const payload = { ...formData, menu_id: activeMenuId };
        await axios.post(`${API_URL}/api/manage/categorias`, payload, { headers });
        if (activeMenuId) fetchCategorias(activeMenuId);
      } else if (modalType === 'product') {
        // Need to add logic to allow selecting brand_id or passing from store context.
        // For simplicity, passing dummy brand_id 1 if not provided, assuming API could infer later or we fetch the brand_id of the store.
        const payload = { ...formData, categoria_id: activeCategoriaId, brand_id: 1 };
        await axios.post(`${API_URL}/api/manage/products`, payload, { headers });
        // Refresh products
        const res = await axios.get(`${API_URL}/api/manage/products`, { headers });
        setProducts(res.data);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter(p => p.categoria_id === activeCategoriaId);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="space-y-8 relative"
    >
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2 mb-2"
          >
            ← Volver a Sedes
          </button>
          <h1 className="text-3xl font-light mb-1">Gestión de <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Carta y Productos</span></h1>
          <p className="text-white/50 text-sm">Organiza los menús, categorías e ítems de este local.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
            <div className="loader border-t-2 border-green-500 rounded-full w-8 h-8 animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar: Menus & Categories */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-medium">Menús</h2>
               <button onClick={() => openForm('menu')} className="text-sm text-green-400 hover:text-green-300 font-bold px-2 py-1 bg-green-500/10 rounded">+ Añadir</button>
            </div>
            
            <div className="space-y-2">
              {menus.map(menu => (
                <div key={menu.id} className="space-y-2">
                  <button 
                    onClick={() => handleMenuSelect(menu.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-all ${activeMenuId === menu.id ? 'bg-white/10 text-white border border-white/20' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                  >
                    📖 {menu.nombre}
                  </button>
                  
                  {/* Nested Categories */}
                  {activeMenuId === menu.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-4 space-y-1 mt-2">
                      {categorias.map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => setActiveCategoriaId(cat.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all ${activeCategoriaId === cat.id ? 'bg-green-500/20 text-green-400 font-medium' : 'text-white/40 hover:text-white/60'}`}
                        >
                          ↳ {cat.nombre}
                        </button>
                      ))}
                      <button onClick={() => openForm('categoria')} className="w-full text-left px-3 py-1.5 text-xs text-white/20 hover:text-white/50 border border-dashed border-white/5 rounded-md mt-2">
                        + Nueva Categoría
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}
              {menus.length === 0 && <p className="text-xs text-white/30 text-center py-4">No hay menús. Crea el primero.</p>}
            </div>
          </div>

          {/* Main Content: Products Data Grid */}
          <div className="lg:col-span-3">
             {activeCategoriaId ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                       <div>
                          <h2 className="text-2xl font-bold">{categorias.find(c => c.id === activeCategoriaId)?.nombre}</h2>
                          <p className="text-sm text-white/40 mt-1">{categorias.find(c => c.id === activeCategoriaId)?.descripcion}</p>
                       </div>
                       <button onClick={() => openForm('product')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold text-sm transition-all shadow-lg shadow-green-500/20">
                         + Añadir Producto
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProducts.map(prod => (
                        <motion.div key={prod.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] hover:border-white/20 transition-all">
                          <div className="w-24 h-24 rounded-lg bg-neutral-900 border border-white/10 flex-shrink-0 overflow-hidden relative">
                             {prod.image_url ? (
                               <img src={prod.image_url} alt={prod.nombre} className="w-full h-full object-cover" />
                             ) : (
                               <span className="absolute inset-0 flex items-center justify-center text-xs text-white/20">Sin foto</span>
                             )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-base leading-tight">{prod.nombre}</h4>
                                <span className="text-green-400 font-bold whitespace-nowrap bg-green-400/10 px-2 py-0.5 rounded-full text-sm">${Number(prod.precio_base).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-white/50 line-clamp-2 mt-1.5">{prod.descripcion_larga || prod.descripcion_corta}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                               <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${prod.disponible ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                 {prod.disponible ? 'Disponible' : 'Agotado'}
                               </span>
                               <button className="text-xs text-white/40 hover:text-white underline underline-offset-2">Editar</button>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {filteredProducts.length === 0 && (
                          <div className="col-span-full py-10 flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/5 rounded-xl">
                              <span className="text-3xl mb-2">🍽️</span>
                              <p>Esta categoría está vacía</p>
                          </div>
                      )}
                    </div>
                </div>
             ) : (
                <div className="flex items-center justify-center h-full min-h-[500px] border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                   <p className="text-white/40">Selecciona o crea una categoría para administrar sus productos.</p>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Dynamic Master Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className={`bg-[#111] border border-white/10 rounded-2xl p-6 w-full ${modalType === 'product' ? 'max-w-2xl' : 'max-w-md'} shadow-2xl relative overflow-hidden`}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white w-8 h-8 rounded-full bg-white/5 flex items-center justify-center z-10">✕</button>
              
              <h2 className="text-xl font-bold mb-6">
                 {modalType === 'menu' && 'Crear Nuevo Menú'}
                 {modalType === 'categoria' && 'Crear Categoría'}
                 {modalType === 'product' && 'Añadir Producto'}
              </h2>
              
              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Common Name Field */}
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">Nombre {modalType === 'product' && 'del Producto'}</label>
                      <input required type="text" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                    </div>

                    {modalType !== 'product' && (
                        <div>
                          <label className="block text-xs font-medium text-white/60 mb-1">Descripción corta</label>
                          <input type="text" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                        </div>
                    )}

                    {modalType === 'product' && (
                       <>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                               <label className="block text-xs font-medium text-white/60 mb-1">Precio Base ($)</label>
                               <input required type="number" step="0.01" value={formData.precio_base || ''} onChange={e => setFormData({...formData, precio_base: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 text-green-400 font-bold" />
                             </div>
                             <div>
                               <label className="block text-xs font-medium text-white/60 mb-1">Tiempo Estimado (ej. 15m)</label>
                               <input type="text" value={formData.tiempo_prep_estimado || ''} onChange={e => setFormData({...formData, tiempo_prep_estimado: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500" />
                             </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-white/60 mb-1">Descripción Atractiva</label>
                            <textarea required value={formData.descripcion_larga || ''} onChange={e => setFormData({...formData, descripcion_larga: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 h-20 resize-none" placeholder="Describe el plato de forma que genere antojo..."/>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-white/60 mb-1">URL de Fotografía (Estrategia Visual)</label>
                            <input type="text" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-green-500 text-cyan-400" placeholder="https://..." />
                          </div>

                          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                            <input type="checkbox" id="dispo" checked={formData.disponible !== false} onChange={e => setFormData({...formData, disponible: e.target.checked})} className="w-4 h-4 accent-green-500" />
                            <label htmlFor="dispo" className="text-sm font-medium">Producto Disponible al Público</label>
                          </div>
                       </>
                    )}

                    <button type="submit" className="w-full py-3 rounded-xl bg-white text-black hover:bg-green-400 font-bold transition-colors mt-6 shadow-xl relative overflow-hidden group">
                      <span className="relative z-10">Guardar Cambios</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                  </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
