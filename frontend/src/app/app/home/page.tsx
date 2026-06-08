'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
        <div className="loader border-t-2 border-fuchsia-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white font-sans selection:bg-fuchsia-500/30">
      <nav className="fixed bottom-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 sm:hidden">
         <div className="flex justify-around items-center h-16 px-4">
            <button className="text-fuchsia-500 flex flex-col items-center gap-1"><span className="text-xl">🏠</span><span className="text-[10px]">Inicio</span></button>
            <button className="text-white/40 flex flex-col items-center gap-1"><span className="text-xl">🔍</span><span className="text-[10px]">Buscar</span></button>
            <button className="text-white/40 flex flex-col items-center gap-1 relative">
                <span className="absolute -top-1 -right-2 bg-fuchsia-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">2</span>
                <span className="text-xl">🛒</span><span className="text-[10px]">Carrito</span>
            </button>
            <button onClick={logout} className="text-white/40 flex flex-col items-center gap-1"><span className="text-xl">👤</span><span className="text-[10px]">Salir</span></button>
         </div>
      </nav>

      {/* Desktop Nav */}
      <nav className="hidden sm:block border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500">TrendyMarket</span>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
          <header className="mb-8">
            <p className="text-white/50 text-sm mb-1">Entregar en</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium">Casa - Cra 10 # 5-20</h1>
              <span className="text-fuchsia-400 text-xs">▼</span>
            </div>
          </header>

          {/* Opciones de antojo */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x">
             {[
               { icon: '🍔', label: 'Hamburguesas', bg: 'from-orange-500/20 to-orange-500/5', color: 'text-orange-400' },
               { icon: '🍕', label: 'Pizzas', bg: 'from-red-500/20 to-red-500/5', color: 'text-red-400' },
               { icon: '🌮', label: 'Tacos', bg: 'from-yellow-500/20 to-yellow-500/5', color: 'text-yellow-400' },
               { icon: '🥗', label: 'Saludable', bg: 'from-green-500/20 to-green-500/5', color: 'text-green-400' },
             ].map((cat, i) => (
                <div key={i} className={`flex-shrink-0 w-24 p-4 rounded-3xl bg-gradient-to-b ${cat.bg} border border-white/5 flex flex-col items-center justify-center gap-2 snap-center cursor-pointer hover:scale-105 transition-transform`}>
                  <span className="text-3xl drop-shadow-lg">{cat.icon}</span>
                  <span className={`text-xs font-medium ${cat.color}`}>{cat.label}</span>
                </div>
             ))}
          </div>

          <h2 className="text-2xl font-light mt-8 mb-6">Para ti, <span className="font-medium">{user.nombre}</span></h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="rounded-[2rem] bg-neutral-900 border border-white/10 overflow-hidden relative group cursor-pointer hover:scale-[1.02] transition-transform duration-300">
              <div className="aspect-[4/3] w-full">
                 <img src="https://picsum.photos/seed/restaurant1/800/600" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Restaurant placeholder" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6">
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">30-45 min</div>
                <h3 className="text-2xl font-bold mb-1">Taco Loco</h3>
                <p className="text-white/60 text-sm mb-3">Mexicana • Tacos • Envío $3.500</p>
                <div className="flex gap-2">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-sm text-fuchsia-400 font-medium border border-fuchsia-500/30">⭐⭐⭐⭐ 4.8</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-neutral-900 border border-white/10 overflow-hidden relative group cursor-pointer hover:scale-[1.02] transition-transform duration-300">
              <div className="aspect-[4/3] w-full">
                 <img src="https://picsum.photos/seed/restaurant2/800/600" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Restaurant placeholder" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6">
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-green-400 border border-green-400/20">Envío Gratis</div>
                <h3 className="text-2xl font-bold mb-1">Entre Cazuelas Market</h3>
                <p className="text-white/60 text-sm mb-3">Comida Rápida • Salchipapas</p>
                <div className="flex gap-2">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-sm text-fuchsia-400 font-medium border border-fuchsia-500/30">⭐⭐⭐⭐ 4.5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
