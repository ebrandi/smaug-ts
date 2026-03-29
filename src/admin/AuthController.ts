/**
 * AuthController – Authentication and session management for the admin API.
 *
 * Handles password hashing (bcrypt), JWT token issuance and validation,
 * and trust-level verification for admin operations.
 * Only players with trust >= LEVEL_NEOPHYTE (51) can access the admin API.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { TRUST_LEVELS } from './TrustLevels.js';
import { Logger } from '../utils/Logger.js';

const LOG_DOMAIN = 'auth';

/** JWT payload shape for admin tokens. */
export interface AdminTokenPayload {
  name: string;
  trust: number;
  iat?: number;
  exp?: number;
}

/** Player credential lookup result. */
export interface PlayerCredentials {
  name: string;
  passwordHash: string;
  trust: number;
  level: number;
}

/**
 * Credential lookup function type — injected to avoid direct Prisma dependency.
 * Returns player credentials if found, or null.
 */
export type CredentialLookupFn = (name: string) => Promise<PlayerCredentials | null>;

/** Minimum trust level required to access the admin API. */
export const MIN_ADMIN_TRUST = TRUST_LEVELS.NEOPHYTE; // 51

/** Default JWT token expiry (24 hours in seconds). */
export const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

/** Number of bcrypt salt rounds for password hashing. */
export const BCRYPT_SALT_ROUNDS = 10;

export class AuthController {
  private readonly jwtSecret: string;
  private readonly logger: Logger | null;
  private readonly lookupCredentials: CredentialLookupFn;

  /**
   * @param jwtSecret - Secret key for signing/verifying JWT tokens
   * @param lookupCredentials - Function to look up player credentials by name
   * @param logger - Optional logger for audit trail
   */
  constructor(
    jwtSecret: string,
    lookupCredentials: CredentialLookupFn,
    logger?: Logger,
  ) {
    this.jwtSecret = jwtSecret;
    this.lookupCredentials = lookupCredentials;
    this.logger = logger ?? null;
  }

  /**
   * Attempt to log in with name and password.
   * Returns a signed JWT token on success, or null on failure.
   *
   * Checks:
   * 1. Player exists
   * 2. Password matches (bcrypt compare)
   * 3. Trust level >= MIN_ADMIN_TRUST (51)
   */
  async login(name: string, password: string): Promise<string | null> {
    if (!name || !password) {
      this.logger?.warn(LOG_DOMAIN, `Login attempt with empty name or password`);
      return null;
    }

    const credentials = await this.lookupCredentials(name);
    if (!credentials) {
      this.logger?.warn(LOG_DOMAIN, `Login failed: player "${name}" not found`);
      return null;
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, credentials.passwordHash);
    if (!passwordMatch) {
      this.logger?.warn(LOG_DOMAIN, `Login failed: wrong password for "${name}"`);
      return null;
    }

    // Check trust level — use max of trust and level (matching Player.getTrust())
    const effectiveTrust = Math.max(credentials.trust, credentials.level);
    if (effectiveTrust < MIN_ADMIN_TRUST) {
      this.logger?.warn(LOG_DOMAIN, `Login failed: trust ${effectiveTrust} < ${MIN_ADMIN_TRUST} for "${name}"`);
      return null;
    }

    // Issue JWT
    const payload: AdminTokenPayload = {
      name: credentials.name,
      trust: effectiveTrust,
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: TOKEN_EXPIRY_SECONDS,
    });

    this.logger?.info(LOG_DOMAIN, `Login successful: "${name}" (trust ${effectiveTrust})`);
    return token;
  }

  /**
   * Verify a JWT token and return the payload, or null if invalid/expired.
   */
  verifyToken(token: string): AdminTokenPayload | null {
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as AdminTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Hash a plaintext password using bcrypt.
   * Used for creating/updating player passwords.
   */
  static async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compare a plaintext password against a bcrypt hash.
   */
  static async comparePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
