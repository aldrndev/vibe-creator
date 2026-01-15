import { Innertube } from "youtubei.js";

async function main() {
  console.log("TEST 1: Default Client (Android)...");
  try {
    const youtube = await Innertube.create();
    const feed = await youtube.getTrending();
    console.log("Success! Title:", feed.title);
  } catch (err: any) {
    console.error("Test 1 Failed:", err.info?.error?.message || err.message);
  }

  console.log("\nTEST 2: Web Client...");
  try {
    const youtube = await Innertube.create({ client_type: "WEB" });
    const feed = await youtube.getTrending();
    console.log("Success! Title:", feed.title);
  } catch (err: any) {
    console.error("Test 2 Failed:", err.info?.error?.message || err.message);
  }
}

main();
