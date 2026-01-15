import { Link, useNavigate } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { useState, useRef } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  TurnstileWidget,
  type TurnstileWidgetRef,
} from "@/components/ui/turnstile-widget";

interface AuthApiResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: "USER" | "ADMIN";
  };
  subscription: {
    tier: "FREE" | "CREATOR" | "PRO";
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    exportsUsed: number;
    exportsLimit: number;
    validUntil: string | null;
  } | null;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  const onSubmit = async (data: RegisterForm) => {
    setErrorMessage(null);

    if (!turnstileToken) {
      setErrorMessage("Harap selesaikan verifikasi captcha");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthApiResponse>("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
        turnstileToken,
      });

      if (response.success) {
        setAuth(response.data);
        navigate("/dashboard");
      } else {
        setErrorMessage(response.error.message);
        turnstileRef.current?.reset();
        setTurnstileToken(undefined);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan. Silakan coba lagi.");
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2">
          Buat Akun Baru
        </h1>
        <p className="text-muted-foreground font-medium">
          Daftar untuk mulai membangun masa depan konten digital kamu.
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
          label="Nama Lengkap"
          placeholder="Nama kamu"
          leftIcon={<User size={20} />}
          error={errors.name?.message}
          {...register("name", {
            required: "Nama diperlukan",
            minLength: {
              value: 2,
              message: "Nama minimal 2 karakter",
            },
          })}
        />

        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          leftIcon={<Mail size={20} />}
          error={errors.email?.message}
          {...register("email", {
            required: "Email diperlukan",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Email tidak valid",
            },
          })}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Minimal 8 karakter"
          leftIcon={<Lock size={20} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-primary transition-colors pr-1"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
          error={errors.password?.message}
          {...register("password", {
            required: "Password diperlukan",
            minLength: {
              value: 8,
              message: "Password minimal 8 karakter",
            },
          })}
        />

        <Input
          label="Konfirmasi Password"
          type={showPassword ? "text" : "password"}
          placeholder="Ulangi password"
          leftIcon={<Lock size={20} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Konfirmasi password diperlukan",
            validate: (value) => value === password || "Password tidak cocok",
          })}
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
          {!isLoading && <UserPlus size={20} className="mr-2" />}
          Daftar Sekarang
        </Button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/login" className="text-primary font-bold hover:underline">
          Masuk ke Akun
        </Link>
      </p>
    </div>
  );
}
