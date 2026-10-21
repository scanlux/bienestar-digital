/**
 * Vista de Login Móvil para el Módulo Multimedia (/expl/ver/login)
 */
function renderVerLoginView({ error = null } = {}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Acceso Multimedia - Ver</title>
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      background: #000000;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .login-container {
      width: 100%;
      max-width: 380px;
      background: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 32px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo-badge {
      width: 68px;
      height: 68px;
      background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
      border-radius: 18px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 2rem;
      margin-bottom: 16px;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
    }
    .app-title {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #f472b6, #c084fc, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }
    .app-subtitle {
      font-size: 0.82rem;
      color: #9ca3af;
      margin-bottom: 26px;
      text-align: center;
    }
    .error-banner {
      width: 100%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.84rem;
      margin-bottom: 18px;
      text-align: center;
    }
    form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .input-group label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-group input {
      width: 100%;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 12px 14px;
      color: #ffffff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-group input:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }
    .btn-submit {
      width: 100%;
      background: linear-gradient(90deg, #ec4899, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 13px;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s, transform 0.1s;
    }
    .btn-submit:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    .footer-note {
      margin-top: 24px;
      font-size: 0.75rem;
      color: #6b7280;
      text-align: center;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo-badge">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    </div>
    <h1 class="app-title">Ver Media</h1>
    <p class="app-subtitle">Visualizador móvil de fotos, videos y audios</p>

    ${error ? `<div class="error-banner">${error}</div>` : ''}

    <form method="POST" action="/expl/ver/login">
      <div class="input-group">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" placeholder="ver_device..." required autofocus autocomplete="username" />
      </div>
      <div class="input-group">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password" />
      </div>
      <button type="submit" class="btn-submit">Ingresar al Feed</button>
    </form>

    <div class="footer-note">
      Las credenciales se generan automáticamente al vincular un teléfono en el ecosistema de telemetría.
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  renderVerLoginView
};
