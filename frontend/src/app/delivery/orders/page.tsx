'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
        <div className="loader border-t-2 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white font-sans selection:bg-blue-500/30">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-600 flex items-center justify-center font-bold">
                D
              </div>
              <span className="text-xl font-medium tracking-tight">Express<span className="text-white/50">Delivery</span></span>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-light">Hola, <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">{user.nombre}</span></h1>
              <p className="text-white/50 text-sm">Estás en línea y recibiendo pedidos.</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          </div>

          <div className="flex gap-4 mb-8">
            <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-white/50 text-xs mb-1">Ganancias (Hoy)</p>
              <p className="text-2xl font-bold text-blue-400">$45,000</p>
            </div>
            <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-white/50 text-xs mb-1">Entregas</p>
              <p className="text-2xl font-bold">8</p>
            </div>
          </div>

          <h2 className="text-lg font-medium mb-4">Pedido Asignado</h2>
          
          <div className="p-1 rounded-3xl bg-gradient-to-b from-blue-500/30 to-blue-500/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="bg-[#121212] rounded-[22px] p-6 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full mb-2 inline-block">RECOGER</span>
                  <h3 className="text-xl font-bold">Entre Cazuelas Market</h3>
                  <p className="text-white/50 text-sm">Cll 45 # 12-30</p>
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                  📍
                </div>
              </div>
              
              <div className="border-l-2 border-dashed border-white/10 ml-6 h-6 my-2 relative">
                <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full"></div>
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="text-white/40 text-xs font-bold mb-1 inline-block">ENTREGAR A</span>
                  <h3 className="text-lg font-medium">María López</h3>
                  <p className="text-white/50 text-sm">Cra 10 # 5-20, Apto 401</p>
                </div>
              </div>

              <button className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                Llegué al restaurante
              </button>
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
