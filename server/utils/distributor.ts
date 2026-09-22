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

/**
 * Generates an EIP-712 cryptographic voucher for a player to claim $DEF via World App (Variant B - Free gas for game server)
 */
export async function generateClaimVoucher(
  recipientAddress: string,
  tokenAmount: number = 20,
  nonce: number = 1,
  expiryMinutes: number = 60
): Promise<{ success: boolean; voucher?: ClaimVoucher; error?: string }> {
  if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
    return { success: false, error: 'Invalid recipient wallet address format.' };
  }

  const privateKey = process.env.WORLD_SIGNING_PRIVATE_KEY;
  if (!privateKey) {
    return { success: false, error: 'WORLD_SIGNING_PRIVATE_KEY not configured in environment.' };
  }

  try {
    const formattedPk = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
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
        nonce: BigInt(nonce),
        expiry: BigInt(expiry)
      }
    });

    console.log(`[EIP712 Voucher] Generated voucher for ${recipientAddress}: ${tokenAmount} $DEF, nonce: ${nonce}`);

    return {
      success: true,
      voucher: {
        recipient: recipientAddress as `0x${string}`,
        amount: amountWei.toString(),
        tokenAmount,
        nonce,
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

  const privateKey = process.env.WORLD_SIGNING_PRIVATE_KEY;
  if (!privateKey) {
    return {
      success: false,
      error: 'WORLD_SIGNING_PRIVATE_KEY not configured in environment.'
    };
  }

  try {
    const formattedPk = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
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
