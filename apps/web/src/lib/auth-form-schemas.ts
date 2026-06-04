import { z } from 'zod';

/** Login form schema used by the public auth page before calling the API. */
export const loginFormSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  password: z.string().min(1, 'Password diperlukan'),
});

/** Registration form schema used by the public auth page before calling the API. */
export const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80, 'Nama terlalu panjang'),
    email: z.string().trim().email('Email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password terlalu panjang'),
    confirmPassword: z.string().min(1, 'Konfirmasi password diperlukan'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password tidak cocok',
  });

export type LoginForm = z.input<typeof loginFormSchema>;
export type RegisterForm = z.input<typeof registerFormSchema>;
