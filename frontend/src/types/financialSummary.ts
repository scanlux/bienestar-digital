export type FinancialSummaryMode =
  | { type: 'commerce'; commerceId: number }
  | { type: 'store'; storeId: number; storeName: string }
  | { type: 'delivery'; deliveryCompanyId: number; companyName: string };

export interface ConsolidatedStats {
  totalSalesCop?: number;
  totalEarningsCop?: number; // Específico para Delivery
  totalCommissionsPaidDomi: number;
  totalCompletedOrders: number;
  totalRejectedOrders: number;
  totalCancelledOrders: number;
  totalContingentRefundsDomi: number;
  walletBalanceDomi?: number;
  walletBalanceCop?: number;
  fiatPeg: number;
}

export interface StoreFinancialDetails {
  storeId: number;
  nombreSucursal: string;
  estado: 'operativo' | 'mantenimiento' | 'no_disponible';
  balanceCustodyDomi: number;
  balanceCustodyCop: number;
  contingentRefundsDomi: number;
  contingentRefundsCop: number;
  stats: {
    completedOrdersCount: number;
    rejectedOrdersCount: number;
    cancelledOrdersCount: number;
    totalSalesCop: number;
    commissionsPaidDomi: number;
  };
}

export interface FinancialSummaryResponse {
  consolidated: ConsolidatedStats;
  stores?: StoreFinancialDetails[]; // Solo presente en commerce
  store?: StoreFinancialDetails;    // Presente en store
  fiatPeg: number;
  monthOptions: string[];
}
