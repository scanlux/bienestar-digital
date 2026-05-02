'use client';

import React from 'react';
import styled from 'styled-components';

interface StoreInfoCardProps {
  storeData: any;
  formatTime: (time: string | null) => string;
}

export const StoreInfoCard: React.FC<StoreInfoCardProps> = ({ storeData, formatTime }) => {
  if (!storeData) return null;

  // Filtrar solo la cuenta principal
  const principalAccount = storeData.accounts?.find((acc: any) => acc.es_principal);

  return (
    <InfoContainer>
      <div className="info-item">
        <span className="info-label">• Teléfono</span>
        <span className="info-value">{storeData.telefono || 'No registrado'}</span>
      </div>
      <div className="info-item">
        <span className="info-label">• Dirección</span>
        <span className="info-value">{storeData.direccion || 'No registrada'}</span>
      </div>
      <div className="info-item">
        <span className="info-label">• Estado</span>
        <span className="info-value" style={{ textTransform: 'capitalize' }}>
           {storeData.estado?.replace('_', ' ') || 'No disponible'}
        </span>
      </div>
      <div className="info-item">
        <span className="info-label">• Horario</span>
        <span className="info-value">
          {(() => {
            const today = new Date().getDay();
            const todaySched = storeData.schedule?.find((s: any) => s.day_index === today);
            if (!todaySched) return 'No registrado';
            if (todaySched.status === 'cerrado') return <span style={{ color: '#ef4444' }}>Cerrado hoy</span>;
            if (todaySched.status === 'vacaciones') return <span style={{ color: '#f59e0b' }}>Hoy: Vacaciones</span>;
            if (todaySched.is_24h) return <span style={{ color: '#10b981' }}>Abierto 24 Horas</span>;
            return `${formatTime(todaySched.open_time)} - ${formatTime(todaySched.close_time)}`;
          })()}
        </span>
      </div>

      {principalAccount ? (
        <div style={{ marginTop: '10px' }}>
          <span className="section-tag">Cuenta Principal</span>
          <div className="account-box">
            <span className="acc-bank">{principalAccount.banco_nombre || principalAccount.banco || 'Plataforma'}</span>
            <span className="acc-num">{principalAccount.numero_cuenta}</span>
          </div>
        </div>
      ) : (
        <div className="info-item">
          <span className="info-label">• Cuenta Bancaria</span>
          <span className="info-value">Sin configurar</span>
        </div>
      )}
    </InfoContainer>
  );
};

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid rgba(72, 214, 76, 0.2);
  min-width: 320px;
  backdrop-filter: blur(8px);

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    font-size: 0.85rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    padding-bottom: 6px;
    &:last-child { border-bottom: none; padding-bottom: 0; }
  }

  .info-label { color: rgba(255, 255, 255, 0.6); font-weight: 500; }
  .info-value { color: #fff; font-weight: 700; text-align: right; }

  .section-tag {
    font-size: 0.6rem;
    font-weight: 900;
    color: var(--emerald);
    text-transform: uppercase;
    margin-bottom: 6px;
    display: block;
    letter-spacing: 1px;
  }

  .account-box {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #333333;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    
    .acc-bank { color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; font-weight: 600; }
    .acc-num { color: #fff; font-size: 0.8rem; font-weight: 700; }
  }
`;
