import { Link, useNavigate } from '@tanstack/react-router';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/ui/turnstile-widget';
import { useDocumentMetadata } from '@/hooks/use-document-metadata';
import { type LoginForm, loginFormSchema } from '@/lib/auth-form-schemas';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

interface AuthApiResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: 'USER' | 'ADMIN';
  };
  subscription: {
    tier: 'FREE' | 'CREATOR' | 'PRO';
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    exportsUsed: number;
    exportsLimit: number;
    validUntil: string | null;
  } | null;
  accessToken: string;
  expiresAt: string;
}

export function LoginPage() {
  useDocumentMetadata({
    title: 'Masuk Ke Akun - Vibe Creator',
    description:
      'Masuk ke akun Vibe Creator Anda untuk melanjutkan pembuatan video dan manajemen konten.',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMessage(null);

    const handleValidationErrors = (issues: z.ZodIssue[]) => {
      for (const issue of issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'password') {
          setError(field as 'email' | 'password', { message: issue.message });
        }
      }
    };

    const parsedData = loginFormSchema.safeParse(data);
    if (!parsedData.success) {
      handleValidationErrors(parsedData.error.issues);
      return;
    }

    if (!turnstileToken) {
      setErrorMessage('Harap selesaikan verifikasi keamanan.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthApiResponse>('/auth/login', {
        ...parsedData.data,
        turnstileToken,
      });

      if (response.success) {
        setAuth(response.data);
        navigate({ to: '/dashboard' });
      } else {
        setErrorMessage(response.error.message);
        turnstileRef.current?.reset();
        setTurnstileToken(undefined);
      }
    } catch {
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi.');
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2">Masuk ke Workspace</h1>
        <p className="text-muted-foreground font-medium">
          Lanjutkan draft, export, dan workflow video yang sudah kamu siapkan.
        </p>
      </div>

      {/* Inline Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          leftIcon={<Mail size={20} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Masukkan password"
          leftIcon={<Lock size={20} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="text-muted-foreground hover:text-primary transition-colors pr-1"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <TurnstileWidget
          ref={turnstileRef}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(undefined)}
        />

        <Button
          type="submit"
          className="w-full h-14 rounded-full text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          size="lg"
          isLoading={isLoading}
          disabled={!turnstileToken}
        >
          {!isLoading && <LogIn size={20} className="mr-2" />}
          Masuk Sekarang
        </Button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
        Belum punya akun?{' '}
        <Link to="/register" className="text-primary font-bold hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
