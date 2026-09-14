import { createRateLimiter, fetchJson } from "@/core/http";
import { requireEnv } from "@/env";

// helius free tier allows 10 requests a second
const throttle = createRateLimiter(110);

/** getMultipleAccounts caps out at 100 addresses per call. */
export const MAX_ACCOUNTS_PER_CALL = 100;

export interface ParsedExtension {
  extension: string;
  state: Record<string, unknown>;
}

export interface ParsedMint {
  decimals: number;
  supply: string;
  extensions?: ParsedExtension[];
}

interface RpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

interface AccountValue {
  data?: { parsed?: { info?: ParsedMint; type?: string } };
  owner?: string;
}

function endpoint(): string {
  return `https://mainnet.helius-rpc.com/?api-key=${requireEnv("HELIUS_API_KEY")}`;
}

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  await throttle();
  const response = await fetchJson<RpcResponse<T>>(endpoint(), {
    method: "POST",
    body: { jsonrpc: "2.0", id: 1, method, params },
    timeoutMs: 30_000,
  });

  if (response.error) throw new Error(`RPC ${method}: ${response.error.message}`);
  if (response.result === undefined) throw new Error(`RPC ${method}: empty result`);
  return response.result;
}

/** Fetches parsed mint accounts, preserving input order. Unknown or missing mints come back null. */
export async function getParsedMints(
  addresses: readonly string[],
): Promise<Map<string, ParsedMint>> {
  const out = new Map<string, ParsedMint>();

  for (let i = 0; i < addresses.length; i += MAX_ACCOUNTS_PER_CALL) {
    const batch = addresses.slice(i, i + MAX_ACCOUNTS_PER_CALL);
    const result = await rpc<{ value: (AccountValue | null)[] }>("getMultipleAccounts", [
      batch,
      { encoding: "jsonParsed" },
    ]);

    result.value.forEach((account, index) => {
      const address = batch[index];
      const info = account?.data?.parsed?.info;
      if (address && info && typeof info.decimals === "number") out.set(address, info);
    });
  }

  return out;
}
