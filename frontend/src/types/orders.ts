export interface OrderItemData {
  item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  thumbnail?: string | null;
}

export interface Order {
  id: number;
  store_id: number;
  store_name: string;
  customer_user_id: number;
  customer_nombres: string;
  customer_apellidos: string;
  total_cop: number;
  domi_cost: number;
  status: 'pendiente' | 'aceptado' | 'preparando' | 'listo' | 'listo_despacho' | 'en_camino' | 'entregado' | 'cancelado';
  delivery_address: string;
  notes: string;
  created_at: string;
  customer_score?: number;
  driver_user_id?: number | null;
  driver_nombres?: string | null;
  driver_apellidos?: string | null;
  delivery_company_id?: number | null;
  delivery_company_commission_paid?: number;
  fiat_peg_snapshot?: number;
  distance_km?: number | null;
  block_meters?: number;
  items?: OrderItemData[];
}

export type OrderCardMode =
  | {
      type: 'commerce-active';
      onStatusChange: (id: number, status: 'preparando' | 'listo') => void;
      onInformar: (orderId: number, agotadosItemIds: number[]) => Promise<void>;
      onReject: (orderId: number, reason: string) => Promise<void>;
      processingOrderId?: number | null;
    }
  | {
      type: 'commerce-history';
    }
  | {
      type: 'delivery-available';
      onAcceptDelivery: (order: Order) => void;
    }
  | {
      type: 'delivery-history';
      onAssignDriver?: (order: Order) => void;
    };
