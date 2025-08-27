// scripts/location_media.js
// Background IMAGE + layered MUSIC manager (paints into #location-hero)
(function(){
  if (window.__LocationMediaInstalled) return;
  window.__LocationMediaInstalled = true;

  // --- CONFIG (no music on non-location tabs) ---
window.LOCATION_MEDIA = {
  "Start":        { image: "Assets/Backgrounds/start.png",        music: ["Assets/audio/Music/That Zen Moment.mp3"] },
  "Town Square":  { image: "Assets/Backgrounds/town_square.png",  music: ["Assets/Music/town square.mp3"] },
  "Inn":          { image: "Assets/Backgrounds/inn.png",          music: ["Assets/Music/inn fire.mp3","Assets/Music/inn noise.mp3"] },
  "Market":       { image: "Assets/Backgrounds/market.png",       music: ["Assets/Music/market noise.mp3","Assets/Music/market song.mp3"] },
  "Wilderness":   { image: "Assets/Backgrounds/wilderness.png",   music: ["Assets/Music/wilderness.mp3","Assets/Music/woods.mp3"] },
  "Cave Entrance":{ image: "Assets/Backgrounds/cave.png",         music: ["Assets/Music/cave music.mp3","Assets/Music/cave ambience.mp3"] },
  "Settings":     { image: "Assets/Backgrounds/settings.png",     music: ["Assets/Music/ourlordisnotready.mp3"] },

  // UI tabs: image only → KEEP whatever is already playing
  "Menu":        { image: "Assets/Backgrounds/start.png" },
  "CreateParty": { image: "Assets/Backgrounds/start.png" },
  "Sheet":       { image: "Assets/Backgrounds/inventorystats.png" },
  "Inventory":   { image: "Assets/Backgrounds/inventorystats.png" },
};

// Only switch music if this location defines it
window.MediaManager = {
  setLocation(key){
    const m = window.LOCATION_MEDIA[key];
    if (!m){ console.warn('[media] No media mapping for location:', key); return; }

    const layer = ensureBgLayer();
    layer.style.opacity = '0';
    const img = m.image ? `url('${encodeURI(m.image)}')` : '';
    setTimeout(() => { layer.style.backgroundImage = img; layer.style.opacity = '1'; }, 60);

    if (Object.prototype.hasOwnProperty.call(m, 'music')) {
      setBgm(m.music);
    }
    localStorage.setItem('lastLocation', key);
  },
  // ... rest unchanged ...
};


  // --- helpers: background layer + audio tracks ---
  function ensureBgLayer(){
    let layer = document.getElementById('bg-layer');
    if (!layer){
      layer = document.createElement('div');
      layer.id = 'bg-layer';
      Object.assign(layer.style, {
        position:'fixed', inset:'0', zIndex:'-1',
        backgroundSize:'cover', backgroundPosition:'center',
        transition:'opacity 300ms ease', opacity:'1'
      });
      document.body.prepend(layer);
    }
    return layer;
  }

  // HARD stop any and all <audio> elements (legacy players) + our managed ones
// ... rest unchanged ...
})();
