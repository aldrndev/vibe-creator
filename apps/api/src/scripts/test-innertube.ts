import { Innertube } from 'youtubei.js';

async function main() {
  try {
    const youtube = await Innertube.create();
    await youtube.getTrending();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Test 1 Failed:', message);
  }
  try {
    const youtube = await Innertube.create();
    await youtube.getTrending();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Test 2 Failed:', message);
  }
}

main();
