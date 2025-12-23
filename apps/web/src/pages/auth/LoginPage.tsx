import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/ui/turnstile-widget';

interface AuthApiResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: 'USER' | 'ADMIN';
  };
  accessToken: string;
  expiresAt: string;
}

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    if (!turnstileToken) {
      toast.error('Harap selesaikan verifikasi captcha');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthApiResponse>('/auth/login', {
        ...data,
        turnstileToken,
      });
      
      if (response.success) {
        setAuth(response.data);
        toast.success('Berhasil masuk!');
        navigate('/dashboard');
      } else {
        toast.error(response.error.message);
        turnstileRef.current?.reset();
        setTurnstileToken(undefined);
      }
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Selamat Datang Kembali</h1>
        <p className="text-foreground/60">
          Masuk ke akun kamu untuk melanjutkan
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          startContent={<Mail size={18} className="text-foreground/40" />}
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
          {...register('email', {
            required: 'Email diperlukan',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Email tidak valid',
            },
          })}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Masukkan password"
          startContent={<Lock size={18} className="text-foreground/40" />}
          isInvalid={!!errors.password}
          errorMessage={errors.password?.message}
          endContent={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-foreground/60 hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
          {...register('password', {
            required: 'Password diperlukan',
          })}
        />

        <TurnstileWidget
          ref={turnstileRef}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(undefined)}
        />

        <Button
          type="submit"
          color="primary"
          fullWidth
          size="lg"
          isLoading={isLoading}
          isDisabled={!turnstileToken}
          startContent={!isLoading && <LogIn size={20} />}
        >
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/60">
        Belum punya akun?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
