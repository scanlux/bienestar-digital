import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton
} from '../ModalStyles';
import { FormGroup, Label, Input, SubmitButton } from './BaseWalletLayout';

interface TransferModalProps {
  onClose: () => void;
  balance: number;
  fiatPeg: number;
  onConfirmTransfer: (toAlias: string, amount: number) => Promise<boolean>;
  processing: boolean;
  ownerLabel: string;
  isCustomerView?: boolean;
}

export function TransferModal({
  onClose,
  balance,
  fiatPeg,
  onConfirmTransfer,
  processing,
  ownerLabel,
  isCustomerView = false
}: TransferModalProps) {
  const toast = useToast();
  const { showConfirm } = useAlert();

  const [toAlias, setToAlias] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');

  const balanceCOP = balance * fiatPeg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAlias || !transferAmount) {
      toast.error('Completa los campos de destinatario y monto.');
      return;
    }

    const inputVal = parseFloat(transferAmount);
    if (isNaN(inputVal) || inputVal <= 0) {
      toast.error('Monto a transferir no válido.');
      return;
    }

    if (isCustomerView) {
      if (inputVal > balanceCOP) {
        toast.error('Saldo insuficiente.');
        return;
      }
      const domiAmount = inputVal / fiatPeg;
      showConfirm({
        title: '¿Estás seguro de enviar la transferencia?',
        message: `Estás a punto de enviar $ ${inputVal.toLocaleString('es-CO')} COP (${domiAmount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð) al alias @${toAlias}. Esta transacción no puede ser revertida.`,
        confirmText: 'Enviar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          const success = await onConfirmTransfer(toAlias, domiAmount);
          if (success) {
            onClose();
          }
        }
      });
    } else {
      if (inputVal > balance) {
        toast.error('Saldo insuficiente.');
        return;
      }
      showConfirm({
        title: '¿Estás seguro de enviar la transferencia?',
        message: `Estás a punto de enviar ${inputVal} DOMIs (~ $ ${(inputVal * fiatPeg).toLocaleString()} COP) al alias @${toAlias}. Esta transacción no puede ser revertida.`,
        confirmText: 'Enviar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          const success = await onConfirmTransfer(toAlias, inputVal);
          if (success) {
            onClose();
          }
        }
      });
    }
  };

  const displayTitle = isCustomerView ? 'Enviar Saldo' : `Realizar Transferencia (${ownerLabel})`;
  const displayLabelMonto = isCustomerView ? 'Monto a Transferir (COP)' : 'Monto a Transferir (DOMIs)';
  const displaySymbolMonto = isCustomerView ? '$' : 'Ð';
  
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="500px" style={{ background: '#0a0e0a', border: '1px solid rgba(0, 255, 128, 0.15)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 45px rgba(0, 255, 128, 0.1)' }}>
        <ModalHeader style={{ marginBottom: '1.5rem' }}>
          <ModalTitle style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {displayTitle}
          </ModalTitle>
          <CloseButton type="button" onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.75rem' }}>✕</CloseButton>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              Saldo disponible:{' '}
              <strong style={{ color: '#00ff80' }}>
                {isCustomerView ? (
                  `$ ${balanceCOP.toLocaleString('es-CO')} COP (${balance.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð)`
                ) : (
                  `${balance.toLocaleString('es-CO')} Ð (~ $ ${balanceCOP.toLocaleString('es-CO')} COP)`
                )}
              </strong>
            </div>

            <FormGroup>
              <Label htmlFor="to-alias">Alias del Destinatario (Bre-b)</Label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '1rem', color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'monospace', fontSize: '1.1rem', pointerEvents: 'none' }}>@</span>
                <Input
                  id="to-alias"
                  type="text"
                  placeholder="ej. ha101"
                  value={toAlias}
                  onChange={e => setToAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  required
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="transfer-amount">{displayLabelMonto}</Label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '1rem', color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'monospace', fontSize: '1.1rem', pointerEvents: 'none' }}>{displaySymbolMonto}</span>
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  required
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>
              {parseFloat(transferAmount || '0') > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', marginTop: '0.25rem' }}>
                  {isCustomerView ? (
                    `Equivalente: = ${(parseFloat(transferAmount) / fiatPeg).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð`
                  ) : (
                    `Equivalente aproximado: ~ $ ${(parseFloat(transferAmount) * fiatPeg).toLocaleString()} COP`
                  )}
                </div>
              )}
            </FormGroup>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
            <SubmitButton type="submit" disabled={processing}>
              {processing ? 'Procesando...' : (isCustomerView ? 'Confirmar Envío' : 'Confirmar Envío')}
            </SubmitButton>
          </div>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
