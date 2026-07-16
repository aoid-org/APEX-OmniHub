/** Pure, runtime-portable authorization helper for the privileged MCP gateway. */
function timingSafeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export function isMcpGatewayAuthorized(req: Request, configuredApiKey: string | undefined): boolean {
  const apiKey = configuredApiKey?.trim();
  if (!apiKey) return false;

  const authorization = req.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    return timingSafeEqual(authorization.slice(7), apiKey);
  }

  const headerKey = req.headers.get('x-api-key');
  return headerKey !== null && timingSafeEqual(headerKey, apiKey);
}

