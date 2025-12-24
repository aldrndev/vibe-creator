import { Button } from '@heroui/react';
import { 
  FolderOpen, 
  FileText, 
  Download, 
  Megaphone, 
  Users, 
  Sparkles,
  Plus,
  type LucideIcon
} from 'lucide-react';

type EmptyStateType = 'projects' | 'prompts' | 'downloads' | 'announcements' | 'users' | 'default';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

const emptyStateConfig: Record<EmptyStateType, { icon: LucideIcon; title: string; description: string }> = {
  projects: {
    icon: FolderOpen,
    title: 'Belum ada project',
    description: 'Mulai buat project pertamamu untuk membuat konten menarik',
  },
  prompts: {
    icon: Sparkles,
    title: 'Belum ada prompt',
    description: 'Generate prompt dengan AI untuk mempercepat workflow kreatif',
  },
  downloads: {
    icon: Download,
    title: 'Belum ada unduhan',
    description: 'Download audio atau video dari URL untuk digunakan di project',
  },
  announcements: {
    icon: Megaphone,
    title: 'Belum ada pengumuman',
    description: 'Pengumuman terbaru akan muncul di sini',
  },
  users: {
    icon: Users,
    title: 'Tidak ada pengguna',
    description: 'Belum ada pengguna yang terdaftar',
  },
  default: {
    icon: FileText,
    title: 'Tidak ada data',
    description: 'Data yang kamu cari belum tersedia',
  },
};

export function EmptyState({ 
  type = 'default', 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon: CustomIcon 
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = CustomIcon || config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon Container */}
      <div className="w-20 h-20 rounded-full bg-content2 border border-divider flex items-center justify-center mb-6">
        <Icon size={36} className="text-foreground/40" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground/80 mb-2">
        {title || config.title}
      </h3>
      <p className="text-foreground/50 text-center max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Action button */}
      {actionLabel && onAction && (
        <Button
          color="primary"
          variant="flat"
          startContent={<Plus size={16} />}
          onPress={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
