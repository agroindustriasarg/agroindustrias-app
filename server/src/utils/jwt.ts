// @ts-nocheck
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  usuario: string;
  rol: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

// Tokens del conector MCP (Claude) — separados de los tokens de login normales
// para que uno nunca pueda usarse como el otro.
export interface McpTokenPayload {
  type: 'mcp_access';
  userId: string;
  usuario: string;
  clientId: string;
  scope: string;
}

export interface McpTokenPayloadDecoded extends McpTokenPayload {
  exp: number;
}

export const generateMcpToken = (payload: McpTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

export const verifyMcpToken = (token: string): McpTokenPayloadDecoded => {
  const decoded = jwt.verify(token, JWT_SECRET) as McpTokenPayloadDecoded;
  if (decoded.type !== 'mcp_access') {
    throw new Error('Token no es un token de acceso MCP');
  }
  return decoded;
};
