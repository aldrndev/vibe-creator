import { Card, CardBody } from '@heroui/react';
import { Download, FileVideo, Clock } from 'lucide-react';

export function DownloadsPage() {
  // TODO: Fetch actual downloads from API
  const downloads: { id: string; name: string; status: string; createdAt: string }[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-foreground/60 mt-1">
          Your exported videos and files
        </p>
      </div>

      {downloads.length === 0 ? (
        <Card className="bg-content1/50">
          <CardBody className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Download size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Downloads Yet</h3>
            <p className="text-foreground/60 text-center max-w-md">
              When you export videos from the editor, they will appear here for download.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {downloads.map((download) => (
            <Card key={download.id} className="bg-content1/50">
              <CardBody className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileVideo size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{download.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Clock size={14} />
                    <span>{download.createdAt}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
