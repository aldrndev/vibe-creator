import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react';
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

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (!turnstileToken) {
      toast.error('Harap selesaikan verifikasi captcha');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthApiResponse>('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        turnstileToken,
      });
      
      if (response.success) {
        setAuth(response.data);
        toast.success('Akun berhasil dibuat!');
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
        <h1 className="text-2xl font-bold mb-2">Buat Akun Baru</h1>
        <p className="text-foreground/60">
          Daftar untuk mulai membuat konten luar biasa
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Nama Lengkap"
          placeholder="Nama kamu"
          startContent={<User size={18} className="text-foreground/40" />}
          isInvalid={!!errors.name}
          errorMessage={errors.name?.message}
          {...register('name', {
            required: 'Nama diperlukan',
            minLength: {
              value: 2,
              message: 'Nama minimal 2 karakter',
            },
          })}
        />

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
          placeholder="Minimal 8 karakter"
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
            minLength: {
              value: 8,
              message: 'Password minimal 8 karakter',
            },
          })}
        />

        <Input
          label="Konfirmasi Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Ulangi password"
          startContent={<Lock size={18} className="text-foreground/40" />}
          isInvalid={!!errors.confirmPassword}
          errorMessage={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Konfirmasi password diperlukan',
            validate: (value) =>
              value === password || 'Password tidak cocok',
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
          startContent={!isLoading && <UserPlus size={20} />}
        >
          Daftar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/60">
        Sudah punya akun?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
