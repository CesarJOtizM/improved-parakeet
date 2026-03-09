import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a valid 32-byte hex key (64 hex chars)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    service = new EncryptionService();
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('Given: a plaintext string When: encrypting and decrypting Then: should return the original string', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('Given: different plaintexts When: encrypting Then: should produce different ciphertexts', () => {
      const encrypted1 = service.encrypt('secret1');
      const encrypted2 = service.encrypt('secret2');
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('Given: same plaintext When: encrypting twice Then: should produce different ciphertexts due to random IV', () => {
      const plaintext = 'same-secret';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
      // But both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('Given: encrypted data format When: examining Then: should have iv:encrypted:authTag format', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      // IV should be 12 bytes = 24 hex chars
      expect(parts[0].length).toBe(24);
    });

    it('Given: tampered ciphertext When: decrypting Then: should throw an error', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the encrypted data
      const tampered = `${parts[0]}:ff${parts[1].substring(2)}:${parts[2]}`;
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('Given: invalid ciphertext format When: decrypting Then: should throw an error', () => {
      expect(() => service.decrypt('invalid-format')).toThrow('Invalid ciphertext format');
    });

    it('Given: empty string When: encrypting and decrypting Then: should handle empty string', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('Given: special characters When: encrypting and decrypting Then: should handle them correctly', () => {
      const plaintext = '!@#$%^&*()_+-={}[]|:;"<>?,./~`';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('Given: unicode text When: encrypting and decrypting Then: should handle unicode', () => {
      const plaintext = 'Contraseña: 密码 パスワード';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('key validation', () => {
    it('Given: no ENCRYPTION_KEY When: encrypting Then: should throw an error', () => {
      delete process.env.ENCRYPTION_KEY;
      const svc = new EncryptionService();
      expect(() => svc.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
      );
    });

    it('Given: short ENCRYPTION_KEY When: encrypting Then: should throw an error', () => {
      process.env.ENCRYPTION_KEY = 'short';
      const svc = new EncryptionService();
      expect(() => svc.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
      );
    });
  });
});
