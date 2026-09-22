import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { worldchain } from 'viem/chains';

const DISTRIBUTOR_ADDRESS = '0x91E058c066072cFC722C057b25eF514fe4dA17E5' as const;

const DISTRIBUTOR_ABI = parseAbi([
  'function distributeReward(address recipient, uint256 amount) external',
  'function trustedSigner() view returns (address)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function playerDailyLimit() view returns (uint256)',
  'function globalDailyLimit() view returns (uint256)'
]);

export interface OnChainDistributionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: string;
  worldscanUrl?: string;
}

/**
 * Distributes real ERC-20 $DEF tokens from DefeatAiDistributor contract to player on World Chain.
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

    // Execute direct on-chain distribution from contract to recipient
    const hash = await walletClient.writeContract({
      address: DISTRIBUTOR_ADDRESS,
      abi: DISTRIBUTOR_ABI,
      functionName: 'distributeReward',
      args: [recipientAddress as `0x${string}`, amountWei]
    });

    console.log(`[OnChain Payout] Successfully sent ${tokenAmount} $DEF to ${recipientAddress}. Tx: ${hash}`);

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
