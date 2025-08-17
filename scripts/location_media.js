// scripts/location_media.js
// Background IMAGE + layered MUSIC manager (supports multiple tracks per location)
(function(){
  if (window.__LocationMediaInstalled) return;
  window.__LocationMediaInstalled = true;

  // --- CONFIG: map each location to background image + one OR MORE music files ---
  // Images are .png per your latest list. Music filenames keep spaces.
  window.LOCATION_MEDIA = {
    "Start": {
      image: "Assets/Backgrounds/start.png",
      music: ["Assets/Music/start song.mp3"]
    },
    "CreateParty": {
      image: "Assets/Backgrounds/start.png",
      music: ["Assets/Music/start song.mp3"]
    },
    "Town Square": {
      image: "Assets/Backgrounds/town_square.png",
      music: ["Assets/Music/town square.mp3"]
    },
    "Inn": {
      image: "Assets/Backgrounds/inn.png",
      music: [
        "Assets/Music/inn fire.mp3",
        "Assets/Music/inn noise.mp3"
      ]
    },
    "Market": {
      image: "Assets/Backgrounds/market.png",
      music: [
        "Assets/Music/market noise.mp3",
        "Assets/Music/market song.mp3"
      ]
    },
    "Wilderness": {
      image: "Assets/Backgrounds/wilderness.png",
      music: [
        "Assets/Music/wilderness.mp3",
        "Assets/Music/woods.mp3"
      ]
    },
    "Cave Entrance": {
      image: "Assets/Backgrounds/cave.png",
      music: [
        "Assets/Music/cave music.mp3",
        "Assets/Music/cave ambience.mp3"
      ]
    },
    "Settings": {
      image: "Assets/Backgrounds/edda.png",
      music: ["Assets/Music/ourlordisnotready.mp3"]
    }
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
  function hardStopAllAudioElements(){
    document.querySelectorAll('audio').forEach(a => {
      try { a.pause(); } catch {}
      try { a.src = ''; } catch {}
      try { a.removeAttribute('src'); } catch {}
      try { a.load?.(); } catch {}
      try { a.remove(); } catch {}
    });
    if (window.__bgmTracks) {
      window.__bgmTracks.forEach(a => { try{ a.pause(); a.src=''; a.remove(); }catch{} });
    }
    window.__bgmTracks = [];
  }

  function currentVolume(){
    const v = parseFloat(localStorage.getItem('bgmVolume') || '0.7');
    return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
  }
  function currentMuted(){
    return localStorage.getItem('bgmMuted') === 'true';
  }

  // attempt (re)play after first user interaction (autoplay unlock)
  function installAutoplayUnblocker(){
    if (window.__mediaAutoplayUnblockerInstalled) return;
    window.__mediaAutoplayUnblockerInstalled = true;
    const resume = () => {
      (window.__bgmTracks||[]).forEach(a => a.play().catch(()=>{}));
    };
    ['pointerdown','keydown'].forEach(ev =>
      document.addEventListener(ev, resume, { once:true, passive:true })
    );
  }

  // Play one or more tracks simultaneously (looping)
  function setBgm(sources){
    hardStopAllAudioElements();
    const list = Array.isArray(sources) ? sources : (sources ? [sources] : []);
    window.__bgmTracks = [];
    if (!list.length){
      console.log('[media] setBgm called with no sources');
      return;
    }
    installAutoplayUnblocker();

    list.forEach(src => {
      const safeSrc = encodeURI(src); // handles spaces
      const a = new Audio(safeSrc);
      a.loop = true;
      a.preload = 'auto';
      a.muted = currentMuted();
      a.volume = currentVolume();
      a.addEventListener('error', () => console.log('[media] audio error for', safeSrc));
      document.body.appendChild(a);
      window.__bgmTracks.push(a);
      a.play().catch(() => {
        console.log('[media] autoplay blocked; will resume on first interaction:', safeSrc);
      });
    });
    console.log('[media] now playing (layered):', list);
  }

  // --- public API ---
  window.MediaManager = {
    setLocation(key){
      const m = window.LOCATION_MEDIA[key];
      if (!m){ console.warn('[media] No media mapping for location:', key); return; }

      // background crossfade
      const layer = ensureBgLayer();
      layer.style.opacity = '0';
      const img = m.image ? `url('${encodeURI(m.image)}')` : '';
      setTimeout(() => { layer.style.backgroundImage = img; layer.style.opacity = '1'; }, 60);

      // layered music
      setBgm(m.music);
      localStorage.setItem('lastLocation', key);
    },
    setInitialMusic(srcOrList){
      // default to unmuted the first time unless user already toggled mute
      if (localStorage.getItem('bgmMuted') == null) {
        localStorage.setItem('bgmMuted', 'false');
      }
      if (localStorage.getItem('bgmVolume') == null) {
        localStorage.setItem('bgmVolume', '0.7');
      }
      setBgm(srcOrList || ["Assets/Music/start song.mp3"]);
    },
    mute(flag){
      localStorage.setItem('bgmMuted', String(!!flag));
      (window.__bgmTracks||[]).forEach(a => a.muted = !!flag);
      console.log('[media] mute =', !!flag);
    },
    setVolume(v){
      const vol = Math.max(0, Math.min(1, Number(v)));
      localStorage.setItem('bgmVolume', String(vol));
      (window.__bgmTracks||[]).forEach(a => a.volume = vol);
      console.log('[media] volume =', vol);
    },
    stop(){ hardStopAllAudioElements(); }
  };

  // convenience alias used elsewhere
  window.setLocationMedia = window.MediaManager.setLocation;
})();
