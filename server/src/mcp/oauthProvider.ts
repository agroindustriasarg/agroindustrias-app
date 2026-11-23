// @ts-nocheck
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { generateMcpToken, verifyMcpToken } from '../utils/jwt.js';
import { generateAuthCode, storeAuthCode, peekAuthCode, consumeAuthCode } from './authCodes.js';
import { renderLoginPage } from './loginPage.js';

const SCOPE = 'mcp:read';

// clientsStore: respaldado por la tabla mcp_clients (Dynamic Client Registration).
// Claude se registra una sola vez y reutiliza ese client_id en cada login futuro.
const clientsStore = {
  async getClient(clientId) {
    const row = await prisma.mcpClient.findUnique({ where: { id: clientId } });
    return row ? row.data : undefined;
  },
  async registerClient(clientMetadata) {
    const clientId = `mcp_client_${crypto.randomUUID()}`;
    const clientInfo = {
      ...clientMetadata,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    await prisma.mcpClient.create({ data: { id: clientId, data: clientInfo } });
    return clientInfo;
  },
};

export const agroindustriasOAuthProvider = {
  clientsStore,

  // Muestra el formulario de login. El POST real lo maneja server/src/mcp/route.ts
  // en una ruta aparte (/mcp/login), no esta función.
  async authorize(client, params, res: Response) {
    res.send(
      renderLoginPage({
        clientId: client.client_id,
        clientName: client.client_name,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        state: params.state,
        scope: (params.scopes || [SCOPE]).join(' '),
      })
    );
  },

  async challengeForAuthorizationCode(_client, authorizationCode) {
    const stored = peekAuthCode(authorizationCode);
    if (!stored) {
      throw new Error('Código de autorización inválido o expirado');
    }
    return stored.codeChallenge;
  },

  async exchangeAuthorizationCode(client, authorizationCode) {
    const stored = consumeAuthCode(authorizationCode);
    if (!stored || stored.clientId !== client.client_id) {
      throw new Error('Código de autorización inválido o expirado');
    }

    const accessToken = generateMcpToken({
      type: 'mcp_access',
      userId: stored.userId,
      usuario: stored.usuario,
      clientId: stored.clientId,
      scope: stored.scope,
    });

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 30 * 24 * 60 * 60,
      scope: stored.scope,
    };
  },

  // No se implementa refresh token en esta etapa: si el access token expira
  // (30 días), se vuelve a autorizar desde Claude.
  async exchangeRefreshToken() {
    throw new Error('Refresh token no soportado');
  },

  async verifyAccessToken(token) {
    const decoded = verifyMcpToken(token);
    return {
      token,
      clientId: decoded.clientId,
      scopes: decoded.scope.split(' '),
      expiresAt: decoded.exp,
    };
  },
};

// Verifica usuario/contraseña contra la tabla usuarios real (mismo chequeo que authController.ts)
// y, si es válido, genera el código de autorización y arma la URL de redirect hacia Claude.
export async function verificarLoginYGenerarRedirect({
  usuario,
  password,
  clientId,
  redirectUri,
  codeChallenge,
  state,
  scope,
}: {
  usuario: string;
  password: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scope: string;
}): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { usuario } });
  if (!user || !user.activo) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }

  const passwordValida = await bcrypt.compare(password, user.password);
  if (!passwordValida) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }

  const code = generateAuthCode();
  storeAuthCode(code, {
    clientId,
    userId: user.id,
    usuario: user.usuario,
    codeChallenge,
    redirectUri,
    scope,
  });

  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);

  return { ok: true, redirectUrl: url.toString() };
}
