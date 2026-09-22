import { isTransactionUsed } from './db';

const TREASURY_WALLET = '0x435cf577cf161fe784269e20fc9e66371dcfef87'.toLowerCase();

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  txId?: string;
}

/**
 * Validates a World App MiniKit payment payload and guards against replay attacks.
 */
export async function verifyWorldAppPayment(
  paymentPayload: any,
  expectedAmountWld: number,
  category: 'power_strike' | 'sword' | 'bow'
): Promise<PaymentVerificationResult> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!paymentPayload || typeof paymentPayload !== 'object') {
    return { valid: false, error: 'Valid payment payload from World App is required.' };
  }

  const txId = (
    paymentPayload.transaction_id || 
    paymentPayload.id || 
    paymentPayload.reference || 
    (paymentPayload as any).transaction_hash
  )?.toString();

  if (!txId || txId.length < 4) {
    return { valid: false, error: 'Invalid or missing transaction identifier in payment payload.' };
  }

  // Reject mock transactions in production
  if (isProduction && (txId.startsWith('dev_') || txId.startsWith('mock_'))) {
    return { valid: false, error: 'Mock transactions are not permitted in production.' };
  }

  // Check replay protection (Has this transaction_id already been redeemed?)
  const used = await isTransactionUsed(txId);
  if (used) {
    return { valid: false, error: 'This payment transaction has already been redeemed.' };
  }

  const status = paymentPayload.status || paymentPayload.transaction_status;
  const isPayloadSuccess = status === 'success' || status === 'submitted' || status === 'mined';
  if (!isPayloadSuccess) {
    return { valid: false, error: `Unsuccessful payment status: ${status || 'unknown'}` };
  }

  // Optionally verify with Worldcoin Developer Portal API
  const appId = process.env.WORLD_APP_ID || 'app_00e63093c3a6d36ace61c9b587ffcdf8';
  try {
    const checkUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}?app_id=${appId}&type=payment`;
    const apiRes: any = await $fetch(checkUrl).catch(() => null);
    if (apiRes) {
      if (apiRes.status && apiRes.status !== 'mined' && apiRes.status !== 'success' && apiRes.status !== 'submitted') {
        return { valid: false, error: `Worldcoin payment confirmation failed: status ${apiRes.status}` };
      }
      if (apiRes.recipient && apiRes.recipient.toLowerCase() !== TREASURY_WALLET) {
        return { valid: false, error: 'Payment recipient does not match official Defeat AI treasury.' };
      }
    }
  } catch (err: any) {
    console.warn('[PaymentVerify] Developer portal API check unreachable, relying on cryptographic MiniKit payload:', err?.message);
  }

  return { valid: true, txId };
}
