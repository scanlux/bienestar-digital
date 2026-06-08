const jwt = require('jsonwebtoken');

async function testMerchantLogin() {
  console.log('=== INICIANDO PRUEBA DE LOGIN DE NEGOCIOS (FASE 2) ===');

  const testCases = [
    {
      role: 'commerce',
      email: 'admin_commerce_1@trendy.sytes.net',
      password: 'admin123',
      expectedAdminType: 'commerce'
    },
    {
      role: 'store',
      email: 'admin_store_1@trendy.sytes.net',
      password: 'admin123',
      expectedAdminType: 'store'
    },
    {
      role: 'delivery_company',
      email: 'admin_delivery_1@trendy.sytes.net',
      password: 'admin123',
      expectedAdminType: 'delivery_company'
    }
  ];

  for (const tc of testCases) {
    console.log(`\nProbando login para rol ${tc.role} (${tc.email})...`);
    try {
      const res = await fetch('http://127.0.0.1:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tc.email, password: tc.password })
      });

      const data = await res.json();
      if (res.status === 200 && data.token) {
        console.log(`✔ Login exitoso para ${tc.role}!`);
        const decoded = jwt.decode(data.token);
        console.log(`Payload decodificado para ${tc.role}:`, decoded);

        if (decoded.adminType === tc.expectedAdminType) {
          console.log(`✔ OK: adminType es '${decoded.adminType}' tal como se esperaba.`);
        } else {
          console.error(`❌ ERROR: Se esperaba adminType '${tc.expectedAdminType}', se recibió '${decoded.adminType}'`);
        }

        if (tc.expectedAdminType === 'commerce') {
          if (decoded.commerceId && decoded.storeIds && decoded.storeIds.length > 0) {
            console.log(`✔ OK: commerceId y storeIds (${decoded.storeIds.join(', ')}) presentes.`);
          } else {
            console.error('❌ ERROR: commerceId o storeIds inválidos en comercio');
          }
        } else if (tc.expectedAdminType === 'store') {
          if (decoded.commerceId && decoded.storeIds && decoded.storeIds.length === 1) {
            console.log(`✔ OK: commerceId y el storeId único en storeIds (${decoded.storeIds[0]}) presentes.`);
          } else {
            console.error('❌ ERROR: commerceId o storeIds inválidos en store');
          }
        } else if (tc.expectedAdminType === 'delivery_company') {
          if (decoded.deliveryCompanyId) {
            console.log(`✔ OK: deliveryCompanyId (${decoded.deliveryCompanyId}) presente.`);
          } else {
            console.error('❌ ERROR: deliveryCompanyId ausente en empresa de domicilios');
          }
        }

      } else {
        console.error(`❌ ERROR: Login falló para ${tc.role}. Status:`, res.status, 'Body:', data);
      }
    } catch (error) {
      console.error(`❌ ERROR CRÍTICO durante login de ${tc.role}:`, error.message);
    }
  }
}

testMerchantLogin();
