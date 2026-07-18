import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { WalletData, LedgerEntry } from '@/components/Common/Wallet/WalletTypes';

export function useWallet(ownerType: 'user' | 'store' | 'commerce' | 'delivery_company' | 'system', ownerId: string | number | undefined) {
  const { token, user } = useAuth();
  const toast = useToast();
  const { showAlert } = useAlert();

  // Core States
  const [balance, setBalance] = useState<number>(0);
  const [fiatPeg, setFiatPeg] = useState<number>(400);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);
  const [processingWompi, setProcessingWompi] = useState(false);
  const [processingPay, setProcessingPay] = useState(false);

  // Wompi rules states
  const [wompiCommissionPercent, setWompiCommissionPercent] = useState<number>(2.65);
  const [wompiCommissionFixedCop, setWompiCommissionFixedCop] = useState<number>(700);
  const [wompiCommissionIvaPercent, setWompiCommissionIvaPercent] = useState<number>(19);
  const [wompiMinPurchaseCop, setWompiMinPurchaseCop] = useState<number>(1500);

  // Mask Balance
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('domi_hide_balance_web');
      return stored === 'true';
    }
    return false;
  });

  const toggleHide = () => {
    setHideBalance(prev => {
      const newVal = !prev;
      localStorage.setItem('domi_hide_balance_web', String(newVal));
      return newVal;
    });
  };

  const getOwnerLabel = () => {
    if (ownerType === 'delivery_company') return 'empresa de reparto';
    if (ownerType === 'commerce') return 'comercio';
    if (ownerType === 'store') return 'sede';
    if (ownerType === 'system') return 'sistema';
    return 'usuario';
  };

  // 1. Cargar saldo y configuración de Wompi/Peg
  const loadBalance = useCallback(async () => {
    if (!token) return;
    if (ownerType !== 'system' && !ownerId) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = ownerType === 'system'
        ? `${API_URL}/api/domi/wallet/system`
        : `${API_URL}/api/domi/wallet/${ownerType}/${ownerId}`;

      const walletRes = await axios.get(endpoint, { headers });
      const walletDataObj = walletRes.data;

      const bal = ownerType === 'system'
        ? parseFloat(walletDataObj.balance_utility) || 0
        : parseFloat(walletDataObj.balance_custody) || 0;

      setBalance(bal);
      setWalletData(walletDataObj);

      try {
        // Ejecutar las peticiones en paralelo para optimizar rendimiento y unificar fiatPeg
        const [tokenRes, rulesRes] = await Promise.all([
          axios.get(`${API_URL}/api/domi/token`, { headers }).catch(e => {
            console.warn('Error fetching token registry:', e.message);
            return null;
          }),
          axios.get(`${API_URL}/api/domi/rules`, { headers }).catch(e => {
            console.warn('Error fetching rules:', e.message);
            return null;
          })
        ]);

        let resolvedPeg = 400;
        if (tokenRes && tokenRes.data && tokenRes.data.fiat_peg_cop) {
          resolvedPeg = parseFloat(tokenRes.data.fiat_peg_cop);
        } else if (rulesRes && rulesRes.data && rulesRes.data.fiat_peg_cop) {
          resolvedPeg = parseFloat(rulesRes.data.fiat_peg_cop);
        }
        setFiatPeg(resolvedPeg);

        if (rulesRes && rulesRes.data) {
          setWompiCommissionPercent(parseFloat(rulesRes.data.wompi_commission_percent || 2.65));
          setWompiCommissionFixedCop(parseFloat(rulesRes.data.wompi_commission_fixed_cop || 700));
          setWompiCommissionIvaPercent(parseFloat(rulesRes.data.wompi_commission_iva_percent || 19));
          setWompiMinPurchaseCop(parseFloat(rulesRes.data.wompi_min_purchase_cop || 1500));
        }
      } catch (rulesErr) {
        console.error('Error fetching protocol rules or token info:', rulesErr);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast.error(`No se pudo cargar el saldo de la billetera de la ${getOwnerLabel()}.`);
    } finally {
      setLoading(false);
    }
  }, [token, ownerType, ownerId, toast]);

  // 2. Cargar historial
  const loadHistory = useCallback(async () => {
    if (!token) return;
    if (ownerType !== 'system' && !ownerId) return;
    setLoadingHistory(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = ownerType === 'system'
        ? `${API_URL}/api/domi/ledger?limit=100`
        : `${API_URL}/api/domi/wallet/${ownerType}/${ownerId}/history?limit=100`;

      const res = await axios.get(endpoint, { headers });
      setHistory(res.data || []);
    } catch (error) {
      console.error('Error loading ledger history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [token, ownerType, ownerId]);

  // 3. Cargar alias
  const fetchAliases = useCallback(async () => {
    if (!token) return;
    if (ownerType === 'system' || !ownerId) return;
    setLoadingAliases(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `${API_URL}/api/domi/wallet/${ownerType}/${ownerId}/aliases`,
        { headers }
      );
      setAliases(res.data || []);
    } catch (error) {
      console.error('Error fetching aliases:', error);
    } finally {
      setLoadingAliases(false);
    }
  }, [token, ownerType, ownerId]);

  // 4. Crear alias
  const createAlias = async (aliasName: string) => {
    if (!token || !ownerId) return false;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/domi/wallet/${ownerType}/${ownerId}/aliases`,
        { alias: aliasName },
        { headers }
      );
      toast.success('Alias registrado correctamente.');
      await fetchAliases();
      return true;
    } catch (error: any) {
      console.error('Error creating alias:', error);
      toast.error(error.response?.data?.message || 'Error al registrar el alias.');
      return false;
    }
  };

  // 5. Eliminar alias
  const deleteAlias = async (aliasId: number) => {
    if (!token || !ownerId) return false;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(
        `${API_URL}/api/domi/wallet/${ownerType}/${ownerId}/aliases/${aliasId}`,
        { headers }
      );
      toast.success('Alias eliminado correctamente.');
      await fetchAliases();
      return true;
    } catch (error: any) {
      console.error('Error deleting alias:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar el alias.');
      return false;
    }
  };

  // 6. Realizar transferencia
  const transfer = async (toAlias: string, amount: number) => {
    if (!token || !ownerId) return false;
    setProcessingTransfer(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/domi/transfer`,
        {
          fromType: ownerType,
          fromId: Number(ownerId),
          toAlias,
          amountDomis: amount
        },
        { headers }
      );
      toast.success('Transferencia procesada correctamente.');
      await loadBalance();
      await loadHistory();
      return true;
    } catch (error: any) {
      console.error('Error transfering domis:', error);
      toast.error(error.response?.data?.message || 'Error al procesar transferencia.');
      return false;
    } finally {
      setProcessingTransfer(false);
    }
  };

  // 7. Iniciar checkout de Wompi
  const initWompiCheckout = async (copAmount: number) => {
    if (!token || !ownerId) return false;
    setProcessingWompi(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const amountDomis = copAmount / fiatPeg;

      const { data } = await axios.post(
        `${API_URL}/api/domi/payment/checkout-session`,
        { amountDomis, ownerType, ownerId: Number(ownerId) },
        { headers }
      );

      const wompiUrl = new URL('https://checkout.wompi.co/p/');
      wompiUrl.searchParams.set('public-key', data.publicKey);
      wompiUrl.searchParams.set('currency', data.currency || 'COP');
      wompiUrl.searchParams.set('amount-in-cents', String(data.amountInCents));
      wompiUrl.searchParams.set('reference', data.reference);
      wompiUrl.searchParams.set('signature:integrity', data.signature);
      wompiUrl.searchParams.set('redirect-url', data.redirectUrl);

      window.open(wompiUrl.toString(), '_blank');
      return true;
    } catch (error: any) {
      console.error('Error initiating Wompi checkout:', error);
      toast.error(
        error.response?.data?.message || 'No se pudo iniciar la pasarela de pago. Intenta de nuevo.'
      );
      return false;
    } finally {
      setProcessingWompi(false);
    }
  };

  // 8. Pagar Servicio
  const payService = async (serviceType: string, amount: number) => {
    if (!token || !ownerId) return false;
    setProcessingPay(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/domi/transfer`,
        {
          fromType: ownerType,
          fromId: Number(ownerId),
          toType: 'commerce', // Mock target
          toId: 8888,
          amountDomis: amount
        },
        { headers }
      );
      toast.success('Pago de servicio procesado correctamente.');
      await loadBalance();
      await loadHistory();
      return true;
    } catch (error: any) {
      console.error('Error paying service:', error);
      toast.error('No se pudo procesar el pago.');
      return false;
    } finally {
      setProcessingPay(false);
    }
  };

  // 9. Pagar cargo por incumplimiento / compensación automática
  const payDebt = async (debtId: number) => {
    if (!token || !ownerId) return false;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = ownerType === 'store' || ownerType === 'commerce'
        ? `${API_URL}/api/domi/debts/store/${debtId}/pay`
        : `${API_URL}/api/domi/debts/${debtId}/pay`;
      await axios.post(endpoint, {}, { headers });
      toast.success('Compensación liquidada exitosamente.');
      await loadBalance();
      await loadHistory();
      return true;
    } catch (error: any) {
      console.error('Error paying debt:', error);
      toast.error(error.response?.data?.message || 'Error al pagar el cargo.');
      return false;
    }
  };

  // Efecto inicializador
  useEffect(() => {
    if (ownerType === 'system' || ownerId) {
      loadBalance();
      loadHistory();
      if (ownerType !== 'system') {
        fetchAliases();
      }
    }
  }, [ownerId, ownerType, loadBalance, loadHistory, fetchAliases]);

  const balanceCOP = balance * fiatPeg;

  return {
    balance,
    balanceCOP,
    fiatPeg,
    walletData,
    history,
    aliases,
    loading,
    loadingHistory,
    loadingAliases,
    processingTransfer,
    processingWompi,
    processingPay,
    hideBalance,
    wompiCommissionPercent,
    wompiCommissionFixedCop,
    wompiCommissionIvaPercent,
    wompiMinPurchaseCop,
    toggleHide,
    loadBalance,
    loadHistory,
    fetchAliases,
    createAlias,
    deleteAlias,
    transfer,
    initWompiCheckout,
    payService,
    payDebt
  };
}
