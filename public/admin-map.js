// Boots the Leaflet map inside /admin-map.html (used in the admin shipping tab).
// Coordinates come from URL query params so this can stay a fully static file
// and respect a strict Content-Security-Policy (no inline scripts).
(function () {
  function num(name, fallback) {
    var value = parseFloat(new URLSearchParams(window.location.search).get(name) || '');
    return Number.isFinite(value) ? value : fallback;
  }

  function init() {
    if (!window.L) {
      // Leaflet not yet loaded — retry on next animation frame
      requestAnimationFrame(init);
      return;
    }

    var lat = num('lat', -25.9692);
    var lng = num('lng', 32.5732);
    var radiusKm = Math.max(1, num('r', 15));

    var map = window.L.map('map', { zoomControl: true }).setView([lat, lng], 12);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    var icon = window.L.divIcon({
      className: 'hw-pin',
      html: '<div style="background:#14f195;width:12px;height:12px;border-radius:50%;border:2px solid #000;box-shadow:0 0 10px #14f195;"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    window.L.marker([lat, lng], { icon: icon }).addTo(map);
    window.L.circle([lat, lng], {
      color: '#14f195',
      fillColor: '#14f195',
      fillOpacity: 0.1,
      weight: 2,
      radius: radiusKm * 1000,
    }).addTo(map);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
