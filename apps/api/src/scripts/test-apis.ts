export {};

async function checkUrl(url: string) {
  console.log(`Testing: ${url}`);
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    clearTimeout(id);

    console.log(`[${res.status}] ${url}`);

    if (res.ok) {
      const json = await res.json();
      console.log("Count:", Array.isArray(json) ? json.length : "Not Array");
      if (Array.isArray(json) && json.length > 0) {
        const first = json[0];
        // Invidious often has 'title', 'videoId'. Piped has 'title', 'url'
        console.log("First Item Keys:", Object.keys(first).slice(0, 5));
        console.log("Example Title:", first.title);
        return true;
      }
    } else {
      const text = await res.text();
      console.log("Error Body:", text.substring(0, 100));
    }
  } catch (err: any) {
    console.log(`[ERR] ${url}: ${err.message}`);
  }
  return false;
}

async function main() {
  const urls = [
    "https://inv.tux.pizza/api/v1/trending?region=ID",
    "https://vid.puffyan.us/api/v1/trending?region=ID",
    "https://yewtu.be/api/v1/trending?region=ID",
    "https://invidious.jing.rocks/api/v1/trending?region=ID",
    "https://pipedapi.kavin.rocks/trending?region=ID",
    "https://api.piped.privacy.com.de/trending?region=ID",
  ];

  console.log("Testing APIs...");
  for (const url of urls) {
    const success = await checkUrl(url);
    if (success) console.log(">>> SUCCESS <<<");
    console.log("---");
  }
}

main();
