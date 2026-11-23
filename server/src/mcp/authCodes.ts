// Códigos de autorización de un solo uso, de corta duración (~60s).
// Viven en memoria del proceso: si el server reinicia a mitad de un login,
// el usuario simplemente reintenta desde Claude. No hace falta persistirlos.

interface StoredAuthCode {
  clientId: string;
  userId: string;
  usuario: string;
  codeChallenge: string;
  redirectUri: string;
  scope: string;
}

const CODE_TTL_MS = 60_000;
const codes = new Map<string, StoredAuthCode>();

export function generateAuthCode(): string {
  return `mcp_code_${crypto.randomUUID()}`;
}

export function storeAuthCode(code: string, data: StoredAuthCode): void {
  codes.set(code, data);
  setTimeout(() => codes.delete(code), CODE_TTL_MS).unref();
}

export function peekAuthCode(code: string): StoredAuthCode | undefined {
  return codes.get(code);
}

export function consumeAuthCode(code: string): StoredAuthCode | undefined {
  const data = codes.get(code);
  if (data) codes.delete(code);
  return data;
}
