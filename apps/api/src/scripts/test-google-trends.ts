import googleTrends from 'google-trends-api';

async function main() {
  try {
    await googleTrends.dailyTrends({ geo: 'ID' });
  } catch (_err) {}
  try {
    await googleTrends.dailyTrends({ geo: 'US' });
  } catch (_err) {}
  try {
    await googleTrends.realTimeTrends({ geo: 'ID' });
  } catch (_err) {}
  try {
    await googleTrends.realTimeTrends({ geo: 'US' });
  } catch (_err) {}
}

main();
