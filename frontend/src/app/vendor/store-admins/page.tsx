'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/constants';


interface Store {
  id: number;
  nombre_sucursal: string;
  direccion: string;
}

interface StoreAdmin {
  id: number;
  email: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  celular: string | null;
  estado: 'activo' | 'inactivo';
  storeIds: number[];
}

export default function StoreAdminsPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [admins, setAdmins] = useState<StoreAdmin[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<StoreAdmin | null>(null);
  
  // Form fields
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.rol !== 'vendor' && user.rol !== 'admin') {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [adminsRes, storesRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/store-admins`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/manage/my-stores`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAdmins(adminsRes.data);
      setStores(storesRes.data);
    } catch (e) {
      console.error('Error fetching management data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAdmin(null);
    setNombres('');
    setApellidos('');
    setEmail('');
    setPassword('');
    setCelular('');
    setSelectedStores([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin: StoreAdmin) => {
    setEditingAdmin(admin);
    setNombres(admin.nombres);
    setApellidos(admin.apellidos || '');
    setEmail(admin.email);
    setPassword(''); // Opcional, solo si cambia contraseña
    setCelular(admin.celular || '');
    setSelectedStores(admin.storeIds || []);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleStore = (storeId: number) => {
    setSelectedStores(prev => 
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres || !email || (!editingAdmin && !password)) {
      setFormError('Por favor completa todos los campos requeridos.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      if (editingAdmin) {
        // Actualizar
        await axios.put(`${API_URL}/api/manage/store-admins/${editingAdmin.id}`, {
          nombres,
          apellidos,
          celular,
          storeIds: selectedStores,
          password: password || undefined
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Crear nuevo
        await axios.post(`${API_URL}/api/manage/store-admins`, {
          email,
          password,
          nombres,
          apellidos,
          celular,
          storeIds: selectedStores
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: StoreAdmin) => {
    const newStatus = admin.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await axios.put(`${API_URL}/api/manage/store-admins/${admin.id}/status`, {
        estado: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Error updating admin status:', err);
    }
  };

  if (loading) {
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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/vendor/dashboard')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold">
                V
              </div>
              <span className="text-xl font-medium tracking-tight">Food<span className="text-white/50">Vendor</span></span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/vendor/dashboard')}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
              >
                Dashboard
              </button>
              <button 
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-colors text-sm font-medium"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-light mb-2">Administradores de <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Sedes</span></h1>
            <p className="text-white/50">Crea y gestiona los administradores autorizados para tus sucursales.</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-black font-semibold hover:from-orange-400 hover:to-amber-500 transition-all duration-300 shadow-lg shadow-orange-500/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            Nuevo Administrador
          </button>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
          {admins.length === 0 ? (
            <div className="p-12 text-center text-white/40">
              <p className="mb-4">No has registrado ningún administrador de sede aún.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors"
              >
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.01] text-xs font-semibold text-white/50 uppercase tracking-wider">
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Celular</th>
                    <th className="px-6 py-4">Sedes Asignadas</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-white/80">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-white/[0.01] transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-white">{admin.nombre}</td>
                      <td className="px-6 py-4 text-white/60">{admin.email}</td>
                      <td className="px-6 py-4 text-white/60">{admin.celular || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {admin.storeIds && admin.storeIds.length > 0 ? (
                            admin.storeIds.map(sid => {
                              const store = stores.find(s => s.id === sid);
                              return (
                                <span key={sid} className="text-xs px-2 py-1 rounded bg-white/5 border border-white/5 text-white/70">
                                  {store ? store.nombre_sucursal : `#${sid}`}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-white/30 italic">Sin sedes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.estado === 'activo' ? 'bg-green-400' : 'bg-red-400'}`} />
                          {admin.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors duration-200 ${
                              admin.estado === 'activo' 
                                ? 'bg-red-500/5 text-red-400 border-red-500/10 hover:bg-red-500/10' 
                                : 'bg-green-500/5 text-green-400 border-green-500/10 hover:bg-green-500/10'
                            }`}
                          >
                            {admin.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(admin)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-colors duration-200"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
          {/* Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          {/* Dialog Content */}
          <div
            className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl p-6 overflow-hidden shadow-2xl z-10 transition-all transform duration-300"
          >
            <h2 className="text-xl font-medium mb-6">
              {editingAdmin ? 'Editar Administrador' : 'Nuevo Administrador de Sede'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={nombres}
                    onChange={e => setNombres(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={e => setApellidos(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                    placeholder="Perez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  disabled={!!editingAdmin}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  placeholder="juan.perez@dominio.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Contraseña {editingAdmin ? '(Dejar en blanco para mantener actual)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Número Celular</label>
                <input
                  type="text"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                  placeholder="3001234567"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">Asignar Sedes (Sucursales)</label>
                {stores.length === 0 ? (
                  <p className="text-xs text-white/30 italic">No tienes sedes registradas para asociar.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-white/5 rounded-xl p-3 bg-white/[0.01] space-y-2">
                    {stores.map(store => (
                      <label key={store.id} className="flex items-center gap-3 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store.id)}
                          onChange={() => handleToggleStore(store.id)}
                          className="rounded border-white/10 text-orange-500 focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer"
                        />
                        <span>{store.nombre_sucursal}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs font-semibold text-red-400">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 text-sm font-medium transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {submitting ? 'Guardando...' : editingAdmin ? 'Guardar Cambios' : 'Crear Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
