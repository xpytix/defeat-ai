import { defineEventHandler, getQuery, setResponseStatus } from 'h3';

const DEF_TOKEN_CONTRACT = '0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6';
const RPC_ENDPOINTS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://rpc.worldchain.org',
  'https://worldchain.calderachain.xyz/http'
];

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const address = (query.address as string || '').toLowerCase().trim();

  if (!address || !address.startsWith('0x') || address.length !== 42) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: 'Invalid Ethereum address. Must be 42 characters starting with 0x.'
    };
  }

  // ERC-20 balanceOf(address) -> 0x70a08231 + padded address
  const data = '0x70a08231' + address.slice(2).padStart(64, '0');

  let rawHex: string | null = null;
  let lastError: any = null;

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: DEF_TOKEN_CONTRACT, data }, 'latest']
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) continue;
      const json = await response.json();
      if (json && json.result) {
        rawHex = json.result;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawHex || rawHex === '0x') {
    return {
      success: true,
      address,
      balance: 0,
      formatted: '0',
      raw: '0'
    };
  }

  try {
    const rawBigInt = BigInt(rawHex);
    // 18 decimals
    const balance = Number(rawBigInt) / 1e18;

    let formatted: string;
    if (balance >= 1_000_000_000) {
      formatted = (balance / 1_000_000_000).toFixed(balance % 1_000_000_000 === 0 ? 0 : 2) + 'B';
    } else if (balance >= 1_000_000) {
      formatted = (balance / 1_000_000).toFixed(balance % 1_000_000 === 0 ? 0 : 2) + 'M';
    } else if (balance >= 1_000) {
      formatted = (balance / 1_000).toFixed(balance % 1_000 === 0 ? 0 : 1) + 'k';
    } else {
      formatted = balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    return {
      success: true,
      address,
      contract: DEF_TOKEN_CONTRACT,
      balance,
      formatted,
      raw: rawBigInt.toString()
    };
  } catch (err: any) {
    setResponseStatus(event, 500);
    return {
      success: false,
      error: 'Failed to parse on-chain balance: ' + (err?.message || 'Unknown')
    };
  }
});
