/**
 * Rutas API para el Token DOMI
 * 
 * Endpoints:
 *  GET  /api/domi/token       - Info publica del token DOMI
 *  GET  /api/domi/rules       - Reglas actuales del protocolo
 *  GET  /api/domi/wallet/:ownerType/:ownerId - Consultar billetera
 *  POST /api/domi/calculate   - Calcular costo de un pedido en DOMIs
 *  POST /api/domi/mint        - Comprar paquete de DOMIs (tienda)
 *  GET  /api/domi/packages/:storeId - Historial de paquetes de una tienda
 *  GET  /api/domi/ledger      - Consultar libro mayor (con filtros)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const domiEngine = require('../services/domiEngine');
const { logSecurityEvent } = require('../utils/securityLogger');

// =============================================
// ENDPOINTS PUBLICOS (solo lectura)
// =============================================

// Info del token DOMI
router.get('/token', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT symbol, name, decimals, fiat_peg_cop, protocol_version, created_at FROM token_registry WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ error: 'Token no configurado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reglas del protocolo (incluye costos de tienda y repartidor)
router.get('/rules', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT threshold_fiat_cop, base_cost_domis, percentage_rate, driver_base_cost_domis, driver_threshold_fiat_cop, driver_percentage_rate, retention_penalty_rate, refund_standard_rate, rescue_cashback_rate, effective_date FROM protocol_rules WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ error: 'Reglas no configuradas' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calcular costo de un pedido en DOMIs (no requiere auth)
router.post('/calculate', async (req, res) => {
  const { totalCop } = req.body;
  if (!totalCop || totalCop <= 0) {
    return res.status(400).json({ error: 'totalCop es requerido y debe ser positivo' });
  }
  try {
    const result = await domiEngine.calculateOrderCost(totalCop);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ENDPOINTS AUTENTICADOS
// =============================================

// Consultar billetera
router.get('/wallet/:ownerType/:ownerId', auth, async (req, res) => {
  const { ownerType, ownerId } = req.params;

  // Regla BOLA: Sólo administradores o los autorizados pueden ver la wallet
  if (req.user.rol !== 'admin') {
      if (ownerType === 'user') {
        // Cliente o repartidor sólo pueden ver su propia billetera
        if (String(req.user.id) !== String(ownerId)) {
          await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
            reason: 'Intento de ver billetera ajena de tipo usuario',
            targetOwnerType: ownerType,
            targetOwnerId: ownerId
          });
          return res.status(403).json({ error: 'Acceso no autorizado. Sólo puedes consultar tu propia billetera.' });
        }
      } else if (ownerType === 'store') {
        // Un administrador de sede debe pertenecer a esa sede
        const hasAccess = req.user.rol === 'vendor' && req.user.storeIds && req.user.storeIds.includes(parseInt(ownerId));
        // Un gerente de comercio debe ser el dueño del comercio de la sede
        let isManager = false;
        if (req.user.rol === 'vendor' && req.user.commerceId) {
          try {
            const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [ownerId, req.user.commerceId]);
            if (stores.length > 0) {
              isManager = true;
            }
          } catch (e) {
            console.error('Error verifying store manager access:', e);
          }
        }
        
        if (!hasAccess && !isManager) {
          await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
            reason: 'Intento de ver billetera de sede sin autorizacion',
            targetOwnerType: ownerType,
            targetOwnerId: ownerId
          });
          return res.status(403).json({ error: 'Acceso denegado a la billetera de esta sede.' });
        }
      } else {
        // Billetera del sistema u otras no permitidas para roles no admin
        await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: 'Intento de ver billetera de sistema u otra invalida',
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        return res.status(403).json({ error: 'Acceso denegado.' });
      }
    }

  try {
    const [rows] = await db.query(
      'SELECT id, owner_type, owner_id, balance_custody, balance_utility, locked_balance, created_at, updated_at FROM wallets WHERE owner_type = ? AND owner_id = ?',
      [ownerType, ownerId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Billetera no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Billetera del sistema (solo admin)
router.get('/wallet/system', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM wallets WHERE owner_type = 'system' AND owner_id IS NULL");
    if (rows.length === 0) return res.status(500).json({ error: 'Billetera del sistema no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ENDPOINTS DE OPERACIONES (Admin)
// =============================================

// Comprar paquete de DOMIs (tienda o repartidor)
router.post('/mint', auth, adminOnly, async (req, res) => {
  const { ownerType, ownerId, fiatAmount, paymentRef } = req.body;

  if (!ownerType || !ownerId || !fiatAmount || fiatAmount <= 0) {
    return res.status(400).json({ error: 'ownerType (store/user), ownerId y fiatAmount son requeridos.' });
  }
  if (!['store', 'user'].includes(ownerType)) {
    return res.status(400).json({ error: 'ownerType debe ser store o user.' });
  }

  try {
    const result = await domiEngine.mintDomis(ownerType, ownerId, fiatAmount, paymentRef);
    res.json({
      message: `Paquete de ${result.domis} DOMI acunado para ${ownerType} #${ownerId}`,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Historial de paquetes de una tienda
router.get('/packages/:storeId', auth, async (req, res) => {
  const storeId = req.params.storeId;
  
  // Regla BOLA: Sólo administradores, el administrador de la sede o el gerente del comercio dueño de dicha tienda pueden ver esto.
  if (req.user.rol !== 'admin') {
    const hasAccess = req.user.rol === 'vendor' && req.user.storeIds && req.user.storeIds.includes(parseInt(storeId));
    let isManager = false;
    if (req.user.rol === 'vendor' && req.user.commerceId) {
      try {
        const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, req.user.commerceId]);
        if (stores.length > 0) {
          isManager = true;
        }
      } catch (e) {
        console.error('Error verifying store manager access for packages:', e);
      }
    }
    
    if (!hasAccess && !isManager) {
      await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de ver historial de paquetes de sede sin autorizacion',
        targetStoreId: storeId
      });
      return res.status(403).json({ error: 'Acceso denegado al historial de paquetes de esta sede.' });
    }
  }

  try {
    const [packages] = await db.query(
      'SELECT * FROM domi_packages WHERE store_id = ? ORDER BY created_at DESC',
      [storeId]
    );
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Consultar libro mayor (con filtros opcionales)
router.get('/ledger', auth, adminOnly, async (req, res) => {
  const { txType, referenceType, referenceId, limit } = req.query;

  let query = 'SELECT * FROM domi_ledger WHERE 1=1';
  const params = [];

  if (txType) {
    query += ' AND tx_type = ?';
    params.push(txType);
  }
  if (referenceType) {
    query += ' AND reference_type = ?';
    params.push(referenceType);
  }
  if (referenceId) {
    query += ' AND reference_id = ?';
    params.push(referenceId);
  }

  query += ' ORDER BY created_at DESC';
  query += ` LIMIT ${parseInt(limit) || 50}`;

  try {
    const [entries] = await db.query(query, params);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
