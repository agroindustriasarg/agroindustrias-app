interface LoginPageParams {
  clientId: string;
  clientName?: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scope: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLoginPage(params: LoginPageParams): string {
  const nombreApp = escapeHtml(params.clientName || 'Claude');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Conectar con Agroindustrias Argentinas SRL</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.08); width: 100%; max-width: 360px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { color: #555; font-size: 14px; margin: 0 0 20px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  input { width: 100%; padding: 10px; margin-bottom: 14px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  button { width: 100%; padding: 10px; background: #16a34a; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
  .error { background: #fef2f2; color: #b91c1c; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Agroindustrias Argentinas SRL</h1>
    <p>${nombreApp} quiere conectarse a tu cuenta (solo lectura)</p>
    ${params.error ? `<div class="error">${escapeHtml(params.error)}</div>` : ''}
    <form method="POST" action="/mcp/login">
      <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}" />
      <input type="hidden" name="state" value="${escapeHtml(params.state || '')}" />
      <input type="hidden" name="scope" value="${escapeHtml(params.scope)}" />
      <label for="usuario">Usuario</label>
      <input id="usuario" name="usuario" autocomplete="username" required />
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Autorizar</button>
    </form>
  </div>
</body>
</html>`;
}
