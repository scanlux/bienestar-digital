async function main() {
  const email = 'root@trendy.sytes.net';
  const password = 'admin123';
  console.log(`Sending HTTP POST to http://localhost:4000/api/auth/system-login for ${email}`);
  
  try {
    const response = await fetch('http://localhost:4000/api/auth/system-login', {
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
