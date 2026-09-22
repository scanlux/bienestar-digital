const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const { BusinessError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class GetTransactionLineage {
  async execute(userContext, data, req) {
    // Solo root/administradores del sistema con permiso view_ledger pueden auditar linajes
    if (userContext.actorType !== 'system_user' || userContext.rol !== 'root') {
      throw new ForbiddenError('Acceso denegado: Privilegios de auditoría insuficientes.');
    }

    const { reference } = data;
    if (!reference) {
      throw new BusinessError('La referencia de pago es requerida.');
    }

    // 1. Obtener el paquete de transaccion
    const [packages] = await db.query(
      'SELECT * FROM domi_packages WHERE payment_ref = ? LIMIT 1',
      [reference]
    );

    if (packages.length === 0) {
      throw new BusinessError('Paquete de transacción no encontrado para la referencia indicada.');
    }

    const pkg = packages[0];

    // 2. Obtener informacion del propietario y su wallet
    const [wallets] = await db.query(
      'SELECT id, user_id, is_system, tier, alias, balance_custody FROM wallets WHERE id = ? LIMIT 1',
      [pkg.wallet_id]
    );
    const wallet = wallets[0] || null;
    const ownerInfo = wallet ? await domiRepository.findWalletOwnerInfo(pkg.owner_entity_type, pkg.owner_entity_id) : null;

    // 3. Obtener entradas del Libro Mayor (Ledger)
    const [ledgerEntries] = await db.query(
      'SELECT id, tx_hash, tx_type, amount_domis, amount_fiat_cop, protocol_snapshot, created_at, notes FROM domi_ledger WHERE reference_type = "package" AND reference_id = ?',
      [pkg.id]
    );

    // 4. Obtener logs de seguridad/auditoria relacionados
    // Buscamos cualquier log que contenga la referencia en sus detalles JSON
    const [auditLogs] = await db.query(
      'SELECT id, event_type, severity, ip_address, details, created_at FROM security_audit_logs WHERE details LIKE ? ORDER BY created_at ASC',
      [`%${reference}%`]
    );

    // 5. Construir la linea de tiempo estructurada
    const timeline = [];

    // Paso 1: Inicio del checkout
    const checkoutLog = auditLogs.find(l => l.event_type === 'WOMPI_CHECKOUT_INITIATED');
    timeline.push({
      step: 'CHECKOUT_INITIATED',
      status: 'success',
      label: 'Sesión de Checkout Creada',
      at: checkoutLog ? checkoutLog.created_at : pkg.created_at,
      details: {
        fiatPeg: parseFloat(pkg.exchange_rate),
        domisPurchased: parseFloat(pkg.domis_purchased),
        fiatPaidCop: parseFloat(pkg.fiat_paid_cop),
        walletId: pkg.wallet_id,
        walletAlias: wallet ? wallet.alias : null,
        ownerType: pkg.owner_entity_type,
        ownerId: pkg.owner_entity_id,
        ownerName: ownerInfo ? (ownerInfo.nombre_sucursal || ownerInfo.nombre || ownerInfo.razon_social || `${ownerInfo.nombres} ${ownerInfo.apellidos}`) : 'Desconocido'
      }
    });

    // Paso 2: Recepción del webhook (intento, duplicado o firma inválida)
    const securityAlerts = auditLogs.filter(l => [
      'WOMPI_WEBHOOK_MALFORMED',
      'WOMPI_WEBHOOK_INVALID_SIGNATURE',
      'WOMPI_WEBHOOK_INVALID_REFERENCE',
      'WOMPI_WEBHOOK_DUPLICATE',
      'FINANCIAL_MINT_ABORTED_UNKNOWN_OWNER'
    ].includes(l.event_type));

    securityAlerts.forEach(log => {
      let stepName = 'WEBHOOK_ALERT';
      if (log.event_type === 'WOMPI_WEBHOOK_DUPLICATE') stepName = 'WEBHOOK_DUPLICATE';
      if (log.event_type === 'WOMPI_WEBHOOK_INVALID_SIGNATURE') stepName = 'WEBHOOK_INVALID_SIGNATURE';

      timeline.push({
        step: stepName,
        status: 'warning',
        label: `Alerta del Webhook: ${log.event_type}`,
        at: log.created_at,
        details: {
          severity: log.severity,
          ip: log.ip_address,
          logDetails: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
        }
      });
    });

    // Paso 3: Acreditación final
    if (pkg.status === 'confirmado') {
      const mintLog = auditLogs.find(l => l.event_type === 'WOMPI_MINT_SUCCESS');
      const ledgerEntry = ledgerEntries[0];

      timeline.push({
        step: 'BALANCE_CREDITED',
        status: 'success',
        label: 'Saldo Acreditado en Custodia',
        at: pkg.confirmed_at || (mintLog ? mintLog.created_at : null),
        details: {
          transactionId: mintLog ? (typeof mintLog.details === 'string' ? JSON.parse(mintLog.details).transactionId : mintLog.details.transactionId) : null,
          txHash: ledgerEntry ? ledgerEntry.tx_hash : null,
          protocolSnapshot: ledgerEntry ? (typeof ledgerEntry.protocol_snapshot === 'string' ? JSON.parse(ledgerEntry.protocol_snapshot) : ledgerEntry.protocol_snapshot) : null,
          notes: ledgerEntry ? ledgerEntry.notes : null
        }
      });
    } else if (pkg.status === 'anulado') {
      timeline.push({
        step: 'TRANSACTION_CANCELLED',
        status: 'error',
        label: 'Transacción Anulada',
        at: pkg.updated_at,
        details: {
          reason: 'Transacción cancelada por protocolo o sistema.'
        }
      });
    } else {
      timeline.push({
        step: 'PAYMENT_PENDING',
        status: 'pending',
        label: 'Pago Pendiente de Confirmación',
        at: new Date(),
        details: {
          message: 'Esperando evento de pasarela de pagos (Wompi).'
        }
      });
    }

    // Registrar evento de auditoria de visualizacion del linaje
    await logSecurityEvent(userContext.id, 'VIEW_LEDGER_AUDIT', 'LOW', req, {
      reference,
      target: 'Transaction Lineage'
    });

    return {
      reference,
      packageId: pkg.id,
      status: pkg.status,
      owner: {
        type: pkg.owner_entity_type,
        id: pkg.owner_entity_id,
        name: ownerInfo ? (ownerInfo.nombre_sucursal || ownerInfo.nombre || ownerInfo.razon_social || `${ownerInfo.nombres} ${ownerInfo.apellidos}`) : 'Desconocido',
        nit: ownerInfo ? ownerInfo.nit : null
      },
      wallet: {
        id: pkg.wallet_id,
        alias: wallet ? wallet.alias : null,
        tier: wallet ? wallet.tier : null,
        balanceCustody: wallet ? parseFloat(wallet.balance_custody) : 0
      },
      financial: {
        domisPurchased: parseFloat(pkg.domis_purchased),
        fiatPaidCop: parseFloat(pkg.fiat_paid_cop),
        exchangeRate: parseFloat(pkg.exchange_rate)
      },
      timeline
    };
  }
}

module.exports = new GetTransactionLineage();
