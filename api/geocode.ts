export default async function handler(req, res) {
  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBesmG2CMnzs6gbBqvW7u1LL71fTN3WSTE';
  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${place_id}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch geocode' });
  }
}
