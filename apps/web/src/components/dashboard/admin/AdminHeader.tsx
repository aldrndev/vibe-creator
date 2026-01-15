import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function AdminHeader() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck size={20} />
          </div>
          ADMIN CONSOLE
        </h1>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
          Platform performance and user management
        </p>
      </div>

      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        SECURE SESSION: <span className="text-foreground">{user?.email}</span>
      </div>
    </div>
  );
}
