const axios = require('axios');

async function main() {
  const API_URL = 'http://127.0.0.1:4000';
  const email = 'admin_commerce_1@trendy.sytes.net';
  const password = 'admin123';

  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { token, user } = loginRes.data;
    console.log('Logged in successfully. Token received.');
    console.log('User permissions:', user.permissions);
    
    const headers = { Authorization: `Bearer ${token}` };

    // 2. GET /api/manage/my-stores
    try {
      console.log('Testing GET /api/manage/my-stores...');
      const res = await axios.get(`${API_URL}/api/manage/my-stores`, { headers });
      console.log('my-stores success. Count:', res.data.length);
    } catch (e) {
      console.error('my-stores failed:', e.response?.status, e.response?.data);
    }

    // 3. GET /api/manage/orders
    try {
      console.log('Testing GET /api/manage/orders...');
      const res = await axios.get(`${API_URL}/api/manage/orders`, { headers });
      console.log('orders success. Count:', res.data.length);
    } catch (e) {
      console.error('orders failed:', e.response?.status, e.response?.data);
    }

    // 4. GET /api/manage/products?commerceId=...
    try {
      console.log(`Testing GET /api/manage/products?commerceId=${user.commerceId}...`);
      const res = await axios.get(`${API_URL}/api/manage/products?commerceId=${user.commerceId}`, { headers });
      console.log('products success. Count:', res.data.length);
    } catch (e) {
      console.error('products failed:', e.response?.status, e.response?.data);
    }

  } catch (error) {
    console.error('General failure:', error.response?.status, error.response?.data || error.message);
  }
}

main();
