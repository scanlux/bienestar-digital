const axios = require('axios');

/**
 * Servicio de integracion con la API de Wompi Colombia.
 * Maneja dispersiones (pagos salientes a cuentas bancarias verificadas).
 *
 * En entorno sandbox (WOMPI_PRIVATE_KEY sin prefijo prv_prod_),
 * la dispersion es emulada para no consumir creditos reales.
 */
async function triggerDispersion(accountDetails, amountCop, withdrawalId) {
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Configuración de Wompi incompleta: falta WOMPI_PRIVATE_KEY.');
  }

  // Wompi API URL (producción vs sandbox)
  const isProd = privateKey.startsWith('prv_prod_');
  const wompiUrl = isProd 
    ? 'https://production.wompi.co/v1/transfers' 
    : 'https://sandbox.wompi.co/v1/transfers';

  // Si estamos en entorno de desarrollo o sandbox sin llaves reales, podemos emular/mockear
  if (!isProd) {
    console.log(`[WOMPI MOCK] Dispersión emulada para Retiro #${withdrawalId} de $${amountCop} COP a cuenta ${accountDetails.numero_cuenta}`);
    return {
      status: 'APPROVED',
      transferId: `MOCK-TRANSFER-${withdrawalId}-${Date.now()}`
    };
  }

  try {
    const response = await axios.post(
      wompiUrl,
      {
        amount_in_cents: Math.round(amountCop * 100),
        currency: 'COP',
        notes: `Retiro fiduciario DOMI #${withdrawalId}`,
        destination: {
          type: 'BANK_ACCOUNT',
          bank_code: accountDetails.codigo_banco || '1007', // 1007 por defecto para Bancolombia
          account_number: accountDetails.numero_cuenta,
          account_type: accountDetails.tipo_cuenta === 'ahorros' ? 'SAVINGS' : 'CURRENT',
          holder_name: accountDetails.titular,
          holder_document_type: 'CC',
          holder_document_number: accountDetails.documento_cc
        }
      },
      {
        headers: {
          Authorization: `Bearer ${privateKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.data) {
      const data = response.data.data;
      return {
        status: data.status,
        transferId: data.id
      };
    }
    
    throw new Error('Respuesta malformada de Wompi Dispersiones.');
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WOMPI DISPERSION ERROR] Fallo al llamar API de Wompi: ${errorMsg}`);
    throw new Error(`Fallo en Wompi Dispersiones: ${errorMsg}`);
  }
}

module.exports = {
  triggerDispersion
};
