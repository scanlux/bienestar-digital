const db = require('../config/db');

/**
 * Obtiene el estado actual de la tesorería de DOMI (Ratio de Colateralización y Circulantes)
 */
async function getTreasuryStatus(conn) {
  const queryExecutor = conn || db;
  
  // 1. Obtener peg actual
  const [tokenRows] = await queryExecutor.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
  const peg = parseFloat(tokenRows[0]?.fiat_peg_cop || 1.0);

  // 2. Obtener saldos totales de wallets (excluyendo la del sistema)
  const [supplyRows] = await queryExecutor.query(
    "SELECT SUM(balance_custody + balance_utility) as total_balances FROM wallets WHERE is_system = 0"
  );
  const circulante_total = parseFloat(supplyRows[0]?.total_balances || 0);

  // 3. Obtener circulante transitorio (acuñaciones por efectivo pendientes de confirmación bancaria)
  const [transitoryRows] = await queryExecutor.query(
    "SELECT SUM(domis_purchased) as transitory_supply FROM domi_packages WHERE is_confirmed = 0"
  );
  const circulante_transitorio = parseFloat(transitoryRows[0]?.transitory_supply || 0);

  // 4. Calcular circulante oficial (tokens confirmados en circulación)
  const circulante_oficial = Math.max(0, circulante_total - circulante_transitorio);

  // 5. Obtener la última declaración de reserva bancaria
  const [reserveRows] = await queryExecutor.query(
    'SELECT reserva_cop, fecha_declaracion, created_at FROM domi_reserve_declarations ORDER BY fecha_declaracion DESC, created_at DESC LIMIT 1'
  );
  const reserva_cop = parseFloat(reserveRows[0]?.reserva_cop || 0);
  const last_declaration_date = reserveRows[0] ? reserveRows[0].fecha_declaracion : null;

  // 6. Calcular ratio de colateralización
  const collateral_ratio = circulante_oficial > 0 ? (reserva_cop / (circulante_oficial * peg)) * 100 : 100.0;
  const superavit_cop = reserva_cop - (circulante_oficial * peg);

  // Alerta de solvencia si el ratio es menor al 100%
  const is_solvent = collateral_ratio >= 100.0;

  return {
    circulante_oficial,
    circulante_transitorio,
    circulante_total,
    reserva_cop,
    last_declaration_date,
    collateral_ratio,
    superavit_cop,
    is_solvent,
    fiat_peg_cop: peg
  };
}

/**
 * Valida la solvencia fiduciaria simulando el impacto de un retiro.
 */
async function validateSolvencyBeforeWithdrawal(conn, amountDomis) {
  const queryExecutor = conn || db;
  const status = await getTreasuryStatus(queryExecutor);

  const amountCop = amountDomis * status.fiat_peg_cop;
  const postReserva = status.reserva_cop - amountCop;
  const postSupply = status.circulante_oficial - amountDomis;

  if (postReserva < 0) {
    return {
      ok: false,
      ratio_actual: status.collateral_ratio,
      ratio_post_retiro: 0,
      peg: status.fiat_peg_cop,
      detail: `Insolvencia: El monto del retiro ($${amountCop.toLocaleString()} COP) supera la reserva fiduciaria declarada ($${status.reserva_cop.toLocaleString()} COP).`
    };
  }

  const ratioPost = postSupply > 0 ? (postReserva / (postSupply * status.fiat_peg_cop)) * 100 : 100.0;

  if (ratioPost < 100.0) {
    return {
      ok: false,
      ratio_actual: status.collateral_ratio,
      ratio_post_retiro: ratioPost,
      peg: status.fiat_peg_cop,
      detail: `Retiro rechazado por riesgo de solvencia. El ratio de colateralización post-retiro sería del ${ratioPost.toFixed(2)}%, inferior al 100% mínimo.`
    };
  }

  return {
    ok: true,
    ratio_actual: status.collateral_ratio,
    ratio_post_retiro: ratioPost,
    peg: status.fiat_peg_cop,
    detail: 'Solvencia confirmada. La reserva cubre el retiro manteniendo el colateral por encima del 100%.'
  };
}

/**
 * Desglose de ingresos (comisiones cobradas, comisiones de retiro, cashback pagado)
 */
async function getRevenueBreakdown(conn, startDate, endDate) {
  const queryExecutor = conn || db;
  
  const [rows] = await queryExecutor.query(
    `SELECT tx_type, SUM(amount_domis) as total_amount
     FROM domi_ledger
     WHERE created_at BETWEEN ? AND ?
     GROUP BY tx_type`,
    [startDate, endDate]
  );

  return rows;
}

/**
 * Estadísticas de tokens quemados por día
 */
async function getDailyBurnStats(conn, days = 30) {
  const queryExecutor = conn || db;

  const [rows] = await queryExecutor.query(
    `SELECT DATE(created_at) as date, SUM(amount_domis) as amount_burned
     FROM domi_ledger
     WHERE tx_type IN ('burn_service', 'burn_manual') AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [days]
  );

  return rows;
}

/**
 * Evalúa una propuesta de ajuste del peg del DOMI por rendimiento de inversiones certificadas.
 */
async function evaluateYieldAdjustment(conn, certifiedYieldCop, investedPeriodDays) {
  const queryExecutor = conn || db;
  const status = await getTreasuryStatus(queryExecutor);

  const [rulesRows] = await queryExecutor.query('SELECT max_monthly_yield_pct FROM protocol_rules WHERE id = 1');
  const maxYieldPct = parseFloat(rulesRows[0]?.max_monthly_yield_pct || 0.005); // por defecto 0.5% mensual

  // Calcular rendimiento mensual efectivo
  const months = investedPeriodDays / 30.0;
  const yieldPerMonth = (certifiedYieldCop / status.reserva_cop) / months;

  if (yieldPerMonth > maxYieldPct) {
    return {
      ok: false,
      detail: `El rendimiento mensual propuesto (${(yieldPerMonth * 100).toFixed(4)}%) supera el tope mensual parametrizado de ${(maxYieldPct * 100).toFixed(2)}%.`
    };
  }

  // Simular incremento en el peg (paridad artificial)
  const newPeg = status.fiat_peg_cop * (1.0 + (yieldPerMonth * months));
  const newCollateralRatio = status.circulante_oficial > 0 ? (status.reserva_cop / (status.circulante_oficial * newPeg)) * 100 : 100.0;

  // Se requiere un buffer de solvencia mínimo del 5% post-ajuste (ratio >= 105%)
  if (newCollateralRatio < 105.0) {
    return {
      ok: false,
      detail: `Ajuste rechazado. El ratio de colateralización resultante sería del ${newCollateralRatio.toFixed(2)}%, inferior al buffer de seguridad del 105% requerido.`
    };
  }

  return {
    ok: true,
    peg_actual: status.fiat_peg_cop,
    peg_propuesto: newPeg,
    rendimiento_mensual_propuesto: yieldPerMonth,
    ratio_colateral_actual: status.collateral_ratio,
    ratio_colateral_post_ajuste: newCollateralRatio,
    detail: 'Simulación exitosa. El ajuste cumple con los límites de rendimiento y mantiene el buffer del 105%.'
  };
}

module.exports = {
  getTreasuryStatus,
  validateSolvencyBeforeWithdrawal,
  getRevenueBreakdown,
  getDailyBurnStats,
  evaluateYieldAdjustment
};
