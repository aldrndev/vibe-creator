import { Shield } from "lucide-react";

export function AdminHeader() {
  return (
    <h1 className="text-2xl font-bold flex items-center gap-2">
      <Shield size={24} />
      Admin Dashboard
    </h1>
  );
}
