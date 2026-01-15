import { trendingQueue } from "../modules/trending/jobs/trending.queue";

async function main() {
  console.log("Triggering manual trending refresh (ID, full)...");

  const job = await trendingQueue.add("manual-trigger", {
    region: "ID",
    mode: "full",
    idempotencyKey: `manual-${Date.now()}`,
  });

  console.log(`Job added! Job ID: ${job.id}`);

  // Wait a bit for connection to flush
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to add job:", err);
  process.exit(1);
});
