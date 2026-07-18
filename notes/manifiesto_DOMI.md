# Manifiesto DOMI - El Token de Confianza del Ecosistema Trendy

## 1. Naturaleza del DOMI: Una Stablecoin de Custodia Local

El DOMI no es una criptomoneda especulativa. Es un instrumento de custodia fiduciaria emitido exclusivamente dentro del ecosistema Trendy/Bienestar Digital. Su filosofia es identica a la de Tether (USDT) respecto al dolar, pero anclado al Peso Colombiano (COP):

> 1 DOMI = N COP, donde N es el peg vigente declarado en token_registry.fiat_peg_cop.

La equivalencia inicial es 1 DOMI = 400 COP. Esto significa que si un usuario deposita $4,000 COP, recibe exactamente 10 DOMI. Si deposita $40,000 COP, recibe 100 DOMI. La conversion siempre es 1:1 respecto al peg actual.

---

## 2. Inversion Real y Rendimiento como Unico Motor de Apreciacion

### 2.1 El Dinero Trabaja

Cada peso colombiano captado mediante la compra de DOMIs (ya sea por Wompi, consignacion bancaria, u otro medio confirmado) ingresa a la Reserva de Tesoreria del Sistema. Esta reserva no esta ociosa. El administrador del sistema invierte ese capital en productos financieros de bajo riesgo (cuentas de ahorro, CDTs, fondos de inversion en pesos colombianos, etc.).

Ejemplo de ciclo:
- Usuarios compran 250,000 DOMI equivalentes a $100,000,000 COP.
- El sistema deposita esos $100M COP en un CDT bancario al 10% anual efectivo.
- Despues de 12 meses, el CDT genera $10,000,000 COP de rendimiento certificado.
- El administrador declara ese rendimiento en el sistema. El motor de tesoreria evalua si el ajuste es seguro.
- Si el ratio de colateralizacion soporta el cambio, el peg sube de 400 a 440 COP.

### 2.2 Todos Los Usuarios Ganan Sin Hacer Nada

Cuando el peg sube de 400 a 440 COP, cada usuario que tenga DOMIs en su billetera ve aumentado su poder adquisitivo automaticamente:

- Repartidor con 300 DOMI: antes $120,000 COP -> despues $132,000 COP. Ganancia: +$12,000 COP.
- Tienda con 1,000 DOMI: antes $400,000 COP -> despues $440,000 COP. Ganancia: +$40,000 COP.
- Usuario con 50 DOMI: antes $20,000 COP -> despues $22,000 COP. Ganancia: +$2,000 COP.

La apreciacion es democratica y proporcional. El que mas DOMIs tiene, mas gana. Nadie paga comisiones por la apreciacion.

### 2.3 La Regla de Oro: El Peg Solo Sube por Rendimiento Certificado

El precio del DOMI NUNCA puede subir de forma arbitraria. Solo puede incrementarse cuando:

1. El administrador registra un rendimiento certificado en domi_yield_declarations (con certificacion bancaria adjunta como prueba).
2. La funcion evaluateYieldAdjustment() valida que el rendimiento mensual propuesto no supera el tope parametrizado (max_monthly_yield_pct en protocol_rules).
3. El ratio de colateralizacion post-ajuste sea >= 105% (buffer de seguridad obligatorio).
4. Solo un administrador con el permiso adjust_domi_peg puede ejecutar el ajuste.

El DOMI no puede bajar de precio. A diferencia de las criptomonedas especulativas, el peg es un piso garantizado. Nunca decrece. Tampoco puede subir de forma inflacionaria sin respaldo real.

---

## 3. Arquitectura de Solvencia: El Ratio de Colateralizacion

El sistema es solvente si y solo si:

Ratio = Reserva_COP / (Circulante_DOMI * Peg_COP) >= 100%

Esto garantiza que cada DOMI en circulacion tiene exactamente 1 COP (al peg vigente) de respaldo real en la reserva bancaria del sistema.

### 3.1 Tipos de Circulante

- Circulante Transitorio: DOMIs acunados por consignaciones bancarias aun no confirmadas (is_confirmed = 0). No cuentan en el ratio.
- Circulante Oficial: DOMIs confirmados en todas las billeteras (usuarios, tiendas, repartidores). Estos SI cuentan en el ratio.
- Utilidad del Sistema: DOMIs en balance_utility de la billetera del sistema. Son comisiones capturadas. No son circulante - son ganancias operativas del negocio que tambien pueden reinvertirse para generar rendimiento.

### 3.2 Declaraciones de Reserva (Transparencia)

El administrador declara periodicamente la reserva real en domi_reserve_declarations. Esta tabla es auditada para calcular el ratio de colateralizacion en tiempo real. La app muestra este ratio publicamente para generar confianza.

---

## 4. Flujo de Emision (Mint) y Retiro (Burn)

### 4.1 Compra de DOMIs (Mint)

Dinero Real (COP) -> Sistema -> DOMIs en billetera del comprador / Reserva Bancaria se incrementa

- Via Wompi: El webhook confirma el pago y ejecuta mintDomis() automaticamente.
- Via Consignacion Bancaria: El operador confirma manualmente, ejecuta mintDomis() con isConfirmed = true.
- El exchange_rate del paquete queda frozen al peg del momento de la compra (snapshot historico).

### 4.2 Retiro de DOMIs (Burn)

DOMIs en billetera -> Sistema quema los DOMIs -> Reserva envia COP al usuario

- Solo posible si withdrawals_enabled = 1 (control global del sistema).
- Solo para usuarios con permiso withdraw_domis.
- validateSolvencyBeforeWithdrawal() verifica que el ratio se mantenga >= 100% post-retiro.
- El monto COP que recibe el usuario = DOMIs * Peg_Actual (si el peg subio, el usuario retira MAS COP del que metio).

---

## 5. Flujo Operativo: Como Funciona el DOMI en el Marketplace

Los DOMIs no son solo un deposito de valor. Son el combustible operativo del marketplace:

- Tienda: Compra DOMIs con COP para operar. Paga comision por cada pedido aceptado (store_fixed_fee_cop / peg_actual = N DOMI de comision).
- Repartidor: Deposita DOMIs como garantia/fianza. Paga comision al aceptar pedido (driver_fixed_fee_domi). Recupera su saldo con los domicilios.
- Cliente: Paga pedido con DOMIs de su billetera. Recibe cashback en DOMIs (ruleta de karma).
- Sistema: Recibe comisiones en balance_utility. Reinvierte utilidades en la reserva bancaria para generar rendimiento adicional que potencia futuros ajustes de peg.

---

## 6. Gobernanza del Peg y Transparencia

### 6.1 Tabla domi_peg_history

Cada vez que el peg cambia, se registra:
- Peg anterior vs nuevo peg.
- Rendimiento certificado que lo justifica (FK a domi_yield_declarations).
- Hash de integridad del nuevo estado del token.
- Fecha y administrador que lo ejecuto.

### 6.2 Tabla domi_yield_declarations

Registro de los rendimientos bancarios declarados:
- Monto del rendimiento en COP.
- Periodo cubierto (fecha inicio, fecha fin).
- Entidad bancaria y numero de certificacion.
- Estado (pendiente, verificado, rechazado).
- FK al ajuste de peg resultante (si fue aprobado).

---

## 7. Reglas de Proteccion Anti-Abusos

1. Anti-Ballenas: Billeteras tier = standard tienen un tope maximo de saldo (max_balance_domi). Superar el limite requiere aprobacion explicita de gerencia.
2. Idempotencia de Mint: El campo payment_ref es unico. Un mismo pago nunca genera dos acunaciones.
3. Inmutabilidad del Ledger: La tabla domi_ledger no admite UPDATE ni DELETE (trigger de proteccion). Todo se encadena via hash SHA-256.
4. Script Lua Atomico: El cobro de comisiones usa un script Lua en Redis para prevenir condiciones de carrera y doble gasto.
5. Retiros Suspendibles: El boton global withdrawals_enabled puede suspender todos los retiros en segundos ante cualquier anomalia.

---

## 8. Vision Futura: El DOMI como Ecosistema de Valor

El DOMI esta disenado para crecer organicamente:

- Fase 1 (Actual): Peg fijo de 400 COP. El DOMI funciona como dinero electronico de conveniencia dentro del marketplace.
- Fase 2 (Rendimiento Bancario): El primer ajuste de peg ocurre cuando la reserva genera suficiente rendimiento certificado. Los usuarios notan que sus DOMIs valen mas sin hacer nada.
- Fase 3 (Ecosistema Expandido): El DOMI se convierte en el medio de pago preferido porque es mas estable que el COP (al nunca bajar) y genera rendimiento pasivo.
- Fase 4 (Transparencia Publica): El ratio de colateralizacion y el historial de ajustes de peg se publican en tiempo real. El DOMI se convierte en un activo de confianza certificado.
