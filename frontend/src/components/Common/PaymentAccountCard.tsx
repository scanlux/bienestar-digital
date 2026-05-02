'use client';

import React from 'react';
import styled from 'styled-components';
import { FormGrid, InputGroup, Label, Input, Select, CheckboxGroup } from './ModalStyles';

interface PaymentAccountCardProps {
  account: any;
  index: number;
  paymentPlatforms: any[];
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onSetPrincipal: (index: number) => void;
}

export const PaymentAccountCard = ({ 
  account, 
  index, 
  paymentPlatforms, 
  onUpdate, 
  onRemove, 
  onSetPrincipal 
}: PaymentAccountCardProps) => {
  return (
    <CardContainer>
      <div className="acc-header">
        <span className="acc-title">
          {index === 0 ? '⭐ Cuenta Principal' : `Cuenta #${index}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <CheckboxGroup style={{ padding: 0, margin: 0 }}>
            <input 
              type="checkbox" 
              id={`principal-${index}`} 
              checked={!!account.es_principal}
              onChange={(e) => {
                if (e.target.checked) onSetPrincipal(index);
              }} 
            />
            <label htmlFor={`principal-${index}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {account.es_principal ? 'Principal' : 'Hacer Principal'}
            </label>
          </CheckboxGroup>
          <button type="button" className="remove-btn" onClick={() => onRemove(index)}>✕</button>
        </div>
      </div>
      
      <FormGrid>
        <InputGroup>
          <Label>Banco / Plataforma</Label>
          <Select 
            required 
            value={account.platform_id || ''} 
            onChange={e => {
              const platformId = Number(e.target.value);
              onUpdate(index, 'platform_id', platformId);
              
              // Auto-lock logic for monedero
              const selectedPlatform = paymentPlatforms.find(p => p.id === platformId);
              if (selectedPlatform && (selectedPlatform.tipo_entidad === 'monedero' || selectedPlatform.tipo_entidad === 'transferencia_rapida')) {
                onUpdate(index, 'tipo_cuenta', 'Monedero Digital');
              }
            }}
          >
            <option value="" disabled>Seleccione una opción...</option>
            {paymentPlatforms.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </InputGroup>
        <InputGroup>
          <Label>Tipo de Cuenta</Label>
          <Select 
            value={account.tipo_cuenta || 'Ahorros'} 
            onChange={e => onUpdate(index, 'tipo_cuenta', e.target.value)} 
            disabled={
              (() => {
                const selected = paymentPlatforms.find(p => p.id === account.platform_id);
                return selected && (selected.tipo_entidad === 'monedero' || selected.tipo_entidad === 'transferencia_rapida');
              })()
            }
          >
            <option value="Ahorros">Ahorros</option>
            <option value="Corriente">Corriente</option>
            <option value="Monedero Digital">Monedero Digital</option>
          </Select>
        </InputGroup>
      </FormGrid>
      
      <FormGrid>
        <InputGroup>
          <Label>Número de Cuenta</Label>
          <Input 
            value={account.numero_cuenta || ''} 
            onChange={e => onUpdate(index, 'numero_cuenta', e.target.value)} 
            placeholder="Sólo números" 
          />
        </InputGroup>
        <InputGroup>
          <Label>Llave (Celular, Token, etc)</Label>
          <Input 
            value={account.llave || ''} 
            onChange={e => onUpdate(index, 'llave', e.target.value)} 
            placeholder="Si es Nequi o Daviplata" 
          />
        </InputGroup>
      </FormGrid>
      
      <FormGrid>
        <InputGroup>
          <Label>Titular (Nombre)</Label>
          <Input 
            value={account.titular_nombre || ''} 
            onChange={e => onUpdate(index, 'titular_nombre', e.target.value)} 
            placeholder="Nombre en cuenta/tarjeta" 
          />
        </InputGroup>
        <InputGroup>
          <Label>Documento Titular (CC/NIT)</Label>
          <Input 
            type="text"
            inputMode="numeric"
            value={account.titular_documento || ''} 
            onChange={e => {
              const rawValue = e.target.value.replace(/[^0-9]/g, '');
              onUpdate(index, 'titular_documento', rawValue);
            }} 
            placeholder="Ej: 1000100200" 
          />
        </InputGroup>
      </FormGrid>
      
      <InputGroup>
        <Label>Detalle / Nota Extra</Label>
        <Input 
          value={account.detalle || ''} 
          onChange={e => onUpdate(index, 'detalle', e.target.value)} 
          placeholder="Opcional. Ej: Transferir sólo de 8 a 8" 
        />
      </InputGroup>
    </CardContainer>
  );
};

const CardContainer = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  /* Mejorando la claridad de los campos internos */
  & ${Input}, & ${Select} {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #333333; /* Borde gris oscuro solicitado */
    color: #ffffff;
    
    &:focus {
      border-color: var(--emerald);
      background: rgba(0, 0, 0, 0.4);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.2);
    }
  }

  .acc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
    margin-bottom: 4px;

    .acc-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--emerald);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .remove-btn {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #ef4444;
        color: white;
      }
    }
  }

  ${FormGrid} {
    margin-bottom: 0;
  }
`;
