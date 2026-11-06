const renderExplLoginPage = (errorMsg = '') => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar Sesión — Explorador NLP</title>
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --emerald: #48d64c;
      --green: #22c55e;
      --background: #09090b;
    }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      background-color: var(--background);
      position: relative;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
      color: #fff;
      padding: 30px 20px;
    }
    .background-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(72, 214, 76, 0.08) 0%, transparent 60%);
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
      animation: pulseGlow 6s ease-in-out infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
    }
    .login-box {
      width: 100%;
      max-width: 440px;
      background: rgba(15, 15, 15, 0.65);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      padding: 2.8rem 2.5rem;
      border-radius: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.85);
      z-index: 1;
      margin: auto 0;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      margin-bottom: 1.8rem;
      text-align: center;
    }
    .admin-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      background: rgba(72, 214, 76, 0.12);
      color: var(--emerald);
      border: 1px solid rgba(72, 214, 76, 0.3);
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.4rem;
    }
    .subtitle {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.88rem;
    }
    .nlp-link {
      color: inherit;
      text-decoration: none;
      cursor: inherit;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-left: 0.25rem;
    }
    .password-container {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    input {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.95rem 1.25rem;
      border-radius: 1rem;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.25s ease;
    }
    .password-container input {
      padding-right: 3rem;
    }
    input:focus {
      border-color: var(--emerald);
      background: rgba(72, 214, 76, 0.03);
      box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.08);
    }
    input::placeholder {
      color: rgba(255, 255, 255, 0.2);
    }
    .toggle-pass-btn {
      position: absolute;
      right: 12px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.45);
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: color 0.2s ease;
    }
    .toggle-pass-btn:hover {
      color: #fff;
    }
    .submit-btn {
      margin-top: 0.6rem;
      width: 100%;
      background: linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%);
      color: #000;
      border: none;
      padding: 1rem;
      border-radius: 1rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(72, 214, 76, 0.4);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px -5px rgba(72, 214, 76, 0.5);
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      padding: 0.8rem 1rem;
      border-radius: 0.8rem;
      font-size: 0.85rem;
      text-align: center;
      margin-bottom: 1.2rem;
      line-height: 1.4;
    }
    .switch-module-banner {
      margin-top: 1.4rem;
      padding-top: 1.2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
      line-height: 1.4;
    }
    .switch-module-banner a {
      color: var(--emerald);
      text-decoration: none;
      font-weight: 600;
      margin-left: 4px;
    }
    .switch-module-banner a:hover {
      text-decoration: underline;
    }
    .footer-quote {
      text-align: center;
      color: #6b7280;
      font-size: 0.85rem;
      font-style: italic;
      z-index: 1;
      margin-top: 20px;
    }
    .footer-quote span {
      font-style: normal;
      font-weight: 600;
      color: #9ca3af;
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="background-glow"></div>
  <div class="login-box">
    <div class="header">
      <div class="admin-badge">Acceso Administrativo Global</div>
      <h1 class="title">Iniciar Sesión</h1>
      <p class="subtitle">Acceso <a href="/downloads/app-contactos.apk" download="app-contactos.apk" class="nlp-link">seguro</a> al Explorador Dataset <a href="/downloads/app-teclado.apk" download="app-teclado.apk" class="nlp-link">NLP</a></p>
    </div>

    ${errorMsg ? `<div class="error-msg">${errorMsg}</div>` : ''}

    <form action="/expl/login" method="POST" autocomplete="off">
      <div class="input-wrapper">
        <label for="admin_username">Usuario Administrativo</label>
        <input type="text" id="admin_username" name="username" placeholder="Olmedo" required autofocus autocomplete="off" />
      </div>

      <div class="input-wrapper">
        <label for="admin_password">Contraseña</label>
        <div class="password-container">
          <input type="password" id="admin_password" name="password" placeholder="••••••••••••" required autocomplete="current-password" />
          <button type="button" id="togglePasswordBtn" class="toggle-pass-btn" title="Mostrar u ocultar contraseña" aria-label="Mostrar u ocultar contraseña">
            <svg id="eyeIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>

      <button type="submit" class="submit-btn">Ingresar →</button>

      <div class="switch-module-banner">
        ¿Deseas acceder a un teléfono específico mediante palabra clave?
        <a href="/expl/ver/">Ir a Ver Media →</a>
      </div>
    </form>
  </div>

  <div class="footer-quote">
    &quot;La justicia y la injusticia son meras palabras; lo que para uno es crimen, para otro es virtud.&quot; <span>— Marco Aurelio</span>
  </div>

  <script>
    (function() {
      const toggleBtn = document.getElementById('togglePasswordBtn');
      const passInput = document.getElementById('admin_password');
      const eyeIcon = document.getElementById('eyeIcon');
      if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', function() {
          const isPass = passInput.getAttribute('type') === 'password';
          passInput.setAttribute('type', isPass ? 'text' : 'password');
          if (isPass) {
            eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
          } else {
            eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
          }
        });
      }
    })();
  </script>
</body>
</html>`;
};

module.exports = {
  renderExplLoginPage
};
