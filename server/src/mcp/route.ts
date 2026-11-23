// @ts-nocheck
import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { agroindustriasOAuthProvider, verificarLoginYGenerarRedirect } from './oauthProvider.js';
import { renderLoginPage } from './loginPage.js';
import { crearMcpServer } from './tools.js';

const BASE_URL = new URL(process.env.MCP_BASE_URL || 'https://agroindustrias-app.onrender.com');
const MCP_RESOURCE_URL = new URL('/mcp', BASE_URL);

export function construirRouterMcp() {
  const router = Router();

  // Rutas estándar de OAuth (metadata, /authorize, /token, /register) — deben vivir en la raíz.
  router.use(
    mcpAuthRouter({
      provider: agroindustriasOAuthProvider,
      issuerUrl: BASE_URL,
      scopesSupported: ['mcp:read'],
      resourceServerUrl: MCP_RESOURCE_URL,
    })
  );

  // Procesa el formulario de login que arma oauthProvider.authorize().
  router.post('/mcp/login', async (req, res) => {
    const { usuario, password, client_id, redirect_uri, code_challenge, state, scope } = req.body;

    const resultado = await verificarLoginYGenerarRedirect({
      usuario,
      password,
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      state,
      scope: scope || 'mcp:read',
    });

    if (!resultado.ok) {
      res.status(401).send(
        renderLoginPage({
          clientId: client_id,
          redirectUri: redirect_uri,
          codeChallenge: code_challenge,
          state,
          scope: scope || 'mcp:read',
          error: resultado.error,
        })
      );
      return;
    }

    res.redirect(resultado.redirectUrl);
  });

  // Transporte Streamable HTTP, con sesiones en memoria (una por conexión de Claude).
  const transports = new Map();

  router.all(
    '/mcp',
    requireBearerAuth({
      verifier: agroindustriasOAuthProvider,
      requiredScopes: ['mcp:read'],
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(MCP_RESOURCE_URL),
    }),
    async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      let transport;

      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId);
      } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => transports.set(sid, transport),
        });
        transport.onclose = () => {
          if (transport.sessionId) transports.delete(transport.sessionId);
        };
        const server = crearMcpServer();
        await server.connect(transport);
      } else {
        res.status(400).json({ error: 'Sesión MCP inválida o inexistente' });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    }
  );

  return router;
}
