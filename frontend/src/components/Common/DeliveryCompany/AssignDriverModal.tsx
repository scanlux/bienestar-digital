import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { StatusBadge } from '@/components/Common/StatusBadge';
import {
  ModalOverlay,
  DriverModalContainer,
} from '@/components/Common/DeliveryCompany/DeliveryCompanyStyles';
import { ActionButtonStyle } from '@/components/Common/Dashboard/CommerceDashboardStyles';

interface DriverStat {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  repartidor_activo: number; // 1 = activo/en línea, 0 = inactivo
  deliveries_completed: number;
  in_progress: number;
  earnings_cop: number;
  cancellations: number;
}

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onAssign: (driverUserId: number) => Promise<void>;
  token: string | null;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onAssign,
  token
}) => {
  const toast = useToast();
  const [drivers, setDrivers] = useState<DriverStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const fetchDrivers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/delivery-company/drivers/available?period=${period}`, { headers });
      setDrivers(res.data);
    } catch (err) {
      console.error('Error fetching available drivers:', err);
      toast.error('Error al cargar la lista de repartidores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchDrivers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, period, token]);

  if (!isOpen) return null;

  const filteredDrivers = drivers.filter(d => {
    const fullName = `${d.nombres} ${d.apellidos}`.toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || d.cedula.includes(query) || d.telefono.includes(query);
  });

  const handleAssignClick = async (driverUserId: number) => {
    setAssigningId(driverUserId);
    try {
      await onAssign(driverUserId);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <DriverModalContainer onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Asignar Repartidor - Pedido #{orderId}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="filters-row">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="period-wrapper">
            <button
              className={period === 'day' ? 'active' : ''}
              onClick={() => setPeriod('day')}
            >
              Hoy
            </button>
            <button
              className={period === 'week' ? 'active' : ''}
              onClick={() => setPeriod('week')}
            >
              Esta Semana
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Repartidor</th>
                <th>Estado</th>
                <th>Entregas</th>
                <th>En Ruta</th>
                <th>Cancelaciones</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando repartidores...
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    No se encontraron repartidores afiliados disponibles.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{d.nombres} {d.apellidos}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        CC: {d.cedula} | Tel: {d.telefono}
                      </div>
                    </td>
                    <td>
                      <span className={`status-cell ${d.repartidor_activo ? 'active' : ''}`}>
                        <span className="dot" style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: d.repartidor_activo ? 'var(--emerald)' : '#ff5f5f',
                          boxShadow: d.repartidor_activo ? '0 0 8px var(--emerald)' : '0 0 8px #ff5f5f'
                        }} />
                        {d.repartidor_activo ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{d.deliveries_completed}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: d.in_progress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}>
                        {d.in_progress}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: d.cancellations > 0 ? '#ff5f5f' : 'rgba(255,255,255,0.4)' }}>
                        {d.cancellations}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ActionButtonStyle
                        $variant="approve"
                        disabled={assigningId !== null}
                        onClick={() => handleAssignClick(d.id)}
                      >
                        {assigningId === d.id ? 'Asignando...' : 'Asignar'}
                      </ActionButtonStyle>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DriverModalContainer>
    </ModalOverlay>
  );
};
