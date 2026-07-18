export type WalletOwnerType = 'user' | 'store' | 'commerce' | 'system' | 'delivery_company';

export interface WalletPanelProps {
  ownerType: WalletOwnerType;
  ownerId?: number;
  readOnly?: boolean;
  isCustomerView?: boolean;
}

export interface LedgerEntry {
  id: number;
  tx_hash: string;
  tx_type: string;
  from_wallet_id: number | null;
  to_wallet_id: number | null;
  amount_domis: string;
  amount_fiat_cop: string;
  notes: string;
  created_at: string;
  from_owner_type: string | null;
  from_owner_id: number | null;
  to_owner_type: string | null;
  to_owner_id: number | null;
}

export interface WalletData {
  id: number;
  owner_type: WalletOwnerType;
  owner_id: number;
  balance_custody: string | number;
  balance_utility: string | number;
  balance_reserves: string | number;
  locked_balance: string | number;
  domi_score?: number;
  pending_debts?: any[];
  contingent_refunds?: any[];
  total_custody_consolidated?: string | number;
}
