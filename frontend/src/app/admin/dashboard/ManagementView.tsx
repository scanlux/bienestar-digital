'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'https://trendy.sytes.net';

export default function ManagementView() {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'brands' | 'stores' | 'content'>('brands');

  // Fetch Brands
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

  const fetchStores = async (brandId: number) => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/stores/${brandId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStores(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenusAndProducts = async (storeId: number) => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const [menusRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/menus/${storeId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/manage/products?brandId=${selectedBrand?.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setMenus(menusRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectBrand = (brand: any) => {
    setSelectedBrand(brand);
    fetchStores(brand.id);
    setView('stores');
  };

  const selectStore = (store: any) => {
    setSelectedStore(store);
    fetchMenusAndProducts(store.id);
    setView('content');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
        <button onClick={() => setView('brands')} className="hover:text-white transition-colors">Negocios</button>
        {selectedBrand && (
          <>
            <span>/</span>
            <button onClick={() => setView('stores')} className="hover:text-white transition-colors">{selectedBrand.nombre}</button>
          </>
        )}
        {selectedStore && (
          <>
            <span>/</span>
            <span className="text-white/80">{selectedStore.nombre_sucursal}</span>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'brands' && (
          <motion.div 
            key="brands"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {brands.map((brand) => (
              <div 
                key={brand.id} 
                onClick={() => selectBrand(brand)}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden">
                    <img src={brand.logo_url || 'https://via.placeholder.com/150'} alt={brand.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{brand.nombre}</h3>
                    <p className="text-white/40 text-xs">{brand.type}</p>
                  </div>
                </div>
                <p className="text-sm text-white/60 line-clamp-2 mb-4">{brand.descripcion}</p>
                <div className="flex justify-between items-center text-xs text-white/40">
                  <span>Sedes: ...</span>
                  <span className="text-green-400 group-hover:translate-x-1 transition-transform">Gestionar →</span>
                </div>
              </div>
            ))}
            <button className="p-6 rounded-2xl border-2 border-dashed border-white/5 hover:border-white/10 hover:bg-white/5 transition-all flex flex-col items-center justify-center text-white/40 gap-2">
              <span className="text-2xl">+</span>
              <span className="text-sm">Nuevo Negocio</span>
            </button>
          </motion.div>
        )}

        {view === 'stores' && selectedBrand && (
          <motion.div 
            key="stores"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {stores.map((store) => (
              <div 
                key={store.id}
                onClick={() => selectStore(store)}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-500/50 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl">{store.nombre_sucursal}</h3>
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${store.estado === 'abierto' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {store.estado}
                  </span>
                </div>
                <p className="text-sm text-white/60 mb-2">📍 {store.direccion}</p>
                <p className="text-xs text-white/40 italic">â° {store.horario_atencion}</p>
              </div>
            ))}
            <button className="p-6 rounded-2xl border-2 border-dashed border-white/5 hover:border-white/10 hover:bg-white/5 transition-all flex flex-col items-center justify-center text-white/40 gap-2">
              <span className="text-2xl">+</span>
              <span className="text-sm">Nueva Sede</span>
            </button>
          </motion.div>
        )}

        {view === 'content' && selectedStore && (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">MenÃºs y Productos</h2>
              <button className="px-4 py-2 rounded-lg bg-green-500 text-black font-bold text-sm">AÃ±adir CategorÃ­a</button>
            </div>

            {menus.map((menu) => (
              <div key={menu.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-green-400">{menu.nombre}</h3>
                    <p className="text-sm text-white/40">{menu.descripcion}</p>
                  </div>
                  <button className="text-xs text-white/40 hover:text-white transition-colors underline">Editar CategorÃ­a</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.filter(p => p.menu_id === menu.id).map(prod => (
                    <div key={prod.id} className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04]">
                      <div className="w-20 h-20 rounded-lg bg-white/5 flex-shrink-0">
                         {/* Product Image placeholder logic */}
                         <div className="w-full h-full bg-neutral-800 rounded-lg animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm">{prod.nombre}</h4>
                          <span className="text-green-400 font-bold text-sm">${prod.precio_base}</span>
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2 mt-1">{prod.descripcion_corta}</p>
                        <div className="flex gap-2 mt-3">
                           <button className="text-[10px] text-white/40 hover:text-green-400 transition-colors">Editar</button>
                           <button className="text-[10px] text-white/40 hover:text-red-400 transition-colors">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="border border-dashed border-white/10 rounded-xl p-4 flex items-center justify-center text-white/20 text-xs hover:border-white/20 hover:text-white/40 transition-all">
                    + AÃ±adir Producto
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
