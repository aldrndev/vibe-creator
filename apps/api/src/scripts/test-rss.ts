export {};

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });
    if (res.ok) {
      await res.text();
      return true;
    }
  } catch (_err: unknown) {}
  return false;
}

async function main() {
  const urls = [
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID',
    'https://trends.google.co.id/trends/trendingsearches/daily/rss?geo=ID',
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US',
    'https://trends.google.com/trends/hottrends/atom/feed?pn=p19', // Indonesia ID?
    'https://trends.google.com/trends/hottrends/atom/feed?pn=p1', // US
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID&hl=id',
  ];
  for (const url of urls) {
    await checkUrl(url);
  }
}

main();
