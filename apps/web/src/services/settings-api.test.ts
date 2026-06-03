import { describe, expect, it } from 'vitest';
import {
  notificationPreferencesSchema,
  paymentSchema,
  profileResponseDataSchema,
} from './settings-api';

describe('settings api schemas', () => {
  it('accepts complete notification preferences', () => {
    expect(() =>
      notificationPreferencesSchema.parse({
        email: true,
        push: false,
        marketing: false,
      }),
    ).not.toThrow();
  });

  it('rejects unknown notification preference keys', () => {
    expect(() =>
      notificationPreferencesSchema.parse({
        email: true,
        push: false,
        marketing: false,
        sms: true,
      }),
    ).toThrow();
  });

  it('accepts profile response data without access token', () => {
    expect(() =>
      profileResponseDataSchema.parse({
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Creator',
          avatarUrl: null,
          role: 'USER',
        },
        subscription: null,
      }),
    ).not.toThrow();
  });

  it('accepts payment history records from the payment endpoint', () => {
    expect(() =>
      paymentSchema.parse({
        id: 'payment-id',
        amount: 99000,
        tier: 'CREATOR',
        status: 'PAID',
        xenditInvoiceId: 'invoice-id',
        xenditPaymentId: null,
        paymentMethod: 'QRIS',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).not.toThrow();
  });
});
