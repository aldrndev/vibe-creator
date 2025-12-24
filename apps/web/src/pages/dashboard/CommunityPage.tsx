import { Card, CardBody, Button, Chip } from '@heroui/react';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Megaphone,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem, HoverCard } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnnouncements } from '@/hooks/use-announcements';

// Read from VITE_ environment variables
const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_URL || 'https://t.me/vibecreator_id';
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_URL || 'https://chat.whatsapp.com/your-group-link';

const communities = [
  {
    id: 'telegram',
    name: 'Telegram Group',
    description: 'Diskusi, tips, dan support dari komunitas',
    icon: Send,
    link: TELEGRAM_URL,
    color: 'primary',
    members: '500+',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Group',
    description: 'Grup eksklusif untuk sharing dan networking',
    icon: MessageCircle,
    link: WHATSAPP_URL,
    color: 'success',
    members: '200+',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
];

export function CommunityPage() {
  const { data: announcements = [], isLoading } = useAnnouncements();

  // Check if announcement is new (within 7 days)
  const isNew = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <PageTransition className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-primary" />
          <h1 className="text-2xl font-bold">Komunitas</h1>
        </div>
        <p className="text-foreground/60">
          Bergabung dengan komunitas creator dan dapatkan tips, support, dan networking
        </p>
      </div>

      {/* Join Community Cards */}
      <StaggerContainer>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-warning" />
          Gabung Komunitas
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {communities.map((community) => (
            <StaggerItem key={community.id}>
              <HoverCard>
                <Card className={`border-2 border-transparent hover:border-${community.color}/50 transition-all overflow-hidden`}>
                  <CardBody className={`p-5 bg-gradient-to-br ${community.gradient}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-${community.color}/20 flex items-center justify-center flex-shrink-0`}>
                        <community.icon size={28} className={`text-${community.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{community.name}</h3>
                          <Chip size="sm" variant="flat" color="default">
                            {community.members} members
                          </Chip>
                        </div>
                        <p className="text-sm text-foreground/60 mb-3">
                          {community.description}
                        </p>
                        <Button
                          as="a"
                          href={community.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          color={community.color as 'primary' | 'success'}
                          size="sm"
                          endContent={<ArrowRight size={14} />}
                        >
                          Gabung Sekarang
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </HoverCard>
            </StaggerItem>
          ))}
        </div>
      </StaggerContainer>

      {/* Announcements */}
      <StaggerContainer>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone size={20} className="text-warning" />
          Pengumuman
        </h2>
        
        {isLoading && <SkeletonCard count={3} type="row" />}
        
        {!isLoading && announcements.length === 0 && (
          <EmptyState
            type="announcements"
            description="Pengumuman terbaru akan muncul di sini"
          />
        )}
        
        {!isLoading && announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <Card className="hover:border-primary/30 transition-colors border-2 border-transparent">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{announcement.title}</h3>
                          {isNew(announcement.createdAt) && (
                            <Chip size="sm" color="primary" variant="flat">
                              Baru
                            </Chip>
                          )}
                        </div>
                        <p className="text-sm text-foreground/60">
                          {announcement.content}
                        </p>
                      </div>
                      <span className="text-xs text-foreground/40 whitespace-nowrap">
                        {new Date(announcement.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </div>
        )}
      </StaggerContainer>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border-primary/20">
        <CardBody className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">
            Ada pertanyaan atau butuh bantuan?
          </h3>
          <p className="text-foreground/60 mb-4">
            Langsung tanya di grup Telegram atau WhatsApp, 
            tim dan komunitas siap membantu!
          </p>
          <div className="flex justify-center gap-3">
            <Button
              as="a"
              href={TELEGRAM_URL}
              target="_blank"
              color="primary"
              variant="flat"
              startContent={<Send size={16} />}
            >
              Telegram
            </Button>
            <Button
              as="a"
              href={WHATSAPP_URL}
              target="_blank"
              color="success"
              variant="flat"
              startContent={<MessageCircle size={16} />}
            >
              WhatsApp
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageTransition>
  );
}
