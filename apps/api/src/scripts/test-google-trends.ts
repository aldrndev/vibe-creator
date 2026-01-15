import googleTrends from "google-trends-api";

async function main() {
  console.log("--- TEST 1: dailyTrends (ID) ---");
  try {
    const res = await googleTrends.dailyTrends({ geo: "ID" });
    console.log("Success (ID)!");
  } catch (err) {
    console.log("Failed (ID):", err.message || err);
  }

  console.log("\n--- TEST 2: dailyTrends (US) ---");
  try {
    const res = await googleTrends.dailyTrends({ geo: "US" });
    console.log("Success (US)!");
    console.log("Snippet:", res.substring(0, 100));
  } catch (err) {
    console.log("Failed (US):", err.message || err);
  }

  console.log("\n--- TEST 3: realTimeTrends (ID) ---");
  try {
    const res = await googleTrends.realTimeTrends({ geo: "ID" });
    console.log("Success (RealTime ID)!");
    console.log("Snippet:", res.substring(0, 100));
  } catch (err) {
    console.log("Failed (RealTime ID):", err.message || err);
  }

  console.log("\n--- TEST 4: realTimeTrends (US) ---");
  try {
    const res = await googleTrends.realTimeTrends({ geo: "US" });
    console.log("Success (RealTime US)!");
    console.log("Snippet:", res.substring(0, 100));
  } catch (err) {
    console.log("Failed (RealTime US):", err.message || err);
  }
}

main();
