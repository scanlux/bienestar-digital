const axios = require('axios');

async function main() {
  const API_URL = 'http://127.0.0.1:4000';
  const email = 'admin_commerce_1@trendy.sytes.net';
  const password = 'admin123';

  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { token, user } = loginRes.data;
    console.log('Logged in successfully.');
    
    const headers = { Authorization: `Bearer ${token}` };
    const commerceId = user.commerceId;

    // Test GET /api/manage/menus/:commerceId
    try {
      console.log(`Testing GET /api/manage/menus/${commerceId}...`);
      const res = await axios.get(`${API_URL}/api/manage/menus/${commerceId}`, { headers });
      console.log('menus success. Count:', res.data.length);
    } catch (e) {
      console.error('menus failed:', e.response?.status, e.response?.data);
    }

    // Test GET /api/manage/categorias/:menuId
    try {
      console.log(`Testing GET /api/manage/categorias/1...`);
      const res = await axios.get(`${API_URL}/api/manage/categorias/1`, { headers });
      console.log('categorias success. Count:', res.data.length);
    } catch (e) {
      console.error('categorias failed:', e.response?.status, e.response?.data);
    }

    // Test GET /api/manage/products?commerceId=...
    try {
      console.log(`Testing GET /api/manage/products?commerceId=${commerceId}...`);
      const res = await axios.get(`${API_URL}/api/manage/products?commerceId=${commerceId}`, { headers });
      console.log('products success. Count:', res.data.length);
    } catch (e) {
      console.error('products failed:', e.response?.status, e.response?.data);
    }

  } catch (error) {
    console.error('Failure:', error.response?.status, error.response?.data || error.message);
  }
}

main();
