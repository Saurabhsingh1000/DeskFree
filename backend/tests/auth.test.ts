import { signToken, verifyToken } from '../src/lib/jwt';
import { hashPassword, comparePassword } from '../src/lib/bcrypt';

describe('Auth Utilities', () => {
  describe('JWT Token Handling', () => {
    it('should sign and accurately verify a JWT token payload', () => {
      const payload = {
        userId: 'test-user-id-123',
        email: 'student@deskfree.test',
        role: 'STUDENT',
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw an error for an invalid or tempered token', () => {
      expect(() => {
        verifyToken('invalid.token.signature');
      }).toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password and correctly verify password match', async () => {
      const plainPassword = 'SuperSecurePassword123!';
      const hash = await hashPassword(plainPassword);

      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

      const isMatch = await comparePassword(plainPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await comparePassword('WrongPassword', hash);
      expect(isWrongMatch).toBe(false);
    });
  });
});
