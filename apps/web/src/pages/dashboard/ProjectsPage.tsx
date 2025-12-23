import { Button, Card, CardBody } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderOpen } from 'lucide-react';

export function ProjectsPage() {
  const navigate = useNavigate();

  const handleNewProject = () => {
    const newId = `project-${Date.now()}`;
    navigate(`/editor/${newId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proyek</h1>
          <p className="text-foreground/60">Kelola semua proyek video kamu</p>
        </div>
        <Button 
          color="primary"
          startContent={<Plus size={20} />}
          onPress={handleNewProject}
        >
          Proyek Baru
        </Button>
      </div>

      {/* Empty state */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardBody className="p-12 text-center">
            <FolderOpen className="mx-auto mb-4 text-foreground/40" size={64} />
            <h2 className="text-xl font-semibold mb-2">Belum ada proyek</h2>
            <p className="text-foreground/60 mb-6 max-w-md mx-auto">
              Buat proyek pertama kamu untuk mulai mengedit video. 
              Kamu bisa import video dari URL, upload file, atau mulai dari awal.
            </p>
            <Button 
              color="primary"
              size="lg"
              startContent={<Plus size={20} />}
              onPress={handleNewProject}
            >
              Buat Proyek Pertama
            </Button>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
