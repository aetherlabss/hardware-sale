export default async function handler(req, res) {
  const { input } = req.query;

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  // A chave vem das variáveis de ambiente da Vercel ou podemos dar hardcode na demo
  // Mas o utilizador mandou NÃO expor no frontend e guardar. No server, está seguro!
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBesmG2CMnzs6gbBqvW7u1LL71fTN3WSTE';
  
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}&components=country:mz&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}
