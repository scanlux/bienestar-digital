import React from 'react';
import styled from 'styled-components';
import { Button } from './UpgradeActionPanel';

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div<{ $width?: string }>`
  background: #0d0f12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  width: ${props => props.$width || '500px'};
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  color: #ffffff;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  
  &:hover {
    color: #ffffff;
  }
`;

export const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.005);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;

  th, td {
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    background: rgba(255, 255, 255, 0.02);
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.01);
  }
`;

export const FormInput = styled.input`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #ffffff;
  outline: none;
  width: 100%;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
`;

interface UpgradeDetailProps {
  viewingCommercesForItem: any;
  viewingSearch: string;
  setViewingSearch: (value: string) => void;
  selectedItemActiveContracts: any[];
  onClose: () => void;
}

export const UpgradeDetail: React.FC<UpgradeDetailProps> = ({
  viewingCommercesForItem,
  viewingSearch,
  setViewingSearch,
  selectedItemActiveContracts,
  onClose
}) => {
  if (!viewingCommercesForItem) return null;

  const getDaysRemaining = (expiryDateStr: string) => {
    const diff = new Date(expiryDateStr).getTime() - new Date().getTime();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <ModalOverlay>
      <ModalContent $width="750px">
        <ModalHeader>
          <div>
            <ModalTitle>Comercios Afectados</ModalTitle>
            <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Mejora: {viewingCommercesForItem.label}
            </p>
          </div>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <FormInput 
          type="text"
          placeholder="Buscar comercio por nombre o correo..."
          value={viewingSearch}
          onChange={e => setViewingSearch(e.target.value)}
        />

        <TableContainer style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th>Comercio</th>
                <th>Beneficiario</th>
                <th>Administrador (Email)</th>
                <th>Adquirida</th>
                <th>Expiración</th>
                <th>Días Rest.</th>
                <th>Precio de Adquisición</th>
              </tr>
            </thead>
            <tbody>
              {selectedItemActiveContracts.map((u: any) => {
                const daysRemaining = getDaysRemaining(u.expires_at);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{u.razon_social}</div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>ID: #{u.commerce_id}</span>
                    </td>
                    <td>
                      {u.store_id ? (
                        <div>
                          <div style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>Sede</div>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {u.store_name || `ID: #${u.store_id}`}
                          </span>
                        </div>
                      ) : u.delivery_company_id ? (
                        <div>
                          <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: '12px' }}>Empresa Delivery</div>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {u.delivery_company_name || `ID: #${u.delivery_company_id}`}
                          </span>
                        </div>
                      ) : u.user_id ? (
                        <div>
                          <div style={{ color: '#fb7185', fontWeight: 600, fontSize: '12px' }}>Usuario</div>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {u.target_user_email || `ID: #${u.user_id}`}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Global (Comercio)</span>
                      )}
                    </td>
                    <td>
                      <div>{u.email}</div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Rol: {u.rol}</span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{new Date(u.expires_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600, color: daysRemaining < 5 ? '#ef4444' : '#48d64c' }}>
                      {daysRemaining} días
                    </td>
                    <td>{parseFloat(u.price_domis) === 0 ? 'Cortesia (Manual)' : `${parseFloat(u.price_domis).toFixed(2)} DOMI`}</td>
                  </tr>
                );
              })}
              {selectedItemActiveContracts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
                    Ningún comercio tiene activa esta mejora actualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableContainer>

        <Button style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          Cerrar Listado
        </Button>
      </ModalContent>
    </ModalOverlay>
  );
};

export default UpgradeDetail;
