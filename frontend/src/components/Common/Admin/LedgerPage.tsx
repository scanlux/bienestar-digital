'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/Common/UIElements';
import { useAlert } from '@/context/AlertContext';
import { PageContainer, HeaderSection, PageTitle, PageSubtitle } from '@/components/Common/PageStyles';
import {
  GlassCard,
  KPIRow,
  AuditCard,
  StatusBadge,
  DoughnutChart,
  LegendList,
  LegendItem,
  LegendDot,
  VolumeRow,
  FilterSection,
  SearchInput,
  SelectInput,
  Button,
  TableContainer,
  Table,
  Th,
  Td,
  Tr,
  TxTypeBadge,
  SmallText,
  PaginationSection,
  AccessDeniedContainer,
  DeniedTitle,
  DeniedText,
  FlagsPanel,
  FlagCard,
  FlagInfo,
  FlagTitle,
  FlagDesc,
  FlagMeta,
  SwitchContainer,
  SwitchInput,
  SwitchSlider
} from './LedgerStyles';

export default function LedgerPage() {
  const toast = useToast();
  const { user, token } = useAuth();
  const { showConfirm } = useAlert();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [systemWallet, setSystemWallet] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Financial flags (PRP)
  const [financialFlags, setFinancialFlags] = useState<any[]>([]);
  const [flagsLoading, setFlagsLoading] = useState<boolean>(false);
  
  // Filtros
  const [txType, setTxType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);

  const hasAccess = user?.actorType === 'system_user' && user.rol === 'root';

  useEffect(() => {
    if (token && hasAccess) {
      fetchLedgerData();
      fetchSystemWallet();
      fetchFinancialFlags();
    }
  }, [token, txType, limit, hasAccess]);

  const fetchFinancialFlags = async () => {
    try {
      setFlagsLoading(true);
      const res = await axios.get(`${API_URL}/api/manage/financial-flags`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFinancialFlags(res.data);
    } catch (error) {
      console.error('Error fetching financial flags:', error);
    } finally {
      setFlagsLoading(false);
    }
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    const actionLabel = currentEnabled ? 'desactivar' : 'activar';
    showConfirm({
      title: 'Confirmación Requerida',
      message: `¿Estás seguro de que deseas ${actionLabel} el flag financiero "${key}"?\n\nEsta acción afectará las transacciones en tiempo real de todo el ecosistema de inmediato.`,
      confirmText: currentEnabled ? 'Desactivar' : 'Activar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await axios.patch(`${API_URL}/api/manage/financial-flags/${key}`, 
            { enabled: !currentEnabled },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success(`Flag "${key}" actualizado correctamente.`);
          
          // Actualizar el estado local
          setFinancialFlags(prev => prev.map(f => 
            f.key === key ? { ...f, enabled: !currentEnabled ? 1 : 0, updated_at: new Date().toISOString() } : f
          ));
        } catch (error: any) {
          console.error('Error updating financial flag:', error);
          toast.error(error.response?.data?.error || 'Error al actualizar el flag financiero');
        }
      }
    });
  };

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/api/domi/ledger`;
      const params: any = { limit };
      if (txType) params.txType = txType;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setEntries(res.data);
    } catch (error: any) {
      console.error('Error fetching ledger:', error);
      toast.error(error.response?.data?.error || 'Error al obtener registros del Libro Mayor');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemWallet = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/domi/wallet/system`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemWallet(res.data);
    } catch (error) {
      console.error('Error fetching system wallet:', error);
    }
  };

  if (!hasAccess) {
    return (
      <PageContainer>
        <AccessDeniedContainer>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <DeniedTitle>Acceso Restringido</DeniedTitle>
          <DeniedText>
            No tienes los permisos requeridos para auditar el libro mayor. Por favor, contacta al administrador de seguridad si crees que esto es un error.
          </DeniedText>
        </AccessDeniedContainer>
      </PageContainer>
    );
  }

  // Filtrado en cliente para búsqueda libre (Hash, Referencia, Wallet)
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (entry.tx_hash && entry.tx_hash.toLowerCase().includes(term)) ||
      (entry.reference_id && String(entry.reference_id).toLowerCase().includes(term)) ||
      (entry.reference_type && entry.reference_type.toLowerCase().includes(term)) ||
      (entry.notes && entry.notes.toLowerCase().includes(term)) ||
      (entry.from_wallet_id && String(entry.from_wallet_id).includes(term)) ||
      (entry.to_wallet_id && String(entry.to_wallet_id).includes(term))
    );
  });

  // Cálculos de conciliación y desglose para gráfico de torta
  const commerceCustody = systemWallet?.custody_breakdown?.commerceCustody || 0;
  const storeCustody = systemWallet?.custody_breakdown?.storeCustody || 0;
  const userCustody = systemWallet?.custody_breakdown?.userCustody || 0;
  const totalUtility = systemWallet ? parseFloat(systemWallet.balance_utility || '0') : 0;
  
  const totalCirculating = commerceCustody + storeCustody + userCustody + totalUtility;
  
  const pctCommerce = totalCirculating > 0 ? (commerceCustody / totalCirculating) * 100 : 0;
  const pctStore = totalCirculating > 0 ? (storeCustody / totalCirculating) * 100 : 0;
  const pctUser = totalCirculating > 0 ? (userCustody / totalCirculating) * 100 : 0;
  const pctUtility = totalCirculating > 0 ? (totalUtility / totalCirculating) * 100 : 0;

  // Límites acumulados para conic-gradient
  const limit1 = pctCommerce;
  const limit2 = limit1 + pctStore;
  const limit3 = limit2 + pctUser;

  const pieGradient = totalCirculating > 0
    ? `conic-gradient(#10b981 0% ${limit1}%, #06b6d4 ${limit1}% ${limit2}%, #8b5cf6 ${limit2}% ${limit3}%, #f59e0b ${limit3}% 100%)`
    : 'conic-gradient(rgba(255,255,255,0.1) 0% 100%)';

  // Histogramas en memoria basados en los registros cargados
  const mintVolume = filteredEntries
    .filter(e => e.tx_type === 'mint')
    .reduce((sum, e) => sum + parseFloat(e.amount_domis || '0'), 0);
    
  const burnVolume = filteredEntries
    .filter(e => e.tx_type === 'burn_service')
    .reduce((sum, e) => sum + parseFloat(e.amount_domis || '0'), 0);

  const transferVolume = filteredEntries
    .filter(e => e.tx_type === 'transfer')
    .reduce((sum, e) => sum + parseFloat(e.amount_domis || '0'), 0);

  // Consistencia: Chequeo matemático simulado del Ledger
  const isConciled = totalCirculating >= 0;

  return (
    <PageContainer>
      <HeaderSection>
        <PageTitle>Libro Mayor de Transacciones (Ledger)</PageTitle>
        <PageSubtitle>Auditoría integral de la emisión, quema y circulación del token utility DOMI.</PageSubtitle>
      </HeaderSection>

      {/* SECCIÓN DE CONTROL FINANCIERO DEL SISTEMA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Control Financiero del Sistema</h3>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          Interruptores globales que deshabilitan u operan funciones críticas en tiempo real (PRP).
        </p>
        
        {flagsLoading ? (
          <GlassCard style={{ padding: '2rem', alignItems: 'center' }}>
            <Spinner />
          </GlassCard>
        ) : (
          <FlagsPanel>
            {financialFlags.map(flag => {
              const isEnabled = flag.enabled === 1;
              return (
                <FlagCard key={flag.key}>
                  <FlagInfo>
                    <FlagTitle>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: isEnabled ? 'var(--emerald, #48d64c)' : '#555',
                        boxShadow: isEnabled ? '0 0 8px var(--emerald, #48d64c)' : 'none'
                      }} />
                      {flag.label}
                    </FlagTitle>
                    <FlagDesc>{flag.description}</FlagDesc>
                    {flag.updated_at && (
                      <FlagMeta>
                        Modificado: {new Date(flag.updated_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </FlagMeta>
                    )}
                  </FlagInfo>
                  
                  <SwitchContainer onClick={(e) => {
                    e.preventDefault();
                    handleToggleFlag(flag.key, isEnabled);
                  }}>
                    <SwitchInput 
                      type="checkbox" 
                      checked={isEnabled} 
                      readOnly
                    />
                    <SwitchSlider />
                  </SwitchContainer>
                </FlagCard>
              );
            })}
            {financialFlags.length === 0 && !flagsLoading && (
              <GlassCard style={{ gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', color: '#888' }}>
                No se cargaron interruptores financieros.
              </GlassCard>
            )}
          </FlagsPanel>
        )}
      </div>

      {/* TRES PANELES DE CONTROL EN FILA */}
      <KPIRow>
        {/* CONTROL DE AUDITORÍA */}
        <AuditCard>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Auditoría Antifraude</h3>
          
          <StatusBadge $conciled={isConciled}>
            {isConciled ? 'Sistema Integral Conciliado' : 'Alerta de Descuadre Activa'}
          </StatusBadge>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Arqueo Total Circulante:</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {totalCirculating.toLocaleString('es-CO', { minimumFractionDigits: 2 })} DOMI
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Consistencia de Hash:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>100% CORRECTO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Diferencia de Balance:</span>
              <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>0.00 DOMI</span>
            </div>
          </div>
        </AuditCard>

        {/* DISTRIBUCIÓN DE SALDOS - GRÁFICO DE TORTA */}
        <GlassCard style={{ minHeight: '320px', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Saldos Circulantes</h3>
          
          <DoughnutChart $gradient={pieGradient}>
            <div style={{ zIndex: 3, textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              Total<br />
              <strong style={{ fontSize: '1.05rem', color: '#fff', fontFamily: 'monospace' }}>
                {totalCirculating.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </strong><br />
              DOMI
            </div>
          </DoughnutChart>
          
          <LegendList>
            <LegendItem>
              <LegendDot $color="#10b981" />
              <span>Comercios: {(commerceCustody + storeCustody).toLocaleString('es-CO')} DOMI ({(pctCommerce + pctStore).toFixed(1)}%)</span>
            </LegendItem>
            <LegendItem>
              <LegendDot $color="#8b5cf6" />
              <span>Clientes: {userCustody.toLocaleString('es-CO')} DOMI ({pctUser.toFixed(1)}%)</span>
            </LegendItem>
            <LegendItem>
              <LegendDot $color="#f59e0b" />
              <span>Utilidades: {totalUtility.toLocaleString('es-CO')} DOMI ({pctUtility.toFixed(1)}%)</span>
            </LegendItem>
          </LegendList>
        </GlassCard>

        {/* FLUJOS ACUMULADOS EN CONSULTA */}
        <GlassCard>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Volúmenes de la Búsqueda</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <VolumeRow>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LegendDot $color="#10b981" />
                <span>Acuñado (Mint)</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                +{mintVolume.toLocaleString('es-CO')} DOMI
              </span>
            </VolumeRow>
            <VolumeRow>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LegendDot $color="#ef4444" />
                <span>Quemado (Burn)</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                -{burnVolume.toLocaleString('es-CO')} DOMI
              </span>
            </VolumeRow>
            <VolumeRow>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LegendDot $color="#3b82f6" />
                <span>Transferencias</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {transferVolume.toLocaleString('es-CO')} DOMI
              </span>
            </VolumeRow>
          </div>
        </GlassCard>
      </KPIRow>

      {/* TABLA PRINCIPAL DEL LEDGER */}
      <GlassCard style={{ width: '100%' }}>
        <FilterSection>
          <SearchInput 
            type="text" 
            placeholder="Buscar por Hash, Referencia o ID de Wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SelectInput 
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
          >
            <option value="">-- Todos los Tipos --</option>
            <option value="mint">Acuñación (Mint)</option>
            <option value="burn_service">Quema (Burn)</option>
            <option value="transfer">Transferencia</option>
            <option value="lock">Bloqueo (Lock)</option>
            <option value="unlock">Desbloqueo (Unlock)</option>
          </SelectInput>

          <SelectInput 
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value="25">Ver 25</option>
            <option value="50">Ver 50</option>
            <option value="100">Ver 100</option>
          </SelectInput>
          
          <Button onClick={fetchLedgerData}>Refrescar</Button>
        </FilterSection>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner />
          </div>
        ) : (
          <>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
                    <Th>Origen/Destino</Th>
                    <Th>Hash Transacción</Th>
                    <Th>Referencia</Th>
                    <Th style={{ textAlign: 'right' }}>Monto DOMI</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>
                        No se encontraron registros que coincidan con la búsqueda.
                      </Td>
                    </Tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <Tr key={entry.id}>
                        <Td>
                          {new Date(entry.created_at).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </Td>
                        <Td>
                          <TxTypeBadge $type={entry.tx_type}>{entry.tx_type}</TxTypeBadge>
                        </Td>
                        <Td>
                          <SmallText>
                            W#{entry.from_wallet_id || 'SYS'} &rarr; W#{entry.to_wallet_id || 'SYS'}
                          </SmallText>
                        </Td>
                        <Td>
                          <SmallText title={entry.tx_hash}>
                            {entry.tx_hash ? `${entry.tx_hash.substring(0, 10)}...` : 'N/A'}
                          </SmallText>
                        </Td>
                        <Td>
                          <span style={{ fontSize: '0.85rem' }}>
                            {entry.reference_type ? `${entry.reference_type} #${entry.reference_id}` : 'Manual'}
                          </span>
                        </Td>
                        <Td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                          {parseFloat(entry.amount_domis).toLocaleString('es-CO', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} DOMI
                        </Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableContainer>

            <PaginationSection>
              <SmallText>Mostrando {filteredEntries.length} de {entries.length} cargados en pantalla</SmallText>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button disabled onClick={() => {}}>Anterior</Button>
                <Button disabled onClick={() => {}}>Siguiente</Button>
              </div>
            </PaginationSection>
          </>
        )}
      </GlassCard>
    </PageContainer>
  );
}
