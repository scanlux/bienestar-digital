async function main() {
  const email = 'admin_commerce_1@trendy.sytes.net';
  const password = 'admin123';
  console.log(`Sending HTTP POST to http://127.0.0.1:4000/api/auth/login for ${email}`);
  
  try {
    const response = await fetch('http://127.0.0.1:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const body = await response.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('HTTP request failed:', error);
  }
  process.exit(0);
}

main();
