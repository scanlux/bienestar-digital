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
      overflow: hidden;
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
      max-width: 420px;
      background: rgba(15, 15, 15, 0.6);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      padding: 3rem;
      border-radius: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
      z-index: 1;
      margin: auto 0;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      margin-bottom: 2rem;
      text-align: center;
    }
    .title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.9rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      margin-left: 0.25rem;
    }
    input {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1rem 1.25rem;
      border-radius: 1rem;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.3s ease;
    }
    input:focus {
      border-color: var(--emerald);
      background: rgba(72, 214, 76, 0.02);
      box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
    }
    input::placeholder {
      color: rgba(255, 255, 255, 0.15);
    }
    .submit-btn {
      margin-top: 1rem;
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
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 0.8rem 1rem;
      border-radius: 0.8rem;
      font-size: 0.85rem;
      text-align: center;
      margin-bottom: 1rem;
    }
    .footer-quote {
      text-align: center;
      color: #6b7280;
      font-size: 0.88rem;
      font-style: italic;
      z-index: 1;
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
      <h1 class="title">Iniciar Sesión</h1>
      <p class="subtitle">Acceso seguro al Explorador Dataset NLP</p>
    </div>
    ${errorMsg ? `<div class="error-msg">${errorMsg}</div>` : ''}
    <form action="/expl/login" method="POST">
      <div class="input-wrapper">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" placeholder="Olmedo" required autofocus />
      </div>
      <div class="input-wrapper">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" placeholder="••••••••••••" required />
      </div>
      <button type="submit" class="submit-btn">Ingresar →</button>
    </form>
  </div>
  <div class="footer-quote">
    &quot;La justicia y la injusticia son meras palabras; lo que para uno es crimen, para otro es virtud.&quot; <span>— Marco Aurelio</span>
  </div>
</body>
</html>`;
};

module.exports = {
  renderExplLoginPage
};
