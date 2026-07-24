'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import { useAlert } from '@/context/AlertContext';
import { useToast } from '@/context/ToastContext';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  Form,
  InputGroup,
  Label,
  Input,
  SubmitButton
} from '@/components/Common/ModalStyles';

interface Driver {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  repartidor_activo: number;
  deliveries_completed: number;
  in_progress: number;
  earnings_cop: number;
  cancellations: number;
}

export default function DeliveryDriversPage() {
  const { showConfirm } = useAlert();
  const toast = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cedulaInput, setCedulaInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week'>('day');

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/delivery-company/drivers/available?period=${period}`, { headers });
      setDrivers(response.data);
    } catch (error: any) {
      console.error('API error fetching drivers:', error.message);
      toast.error('Error al cargar la lista de repartidores.');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput.trim()) return;

    setActionLoading(true);

    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/api/delivery-company/drivers`,
        { cedula: cedulaInput },
        { headers }
      );
      
      toast.success(response.data.message || 'Repartidor afiliado exitosamente.');
      setCedulaInput('');
      setIsModalOpen(false);
      fetchDrivers();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Error al afiliar el repartidor';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeaffiliate = (driverId: number) => {
    showConfirm({
      title: 'Confirmar Desafiliación',
      message: '¿Estás seguro de que deseas desafiliar a este repartidor?',
      confirmText: 'Desafiliar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const headers = getAuthHeaders();
          await axios.delete(`${API_URL}/api/delivery-company/drivers/${driverId}`, { headers });
          toast.success('Repartidor desafiliado exitosamente');
          fetchDrivers();
        } catch (error: any) {
          const errMsg = error.response?.data?.error || 'Error al desafiliar el repartidor';
          toast.error(errMsg);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  return (
    <>
      <Container>
        {/* Listado de Repartidores */}
        <Card>
          <CardHeader>
            <TitleArea>
              <h3>Conductores Afiliados ({drivers.length})</h3>
              <PeriodWrapper>
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
              </PeriodWrapper>
            </TitleArea>
            <HeaderActions>
              <AffiliateBtn onClick={() => setIsModalOpen(true)}>
                Afiliar por Cédula
              </AffiliateBtn>
            </HeaderActions>
          </CardHeader>

          {loading ? (
            <LoadingBox>Cargando lista de repartidores...</LoadingBox>
          ) : drivers.length === 0 ? (
            <EmptyState>No hay repartidores afiliados en este momento.</EmptyState>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>Nombre Completo</th>
                    <th>Estado de Turno</th>
                    <th>Entregas</th>
                    <th>En Ruta</th>
                    <th>Cancelaciones</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((drv) => (
                    <tr key={drv.id}>
                      <td>
                        <span className="font-bold">{drv.nombres} {drv.apellidos}</span>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          CC: {drv.cedula} | Tel: {drv.telefono}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <StatusDot $active={drv.repartidor_activo === 1} />
                          {drv.repartidor_activo === 1 ? 'En línea' : 'Desconectado'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{drv.deliveries_completed}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: drv.in_progress > 0 ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}>
                          {drv.in_progress}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: drv.cancellations > 0 ? '#ff5f5f' : 'rgba(255,255,255,0.4)' }}>
                          {drv.cancellations}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <DeleteBtn 
                          onClick={() => handleDeaffiliate(drv.id)}
                          disabled={actionLoading}
                        >
                          Desafiliar
                        </DeleteBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </Card>
      </Container>

      {/* Ventana Modal de Afiliación Modularizada */}
      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} $maxWidth="450px">
            <ModalHeader style={{ marginBottom: '1.5rem' }}>
              <div>
                <ModalTitle>Afiliar por Cédula</ModalTitle>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                  Ingresa la cédula del conductor registrado en DOMIRIS para vincularlo a tu empresa de mensajería.
                </p>
              </div>
              <CloseButton onClick={() => setIsModalOpen(false)} style={{ fontSize: '1.2rem', margin: 0 }}>✕</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleAffiliate}>
              <InputGroup>
                <Label htmlFor="cedula">Cédula del Repartidor</Label>
                <Input
                  type="text"
                  id="cedula"
                  placeholder="Ej. 80000001"
                  value={cedulaInput}
                  onChange={(e) => setCedulaInput(e.target.value)}
                  required
                />
              </InputGroup>

              <SubmitButton type="submit" disabled={actionLoading}>
                {actionLoading ? 'Procesando...' : 'Afiliar Conductor'}
              </SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}

// ------------- ANIMACIONES NATIVAS CSS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ------------- STYLED COMPONENTS -------------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeIn} 0.5s ease-out forwards;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 2rem;
  backdrop-filter: blur(10px);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }
`;

const TitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const PeriodWrapper = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 3px;

  button {
    background: none;
    border: none;
    padding: 6px 12px;
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    border-radius: 9px;
    transition: all 0.2s;

    &:hover {
      color: #fff;
    }

    &.active {
      background: #3b82f6;
      color: #fff;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
  }
`;

const AffiliateBtn = styled.button`
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 0.5rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  text-align: left;

  th {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
  }

  td {
    padding: 1.25rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.7);

    &.font-bold {
      color: #fff;
      font-weight: 600;
    }
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.01);
  }
`;

const StatusDot = styled.span<{ $active: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$active ? 'var(--emerald)' : 'rgba(255,255,255,0.2)'};
  margin-right: 8px;
  box-shadow: ${props => props.$active ? '0 0 8px var(--emerald)' : 'none'};
`;

const DeleteBtn = styled.button`
  background: rgba(255, 95, 95, 0.08);
  color: #ff5f5f;
  border: 1px solid rgba(255, 95, 95, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 95, 95, 0.15);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingBox = styled.div`
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.9rem;
`;
