export {};

async function checkUrl(url: string) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    clearTimeout(id);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        return true;
      }
    } else {
      await res.text();
    }
  } catch (_err: unknown) {}
  return false;
}

async function main() {
  const urls = [
    'https://inv.tux.pizza/api/v1/trending?region=ID',
    'https://vid.puffyan.us/api/v1/trending?region=ID',
    'https://yewtu.be/api/v1/trending?region=ID',
    'https://invidious.jing.rocks/api/v1/trending?region=ID',
    'https://pipedapi.kavin.rocks/trending?region=ID',
    'https://api.piped.privacy.com.de/trending?region=ID',
  ];
  for (const url of urls) {
    const success = await checkUrl(url);
    if (success) {
      process.stdout.write(`Reachable: ${url}\n`);
    }
  }
}

main();
