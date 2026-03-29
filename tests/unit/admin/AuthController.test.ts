import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthController,
  MIN_ADMIN_TRUST,
  TOKEN_EXPIRY_SECONDS,
  type PlayerCredentials,
  type CredentialLookupFn,
} from '../../../src/admin/AuthController.js';

// =============================================================================
// Helpers
// =============================================================================

const TEST_SECRET = 'test-jwt-secret-key-for-vitest';

async function makeHash(password: string): Promise<string> {
  return AuthController.hashPassword(password);
}

function makeLookup(credentials: Record<string, PlayerCredentials>): CredentialLookupFn {
  return async (name: string) => {
    const key = name.toLowerCase();
    for (const [k, v] of Object.entries(credentials)) {
      if (k.toLowerCase() === key) return v;
    }
    return null;
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AuthController', () => {
  let auth: AuthController;
  let hash: string;

  beforeEach(async () => {
    hash = await makeHash('secret123');
    const lookup = makeLookup({
      'Gandalf': { name: 'Gandalf', passwordHash: hash, trust: 60, level: 60 },
      'Frodo': { name: 'Frodo', passwordHash: hash, trust: 0, level: 10 },
      'Elrond': { name: 'Elrond', passwordHash: hash, trust: 51, level: 40 },
    });
    auth = new AuthController(TEST_SECRET, lookup);
  });

  // ===========================================================================
  // login
  // ===========================================================================

  describe('login', () => {
    it('should return a JWT token for valid immortal credentials', async () => {
      const token = await auth.login('Gandalf', 'secret123');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should return null for non-existent player', async () => {
      const token = await auth.login('Nobody', 'secret123');
      expect(token).toBeNull();
    });

    it('should return null for wrong password', async () => {
      const token = await auth.login('Gandalf', 'wrongpass');
      expect(token).toBeNull();
    });

    it('should return null for mortal player (trust < 51)', async () => {
      const token = await auth.login('Frodo', 'secret123');
      expect(token).toBeNull();
    });

    it('should accept player at exact MIN_ADMIN_TRUST (51)', async () => {
      const token = await auth.login('Elrond', 'secret123');
      expect(token).toBeTruthy();
    });

    it('should return null for empty name', async () => {
      const token = await auth.login('', 'secret123');
      expect(token).toBeNull();
    });

    it('should return null for empty password', async () => {
      const token = await auth.login('Gandalf', '');
      expect(token).toBeNull();
    });

    it('should use max of trust and level for effective trust', async () => {
      // Elrond: trust=51, level=40. Effective = max(51,40) = 51 >= 51 ✓
      const token = await auth.login('Elrond', 'secret123');
      expect(token).toBeTruthy();
    });
  });

  // ===========================================================================
  // verifyToken
  // ===========================================================================

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', async () => {
      const token = await auth.login('Gandalf', 'secret123');
      expect(token).toBeTruthy();

      const payload = auth.verifyToken(token!);
      expect(payload).not.toBeNull();
      expect(payload!.name).toBe('Gandalf');
      expect(payload!.trust).toBe(60);
    });

    it('should return null for empty token', () => {
      expect(auth.verifyToken('')).toBeNull();
    });

    it('should return null for invalid token', () => {
      expect(auth.verifyToken('not.a.valid.token')).toBeNull();
    });

    it('should return null for token signed with wrong secret', async () => {
      // Create a token with a different auth controller (different secret)
      const otherAuth = new AuthController('different-secret', makeLookup({
        'Gandalf': { name: 'Gandalf', passwordHash: hash, trust: 60, level: 60 },
      }));
      const token = await otherAuth.login('Gandalf', 'secret123');
      expect(token).toBeTruthy();

      // Verify with the original controller (different secret)
      const payload = auth.verifyToken(token!);
      expect(payload).toBeNull();
    });

    it('should include iat and exp in payload', async () => {
      const token = await auth.login('Gandalf', 'secret123');
      const payload = auth.verifyToken(token!);
      expect(payload).not.toBeNull();
      expect(payload!.iat).toBeTypeOf('number');
      expect(payload!.exp).toBeTypeOf('number');
      expect(payload!.exp! - payload!.iat!).toBe(TOKEN_EXPIRY_SECONDS);
    });
  });

  // ===========================================================================
  // Static methods
  // ===========================================================================

  describe('hashPassword', () => {
    it('should produce a bcrypt hash', async () => {
      const hashed = await AuthController.hashPassword('mypassword');
      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe('mypassword');
      expect(hashed.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should produce different hashes for same input (salted)', async () => {
      const h1 = await AuthController.hashPassword('same');
      const h2 = await AuthController.hashPassword('same');
      expect(h1).not.toBe(h2); // Different salts
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hashed = await AuthController.hashPassword('test');
      expect(await AuthController.comparePassword('test', hashed)).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hashed = await AuthController.hashPassword('test');
      expect(await AuthController.comparePassword('wrong', hashed)).toBe(false);
    });
  });

  // ===========================================================================
  // Constants
  // ===========================================================================

  describe('constants', () => {
    it('MIN_ADMIN_TRUST should be 51', () => {
      expect(MIN_ADMIN_TRUST).toBe(51);
    });

    it('TOKEN_EXPIRY_SECONDS should be 24 hours', () => {
      expect(TOKEN_EXPIRY_SECONDS).toBe(86400);
    });
  });
});
