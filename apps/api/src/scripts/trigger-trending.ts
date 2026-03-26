import { trendingQueue } from '../modules/trending/jobs/trending.queue';

async function main() {
  await trendingQueue.add('manual-trigger', {
    region: 'ID',
    mode: 'full',
    idempotencyKey: `manual-${Date.now()}`,
  });

  // Wait a bit for connection to flush
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to add job:', err);
  process.exit(1);
});
