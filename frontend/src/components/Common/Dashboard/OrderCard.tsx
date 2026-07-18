import React from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderCardMode } from '@/types/orders';
import {
  OrderItem,
  ActionButtonStyle,
  CollapsibleContainer,
  CollapsibleInner,
  ExtendedDetailsGrid,
  StepperContainer,
  StepperWrapper,
  StepperLine,
  StepNode,
  OrderItemsContainer,
  OrderItemsHeader,
  OrderItemRow,
  ItemThumbnail,
  ItemName,
  ItemQtyBadge,
  ItemPrice,
  OrderNotesContainer,
  CheckboxLabel,
} from '@/components/Common/Dashboard/CommerceDashboardStyles';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  Form,
  Label,
  TextArea,
} from '@/components/Common/ModalStyles';

interface OrderCardProps {
  order: Order;
  mode: OrderCardMode;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
}

const getStepIndex = (status: string) => {
  switch (status) {
    case 'pendiente':
    case 'aceptado':      return 1;
    case 'preparando':    return 2;
    case 'listo':         return 3;
    case 'listo_despacho':return 4;
    case 'en_camino':     return 5;
    case 'entregado':     return 6;
    case 'cancelado':     return -1;
    default:              return 1;
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  mode,
  isExpanded,
  onToggleExpand,
}) => {
  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelado';

  const [agotados, setAgotados] = React.useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const handleToggleAgotado = (itemId: number) => {
    const next = new Set(agotados);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setAgotados(next);
  };

  const handleInformarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agotados.size === 0 || mode.type !== 'commerce-active' || !mode.onInformar) return;
    setIsSubmitting(true);
    try {
      await mode.onInformar(order.id, Array.from(agotados));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeliveryMode = mode.type === 'delivery-available' || mode.type === 'delivery-history';

  const steps = isDeliveryMode
    ? [
        { label: 'Pendiente',           index: 3 },
        { label: 'Repartidor Asignado', index: 4 },
        { label: 'En Camino',           index: 5 },
        { label: 'Entregado',           index: 6 }
      ]
    : [
        { label: 'Pendiente',           index: 1 },
        { label: 'Preparando',          index: 2 },
        { label: 'Para Entrega',        index: 3 },
        { label: 'Repartidor Asignado', index: 4 },
        { label: 'En Camino',           index: 5 },
        { label: 'Entregado',           index: 6 }
      ];

  let progressPercent = 0;
  if (isCancelled) {
    progressPercent = 0;
  } else {
    if (isDeliveryMode) {
      if (currentStep >= 3) {
        progressPercent = ((currentStep - 3) / 3) * 100;
      } else {
        progressPercent = 0;
      }
    } else {
      if (currentStep >= 1) {
        progressPercent = ((currentStep - 1) / 5) * 100;
      }
    }
  }

  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = orderDate.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const day = orderDate.getDate();
  const month = orderDate.getMonth() + 1;
  const year = orderDate.getFullYear();
  const shortTime = orderDate.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const shortDateTime = `${day}/${month}/${year} ${shortTime}`;

  const score = order.customer_score !== undefined ? order.customer_score : 0;
  let scoreClass = 'high';
  if (score <= 0) {
    scoreClass = 'low';
  } else if (score < 50) {
    scoreClass = 'medium';
  }

  const hasActions = !!(
    (mode.type === 'commerce-active' && ['pendiente', 'preparando', 'listo'].includes(order.status)) ||
    (mode.type === 'delivery-available') ||
    (mode.type === 'delivery-history' && mode.onAssignDriver && order.status === 'listo_despacho' && !order.driver_user_id)
  );

  const isCommerceActiveMode = mode.type === 'commerce-active';
  const headerCols = isCommerceActiveMode 
    ? '36px 240px 140px 1fr 100px' 
    : '36px 1fr 1fr 100px';

  return (
    <OrderItem
      className={order.status}
      $expanded={isExpanded}
      onClick={() => onToggleExpand(order.id)}
    >
      <div className="order-main-row">
        <div className="order-details" style={{ gap: '14px' }}>
          <div className="order-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="order-id">Pedido #{order.id}</span>
            <span className="order-store">{order.store_name}</span>
          </div>
          <span className="order-datetime" style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
            {shortDateTime}
          </span>
          <div className="customer-score-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>Score del Cliente:</span>
            <span className={`score-badge ${scoreClass}`} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px' }}>
              ★ {score} pts
            </span>
          </div>
          <div className="order-price-row" style={{ marginTop: 0 }}>
            {isDeliveryMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="total-amount" style={{ color: '#22c55e' }}>
                  Envío: ${Number(order.domi_cost * (order.fiat_peg_snapshot || 400)).toLocaleString('es-CO')}
                </span>
                {order.distance_km !== undefined && order.distance_km !== null && (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    Distancia: {Math.round(order.distance_km * 1000 / (order.block_meters || 100))} cuadras (~{order.distance_km} km)
                  </span>
                )}
              </div>
            ) : (
              <span className="total-amount">Total: ${Number(order.total_cop).toLocaleString()}</span>
            )}
          </div>
        </div>

        <StepperContainer onClick={(e) => e.stopPropagation()}>
          <StepperWrapper>
            {!isCancelled && <StepperLine $progress={progressPercent} />}
            {steps.map((step) => {
              const completed = !isCancelled && currentStep > step.index;
              const active = !isCancelled && currentStep === step.index;
              const labelText = isCancelled && step.index === (isDeliveryMode ? 3 : 1) ? 'Cancelado' : step.label;

              return (
                <StepNode
                  key={step.index}
                  $active={active}
                  $completed={completed}
                  $cancelled={isCancelled && step.index === (isDeliveryMode ? 3 : 1)}
                  $stepIndex={isDeliveryMode ? step.index - 2 : step.index}
                >
                  <div className="circle">
                    {isCancelled && step.index === (isDeliveryMode ? 3 : 1) ? '✕' : (completed ? '✓' : (isDeliveryMode ? step.index - 2 : step.index))}
                  </div>
                  <span className="label">{labelText}</span>
                </StepNode>
              );
            })}
          </StepperWrapper>
        </StepperContainer>
      </div>

      <CollapsibleContainer $expanded={isExpanded} onClick={(e) => e.stopPropagation()}>
        <CollapsibleInner $expanded={isExpanded}>
          {order.items && order.items.length > 0 && (
            <OrderItemsContainer>
              <OrderItemsHeader style={{ gridTemplateColumns: headerCols }}>
                <span className="col-detail" style={!isCommerceActiveMode ? { gridColumn: 'span 2' } : undefined}>Detalle del Pedido</span>
                {isCommerceActiveMode && <span className="col-agotado">Marcar Agotado</span>}
                <span className="col-qty">Cantidad</span>
                <span className="col-price">Precio</span>
              </OrderItemsHeader>
              {order.items.map((item) => {
                const isAgotado = agotados.has(item.item_id);
                return (
                  <OrderItemRow key={item.item_id} style={{ gridTemplateColumns: headerCols }}>
                    {item.thumbnail ? (
                      <ItemThumbnail 
                        src={item.thumbnail} 
                        alt={item.product_name} 
                        onError={(e) => {
                          e.currentTarget.src = '/images/food.png';
                        }}
                      />
                    ) : (
                      <ItemThumbnail src="/images/food.png" alt="food" style={{ opacity: 0.6 }} />
                    )}
                    <ItemName style={{ textDecoration: isAgotado ? 'line-through' : 'none', opacity: isAgotado ? 0.5 : 1 }}>
                      {item.product_name}
                    </ItemName>

                    {isCommerceActiveMode && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CheckboxLabel onClick={(e) => e.stopPropagation()} style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={isAgotado}
                            onChange={() => handleToggleAgotado(item.item_id)}
                          />
                          <span className="checkbox-custom" />
                        </CheckboxLabel>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <ItemQtyBadge style={{ opacity: isAgotado ? 0.5 : 1, margin: 0 }}>
                        x{item.quantity}
                      </ItemQtyBadge>
                    </div>

                    <ItemPrice style={{ opacity: isAgotado ? 0.5 : 1 }}>
                      ${Number(item.price * item.quantity).toLocaleString()}
                    </ItemPrice>
                  </OrderItemRow>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, marginRight: '16px' }}>Subtotal productos:</span>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 800 }}>
                  ${order.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()}
                </span>
              </div>
            </OrderItemsContainer>
          )}

          {hasActions && (
            <div className="order-actions" style={{ borderTop: 'none', marginTop: '12px', paddingTop: '0' }}>
              {/* Flujo Comercio */}
              {mode.type === 'commerce-active' && (
                <>
                  {order.status === 'pendiente' ? (
                    <>
                      {agotados.size > 0 ? (
                        <ActionButtonStyle
                          $variant="approve"
                          onClick={(e) => handleInformarClick(e)}
                          disabled={isSubmitting || mode.processingOrderId === order.id}
                        >
                          {isSubmitting ? 'Informando...' : 'Informar al Cliente'}
                        </ActionButtonStyle>
                      ) : (
                        <ActionButtonStyle
                          $variant="approve"
                          onClick={() => mode.onStatusChange(order.id, 'preparando')}
                          disabled={mode.processingOrderId === order.id}
                        >
                          Aceptar
                        </ActionButtonStyle>
                      )}
                      <ActionButtonStyle
                        $variant="reject"
                        onClick={() => setIsRejectionModalOpen(true)}
                        disabled={isSubmitting || mode.processingOrderId === order.id}
                      >
                        Rechazar
                      </ActionButtonStyle>
                    </>
                  ) : order.status === 'preparando' ? (
                    <ActionButtonStyle
                      $variant="ready"
                      onClick={() => mode.onStatusChange(order.id, 'listo')}
                      disabled={mode.processingOrderId === order.id}
                    >
                      Marcar Listo
                    </ActionButtonStyle>
                  ) : order.status === 'listo' ? (
                    <ActionButtonStyle
                      $variant="ready"
                      disabled
                      style={{ opacity: 0.5, cursor: 'default' }}
                    >
                      Esperando Repartidor
                    </ActionButtonStyle>
                  ) : null}
                </>
              )}

              {/* Flujo Delivery Company */}
              {mode.type === 'delivery-available' && (
                <ActionButtonStyle
                  $variant="approve"
                  onClick={() => mode.onAcceptDelivery(order)}
                >
                  Aceptar Pedido
                </ActionButtonStyle>
              )}

              {mode.type === 'delivery-history' && mode.onAssignDriver && order.status === 'listo_despacho' && !order.driver_user_id && (
                <ActionButtonStyle
                  $variant="ready"
                  onClick={() => mode.onAssignDriver?.(order)}
                >
                  Asignar Repartidor
                </ActionButtonStyle>
              )}
            </div>
          )}

          {order.notes && (mode.type === 'commerce-active' || mode.type === 'commerce-history') && (
            <OrderNotesContainer style={{ marginTop: '16px' }}>
              <svg className="notes-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <div className="notes-content">
                <div className="notes-label">Notas/Recomendaciones del pedido</div>
                <div className="notes-text">&quot;{order.notes}&quot;</div>
              </div>
            </OrderNotesContainer>
          )}

          <ExtendedDetailsGrid>
            {(!isCommerceActiveMode && mode.type !== 'commerce-history') && (
              <>
                <div className="detail-box">
                  <span className="label">Solicitante</span>
                  <span className="value">{order.customer_nombres} {order.customer_apellidos}</span>
                </div>
                <div className="detail-box">
                  <span className="label">Score del Cliente</span>
                  <span className="value">
                    <span className={`score-badge ${scoreClass}`}>
                      ★ {score} pts
                    </span>
                  </span>
                </div>
              </>
            )}
            <div className="detail-box">
              <span className="label">Fecha del Pedido</span>
              <span className="value">{formattedDate}</span>
            </div>
            <div className="detail-box">
              <span className="label">Hora del Pedido (Col)</span>
              <span className="value">{formattedTime}</span>
            </div>
            {order.driver_nombres && (
              <div className="detail-box">
                <span className="label">Repartidor Asignado</span>
                <span className="value" style={{ color: '#ff9e00' }}>
                  {order.driver_nombres} {order.driver_apellidos || ''}
                </span>
              </div>
            )}
          </ExtendedDetailsGrid>
        </CollapsibleInner>
      </CollapsibleContainer>

      {/* Modal de confirmación de rechazo */}
      {isRejectionModalOpen && mode.type === 'commerce-active' && createPortal(
        <ModalOverlay onClick={() => { setIsRejectionModalOpen(false); setRejectionReason(''); }}>
          <ModalContent $maxWidth="500px" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Rechazar Pedido #{order.id}</ModalTitle>
              <CloseButton onClick={() => { setIsRejectionModalOpen(false); setRejectionReason(''); }}>✕</CloseButton>
            </ModalHeader>
            <Form onSubmit={async (e) => {
              e.preventDefault();
              if (rejectionReason.trim().length >= 5) {
                try {
                  await mode.onReject(order.id, rejectionReason.trim());
                  setIsRejectionModalOpen(false);
                  setRejectionReason('');
                } catch (err) {
                  console.error('Error rejecting order inside card:', err);
                }
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label>Razón del Rechazo (Mínimo 5 caracteres)</Label>
                <TextArea
                  placeholder="Ingrese la razón interna del rechazo del pedido..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setIsRejectionModalOpen(false); setRejectionReason(''); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    lineHeight: '1.2',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rejectionReason.trim().length < 5}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    lineHeight: '1.2',
                    cursor: rejectionReason.trim().length < 5 ? 'not-allowed' : 'pointer',
                    opacity: rejectionReason.trim().length < 5 ? 0.5 : 1
                  }}
                >
                  Confirmar Rechazo
                </button>
              </div>
            </Form>
          </ModalContent>
        </ModalOverlay>,
        document.getElementById('modal-portal-root') || document.body
      )}
    </OrderItem>
  );
};
