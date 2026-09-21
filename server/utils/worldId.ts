import { verifyCloudProof } from '@worldcoin/minikit-js';

export interface WorldIdProofPayload {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
  is_test_mock?: boolean;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  nullifierHash?: string;
  verificationLevel?: string;
  details?: any;
}

/**
 * Verifies a World ID ZK-SNARK proof with the Worldcoin developer verify endpoint.
 * Ensures that only verified humans (Orb level) can claim strikes and rewards.
 */
export async function verifyWorldIdStrikeProof(
  proofPayload: WorldIdProofPayload | undefined,
  signal: string
): Promise<VerificationResult> {
  const appId = process.env.WORLD_APP_ID || 'app_00e63093c3a6d36ace61c9b587ffcdf8';
  const action = process.env.WORLD_ACTION || 'daily-strike';
  const isProduction = process.env.NODE_ENV === 'production';

  // Anti-Cheat: Require full proof payload
  if (!proofPayload || typeof proofPayload !== 'object') {
    return {
      valid: false,
      error: 'World ID ZK proof required. Direct API/curl access is strictly prohibited.'
    };
  }

  const { proof, merkle_root, nullifier_hash, verification_level, is_test_mock } = proofPayload;

  // Anti-Cheat: Reject test mocks in production unconditionally
  if (isProduction && is_test_mock) {
    return {
      valid: false,
      error: 'Test proofs are strictly forbidden in production.'
    };
  }

  // Development fallback for local sandbox testing
  if (!isProduction && is_test_mock) {
    console.warn('[WorldID] Dev mode test mock accepted for nullifier:', nullifier_hash);
    return {
      valid: true,
      nullifierHash: nullifier_hash || `mock_human_${signal}`,
      verificationLevel: 'orb'
    };
  }

  // Validate presence of required ZK fields
  if (!proof || !merkle_root || !nullifier_hash) {
    return {
      valid: false,
      error: 'Incomplete World ID proof payload: proof, merkle_root, and nullifier_hash are mandatory.'
    };
  }

  // Requirement: Only Orb-verified humans can strike and claim rewards
  if (verification_level !== 'orb') {
    return {
      valid: false,
      error: 'Orb verification required. Device-level or unverified accounts cannot claim daily rewards.'
    };
  }

  try {
    const verifyResult = await verifyCloudProof(
      {
        proof,
        merkle_root,
        nullifier_hash,
        verification_level
      },
      appId as `app_${string}`,
      action,
      signal
    );

    if (!verifyResult.success) {
      console.warn('[WorldID] Proof rejected by Worldcoin API:', verifyResult);
      return {
        valid: false,
        error: 'World ID proof rejected by Worldcoin network.',
        details: verifyResult
      };
    }

    return {
      valid: true,
      nullifierHash: nullifier_hash,
      verificationLevel: verification_level
    };
  } catch (err: any) {
    console.error('[WorldID] Verification network error:', err);
    return {
      valid: false,
      error: `World ID verification service error: ${err.message || 'unknown'}`
    };
  }
}
