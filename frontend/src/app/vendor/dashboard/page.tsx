'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
        <div className="loader border-t-2 border-orange-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white font-sans selection:bg-orange-500/30">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold">
                V
              </div>
              <span className="text-xl font-medium tracking-tight">Food<span className="text-white/50">Vendor</span></span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-light mb-2">Hola, <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{user.nombre}</span></h1>
          <p className="text-white/50 mb-10">Gestiona tu restaurante y activa el &quot;Antojo&quot;.</p>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            {[
              { label: 'Nuevos Pedidos', onClick: () => {} },
              { label: 'Menú', onClick: () => {} },
              { label: 'Sedes Admins', onClick: () => router.push('/vendor/store-admins') },
              { label: 'Estadísticas', onClick: () => {} },
              { label: 'Configuración', onClick: () => {} }
            ].map((action, idx) => (
              <button 
                key={idx}
                onClick={action.onClick}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-orange-500/30 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                  <div className="w-4 h-4 rounded-full bg-orange-500/50" />
                </div>
                <span className="text-sm font-medium text-white/80 group-hover:text-white">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <h2 className="text-xl font-medium">Pedidos Activos (3)</h2>
              <div className="space-y-4">
                {[
                  { id: '#40921', time: '12:05 PM', status: 'Preparando', items: '2x Hamburguesa Antojo, 1x Coca-cola' },
                  { id: '#40920', time: '11:50 AM', status: 'Listo para envío', items: '1x Combo Familiar' },
                  { id: '#40919', time: '11:42 AM', status: 'En camino', items: 'Papas Caseras M' }
                ].map((order, k) => (
                  <div key={k} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-orange-400">{order.id}</span>
                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/60">{order.time}</span>
                      </div>
                      <p className="text-sm text-white/70">{order.items}</p>
                    </div>
                    <button className="px-5 py-2 rounded-lg bg-orange-500 text-black font-semibold text-sm hover:bg-orange-400 transition-colors w-full sm:w-auto">
                      {order.status === 'Preparando' ? 'Marcar Listo' : 'Ver Detalles'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-medium">Tu Vitrina &quot;Antojo&quot;</h2>
              <div className="p-1 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent">
                <div className="bg-[#0E0E0E] p-5 rounded-2xl h-full border border-white/5">
                  <div className="aspect-square rounded-xl bg-neutral-900 mb-4 overflow-hidden relative group">
                    <img src="https://picsum.photos/seed/burger/400/400" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Plato destacado" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-lg font-bold">Hamburguesa Antojo</span>
                    </div>
                  </div>
                  <button className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium">
                    Cambiar Foto Principal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
