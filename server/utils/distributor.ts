import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { worldchain } from 'viem/chains';

export const DISTRIBUTOR_ADDRESS = '0x91E058c066072cFC722C057b25eF514fe4dA17E5' as const;

export const EIP712_DOMAIN = {
  name: 'DefeatAiDistributor',
  version: '1',
  chainId: 480,
  verifyingContract: DISTRIBUTOR_ADDRESS
} as const;

export const EIP712_TYPES = {
  ClaimVoucher: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ]
} as const;

export interface ClaimVoucher {
  recipient: `0x${string}`;
  amount: string; // wei as string
  tokenAmount: number;
  nonce: number;
  expiry: number;
  signature: `0x${string}`;
}

export interface OnChainDistributionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: string;
  worldscanUrl?: string;
}

const DEFAULT_SIGNING_KEY = '0x045ec7dc639e0a849e3ff1939cfd371d07b22ddab657b40b8c4c9cab85ca6e75';

export function getSigningKey(): `0x${string}` {
  const pk = process.env.WORLD_SIGNING_PRIVATE_KEY || DEFAULT_SIGNING_KEY;
  return (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
}

/**
 * Generates an EIP-712 cryptographic voucher for a player to claim $DEF via World App (Variant B - Free gas for game server)
 */
export async function generateClaimVoucher(
  recipientAddress: string,
  tokenAmount: number = 20,
  nonce?: number | bigint | string,
  expiryMinutes: number = 60
): Promise<{ success: boolean; voucher?: ClaimVoucher; error?: string }> {
  if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
    return { success: false, error: 'Invalid recipient wallet address format.' };
  }

  const effectiveNonce = nonce !== undefined && nonce !== null
    ? BigInt(nonce) 
    : (BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000)));
  const formattedPk = getSigningKey();

  try {
    const account = privateKeyToAccount(formattedPk);

    const amountWei = parseEther(tokenAmount.toString());
    const expiry = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    const signature = await account.signTypedData({
      domain: EIP712_DOMAIN,
      types: EIP712_TYPES,
      primaryType: 'ClaimVoucher',
      message: {
        recipient: recipientAddress as `0x${string}`,
        amount: amountWei,
        nonce: effectiveNonce,
        expiry: BigInt(expiry)
      }
    });

    console.log(`[EIP712 Voucher] Generated voucher for ${recipientAddress}: ${tokenAmount} $DEF, nonce: ${effectiveNonce}`);

    return {
      success: true,
      voucher: {
        recipient: recipientAddress as `0x${string}`,
        amount: amountWei.toString(),
        tokenAmount,
        nonce: effectiveNonce.toString(),
        expiry,
        signature
      }
    };
  } catch (err: any) {
    console.error('[Generate Voucher Error]:', err);
    return { success: false, error: err.shortMessage || err.message };
  }
}

/**
 * Distributes real ERC-20 $DEF tokens from DefeatAiDistributor contract to player on World Chain directly (Variant A fallback).
 */
export async function distributeDefRewardOnChain(
  recipientAddress: string,
  tokenAmount: number = 20
): Promise<OnChainDistributionResult> {
  if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
    return {
      success: false,
      error: 'Invalid recipient wallet address format.'
    };
  }

  const formattedPk = getSigningKey();

  try {
    const account = privateKeyToAccount(formattedPk);

    const publicClient = createPublicClient({
      chain: worldchain,
      transport: http('https://worldchain-mainnet.g.alchemy.com/public')
    });

    const walletClient = createWalletClient({
      account,
      chain: worldchain,
      transport: http('https://worldchain-mainnet.g.alchemy.com/public')
    });

    const amountWei = parseEther(tokenAmount.toString());

    const hash = await walletClient.writeContract({
      address: DISTRIBUTOR_ADDRESS,
      abi: parseAbi(['function distributeReward(address recipient, uint256 amount) external']),
      functionName: 'distributeReward',
      args: [recipientAddress as `0x${string}`, amountWei]
    });

    console.log(`[OnChain Payout] Sent ${tokenAmount} $DEF to ${recipientAddress}. Tx: ${hash}`);

    return {
      success: true,
      txHash: hash,
      worldscanUrl: `https://worldscan.org/tx/${hash}`
    };
  } catch (err: any) {
    console.warn('[OnChain Distributor Warning]:', err.shortMessage || err.message);
    return {
      success: false,
      error: err.shortMessage || err.message || 'On-chain distribution failed',
      details: err.details || undefined
    };
  }
}

/**
 * Reads claimed $DEF tokens for a recipient today directly from DefeatAiDistributor smart contract.
 */
export async function getOnChainClaimedToday(walletAddress: string): Promise<number> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return 0;
  }
  try {
    const client = createPublicClient({
      chain: worldchain,
      transport: http('https://worldchain-mainnet.g.alchemy.com/public')
    });
    const currentDay = BigInt(Math.floor(Date.now() / 1000 / 86400));
    const claimedWei = await client.readContract({
      address: DISTRIBUTOR_ADDRESS,
      abi: parseAbi(['function playerClaimedInDay(address, uint256) view returns (uint256)']),
      functionName: 'playerClaimedInDay',
      args: [walletAddress as `0x${string}`, currentDay]
    });
    return Number(claimedWei / (BigInt(10) ** BigInt(18)));
  } catch (err: any) {
    console.warn('[OnChain] Error reading playerClaimedInDay:', err.message);
    return 0;
  }
}
