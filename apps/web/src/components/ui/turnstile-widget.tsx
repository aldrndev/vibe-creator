import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface TurnstileWidgetRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_TURNSTILE_SITE_KEY ||
  '1x00000000000000000000AA'; // Test key for development

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onVerify, onError, onExpire }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const [token, setToken] = useState<string>();

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
        setToken(undefined);
      },
      getResponse: () => token,
    }));

    return (
      <div className="my-4 flex flex-col items-center rounded-2xl border border-border/60 bg-card/45 p-3">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Verifikasi keamanan
        </p>
        <Turnstile
          ref={turnstileRef}
          siteKey={SITE_KEY}
          onSuccess={(t) => {
            setToken(t);
            onVerify?.(t);
          }}
          onError={() => {
            setToken(undefined);
            onError?.();
          }}
          onExpire={() => {
            setToken(undefined);
            onExpire?.();
          }}
          options={{
            theme: 'dark',
            size: 'normal',
          }}
        />
      </div>
    );
  },
);

TurnstileWidget.displayName = 'TurnstileWidget';
