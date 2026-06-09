export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Walnut Creek, CA coordinates
  const lat = 37.9101, lon = -122.0652;
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,precipitation&temperature_unit=fahrenheit&timezone=America/Los_Angeles`
    );
    const d = await r.json();
    return res.status(200).json({
      temp: Math.round(d.current.temperature_2m),
      code: d.current.weathercode,
      precip: d.current.precipitation
    });
  } catch (e) {
    return res.status(200).json({ temp: 72, code: 1, precip: 0 });
  }
}
