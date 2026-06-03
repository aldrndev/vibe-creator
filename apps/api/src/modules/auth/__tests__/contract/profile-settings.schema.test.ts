import { describe, expect, it } from 'vitest';
import { changePasswordRequestSchema, updateProfileRequestSchema } from '../../auth.schemas';

describe('auth profile settings schemas', () => {
  describe('updateProfileRequestSchema', () => {
    it('accepts a valid display name', () => {
      const result = updateProfileRequestSchema.parse({ name: 'Alden Creator' });

      expect(result.name).toBe('Alden Creator');
    });

    it('trims the display name before validation', () => {
      const result = updateProfileRequestSchema.parse({ name: '  Alden  ' });

      expect(result.name).toBe('Alden');
    });

    it('rejects empty or too long names', () => {
      expect(() => updateProfileRequestSchema.parse({ name: '   ' })).toThrow();
      expect(() => updateProfileRequestSchema.parse({ name: 'a'.repeat(81) })).toThrow();
    });

    it('rejects unknown profile fields', () => {
      expect(() => updateProfileRequestSchema.parse({ name: 'Alden', role: 'ADMIN' })).toThrow();
    });
  });

  describe('changePasswordRequestSchema', () => {
    const validPayload = {
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    };

    it('accepts a valid password change payload', () => {
      expect(() => changePasswordRequestSchema.parse(validPayload)).not.toThrow();
    });

    it('requires the current password', () => {
      expect(() =>
        changePasswordRequestSchema.parse({ ...validPayload, currentPassword: '' }),
      ).toThrow('Password saat ini wajib diisi');
    });

    it('requires an 8 character new password', () => {
      expect(() =>
        changePasswordRequestSchema.parse({ ...validPayload, newPassword: 'short' }),
      ).toThrow('Password baru minimal 8 karakter');
    });

    it('requires matching confirmation', () => {
      expect(() =>
        changePasswordRequestSchema.parse({
          ...validPayload,
          confirmPassword: 'different-password',
        }),
      ).toThrow('Konfirmasi password tidak sama');
    });
  });
});
