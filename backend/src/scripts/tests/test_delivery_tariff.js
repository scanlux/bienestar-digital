require('dotenv').config();
const db = require('../../config/db');
const protocol = require('../../services/domi-kernel/protocol');

async function testDeliveryTariff() {
  console.log('=== TEST DE TARIFA DINÁMICA DE DOMICILIO ===');

  try {
    const conn = await db.getConnection();

    // Obtener reglas de protocolo para verificar los valores actuales de la semilla
    const rules = await protocol.getProtocolRules(conn);
    console.log('Reglas cargadas:');
    console.log(' - delivery_base_fare_cop:', rules.delivery_base_fare_cop);
    console.log(' - delivery_base_distance_km:', rules.delivery_base_distance_km);
    console.log(' - delivery_extra_rate_cop_per_km:', rules.delivery_extra_rate_cop_per_km);
    console.log(' - delivery_max_distance_km:', rules.delivery_max_distance_km);

    // Caso 1: distancia = 1 km (< base 3 km) -> tarifa = $3,100
    console.log('\nCaso 1: Distancia = 1 km (< base 3 km)');
    const res1 = await protocol.calculateDeliveryCost(conn, 1);
    console.log('Result 1:', res1);
    if (res1.deliveryCostCop !== 3100) {
      throw new Error(`Fallo Caso 1: Esperado 3100, obtenido ${res1.deliveryCostCop}`);
    }

    // Caso 2: distancia = 3 km (= base) -> tarifa = $3,100
    console.log('\nCaso 2: Distancia = 3 km (= base 3 km)');
    const res2 = await protocol.calculateDeliveryCost(conn, 3);
    console.log('Result 2:', res2);
    if (res2.deliveryCostCop !== 3100) {
      throw new Error(`Fallo Caso 2: Esperado 3100, obtenido ${res2.deliveryCostCop}`);
    }

    // Caso 3: distancia = 5 km -> tarifa = 3100 + 2 * 400 = 3900
    console.log('\nCaso 3: Distancia = 5 km');
    const res3 = await protocol.calculateDeliveryCost(conn, 5);
    console.log('Result 3:', res3);
    if (res3.deliveryCostCop !== 3900) {
      throw new Error(`Fallo Caso 3: Esperado 3900, obtenido ${res3.deliveryCostCop}`);
    }

    // Caso 4: distancia = 9 km (máximo) -> tarifa = 3100 + 6 * 400 = 5500
    console.log('\nCaso 4: Distancia = 9 km (máximo)');
    const res4 = await protocol.calculateDeliveryCost(conn, 9);
    console.log('Result 4:', res4);
    if (res4.deliveryCostCop !== 5500) {
      throw new Error(`Fallo Caso 4: Esperado 5500, obtenido ${res4.deliveryCostCop}`);
    }

    // Caso 5: distancia = 12 km (> máximo) -> clamp a 9 km -> tarifa = 5500
    console.log('\nCaso 5: Distancia = 12 km (> máximo)');
    const res5 = await protocol.calculateDeliveryCost(conn, 12);
    console.log('Result 5:', res5);
    if (res5.deliveryCostCop !== 5500) {
      throw new Error(`Fallo Caso 5: Esperado 5500, obtenido ${res5.deliveryCostCop}`);
    }
    if (res5.distanceKmUsed !== 9) {
      throw new Error(`Fallo Caso 5 (clamping): Esperada distancia usada 9, obtenida ${res5.distanceKmUsed}`);
    }

    // Caso 6: calculateOrderCost sin distance_km en el payload -> simulación
    console.log('\nCaso 6: calculateOrderCost sin distance_km');
    const costDetailsSimulated = await protocol.calculateOrderCost(10000, null);
    console.log('Result 6:', costDetailsSimulated);
    if (costDetailsSimulated.distance_km_used < 3 || costDetailsSimulated.distance_km_used > 9) {
      throw new Error(`Fallo Caso 6: Distancia simulada fuera de rango: ${costDetailsSimulated.distance_km_used}`);
    }
    if (costDetailsSimulated.driver_delivery_cost_cop < 3100 || costDetailsSimulated.driver_delivery_cost_cop > 5500) {
      throw new Error(`Fallo Caso 6: Costo de envío fuera de rango: ${costDetailsSimulated.driver_delivery_cost_cop}`);
    }

    // Caso 7: driver_domi_cost != driver_cost_domi_snapshot
    console.log('\nCaso 7: Distinción entre tarifa de envío y comisión de plataforma');
    const costDetailsFixed = await protocol.calculateOrderCost(10000, 5);
    console.log('Result 7:', costDetailsFixed);
    console.log(' - driver_delivery_cost_cop (tarifa cliente):', costDetailsFixed.driver_delivery_cost_cop);
    console.log(' - driver_cost_cop_snapshot (comisión plataforma):', costDetailsFixed.driver_cost_cop_snapshot);
    if (costDetailsFixed.driver_delivery_cost_cop !== 3900) {
      throw new Error(`Fallo Caso 7 (tarifa cliente): Esperado 3900, obtenido ${costDetailsFixed.driver_delivery_cost_cop}`);
    }
    if (costDetailsFixed.driver_cost_cop_snapshot !== 300) {
      throw new Error(`Fallo Caso 7 (comisión plataforma): Esperada comisión de 300, obtenido ${costDetailsFixed.driver_cost_cop_snapshot}`);
    }

    conn.release();
    console.log('\n=== TEST DE TARIFA DINÁMICA EXITOSO ===');
  } catch (error) {
    console.error('Error durante la prueba de tarifa dinámica:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

testDeliveryTariff();
