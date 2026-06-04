import { describe, expect, it } from 'vitest';
import { loginFormSchema, registerFormSchema } from '@/lib/auth-form-schemas';

describe('auth form schemas', () => {
  it('normalizes valid login email whitespace', () => {
    const result = loginFormSchema.parse({
      email: '  creator@example.com  ',
      password: 'secret',
    });

    expect(result.email).toBe('creator@example.com');
  });

  it('rejects invalid login input', () => {
    const result = loginFormSchema.safeParse({
      email: 'not-email',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts matching registration passwords', () => {
    const result = registerFormSchema.safeParse({
      name: 'Creator User',
      email: 'creator@example.com',
      password: 'securepass123',
      confirmPassword: 'securepass123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects mismatched registration passwords', () => {
    const result = registerFormSchema.safeParse({
      name: 'Creator User',
      email: 'creator@example.com',
      password: 'securepass123',
      confirmPassword: 'differentpass123',
    });

    expect(result.success).toBe(false);
  });
});
