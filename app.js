/**
 * UNDERSKY Y2K AUDIO OS - SCRIPT ENGINE
 * Handles SoundCloud live updates, audio visualizer, CD interactions, and retro UI
 */

const CONFIG = {
  soundCloudUser: 'skyogxx999',
  soundCloudProfileUrl: 'https://soundcloud.com/skyogxx999',
  defaultTrack: {
    title: 'PERRO HAMAIQUINO (prod. TheLewis)',
    url: 'https://soundcloud.com/skyogxx999/perro-hamaiquino-prod-thelewis',
    date: '2026-08-02',
    artwork: 'https://i1.sndcdn.com/artworks-czHNNINvIlwMTa7C-vHOqmA-t500x500.jpg',
    trackId: '2373806783'
  }
};

// Elementos DOM
const digitalClockEl = document.getElementById('digital-clock');
const btnToggleScanlines = document.getElementById('btn-toggle-scanlines');
const crtOverlayEl = document.querySelector('.crt-overlay');
const cdDiscEl = document.getElementById('cd-disc');
const discStatusEl = document.getElementById('disc-status');
const alertSongTitleEl = document.getElementById('alert-song-title');
const alertSongDateEl = document.getElementById('alert-song-date');
const alertSongLinkEl = document.getElementById('alert-song-link');
const lcdTrackDisplayEl = document.getElementById('lcd-track-display');
const syncStatusEl = document.getElementById('sync-status');
const scIframeEl = document.getElementById('sc-widget-iframe');
const cdCoverArtEl = document.getElementById('cd-cover-art');
const tracklistBodyEl = document.getElementById('tracklist-body');
const trackCountDisplayEl = document.getElementById('track-count-display');
const btnShareTrack = document.getElementById('btn-share-track');
const btnRefreshFeed = document.getElementById('btn-refresh-feed');
const visitorCounterEl = document.getElementById('visitor-counter');
const toastEl = document.getElementById('toast');
const marqueeTextEl = document.getElementById('marquee-text');

// 1. Reloj Digital Retro
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  if (digitalClockEl) {
    digitalClockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// 2. Contador de Visitas estilo 2000s con localStorage
function initVisitorCounter() {
  let visits = parseInt(localStorage.getItem('undersky_y2k_visits') || '4829', 10);
  visits += 1;
  localStorage.setItem('undersky_y2k_visits', visits);
  if (visitorCounterEl) {
    visitorCounterEl.textContent = String(visits).padStart(6, '0');
  }
}
initVisitorCounter();

// 3. Toggle de Scanlines CRT
if (btnToggleScanlines && crtOverlayEl) {
  btnToggleScanlines.addEventListener('click', () => {
    crtOverlayEl.classList.toggle('disabled');
    const isOff = crtOverlayEl.classList.contains('disabled');
    btnToggleScanlines.textContent = isOff ? 'CRT: OFF' : 'CRT: ON';
  });
}

// 4. Interacción con el Disco CD y Ecualizador (Pausar / Reanudar giro)
let isPlaying = true;
let playSeconds = 14;
const lcdTimerEl = document.getElementById('lcd-timer');
const eqBarsContainer = document.getElementById('eq-bars');

function updatePlaybackTimer() {
  if (isPlaying && lcdTimerEl) {
    playSeconds++;
    const mins = String(Math.floor(playSeconds / 60)).padStart(2, '0');
    const secs = String(playSeconds % 60).padStart(2, '0');
    lcdTimerEl.textContent = `${mins}:${secs}`;
  }
}
setInterval(updatePlaybackTimer, 1000);

if (cdDiscEl) {
  cdDiscEl.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      cdDiscEl.classList.remove('paused');
      if (discStatusEl) discStatusEl.textContent = 'CD GIRANDO // AUDIO ACTIVO';
      if (eqBarsContainer) eqBarsContainer.style.filter = 'none';
    } else {
      cdDiscEl.classList.add('paused');
      if (discStatusEl) discStatusEl.textContent = 'CD PAUSADO // CLICK PARA GIRAR';
      if (eqBarsContainer) eqBarsContainer.style.filter = 'grayscale(1) opacity(0.3)';
    }
  });
}

// Controles de Ventana Winamp (Minimizar / Maximizar)
const winMinBtn = document.querySelector('.win-min');
const playerBodyEl = document.querySelector('.player-body');
if (winMinBtn && playerBodyEl) {
  winMinBtn.addEventListener('click', () => {
    playerBodyEl.style.display = playerBodyEl.style.display === 'none' ? 'grid' : 'none';
  });
}

// 5. Mostrar Notificación Toast
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2800);
}

// 6. Botón de Compartir (Nativo en móviles o copiar enlace en PC)
if (btnShareTrack) {
  btnShareTrack.addEventListener('click', async () => {
    const shareData = {
      title: 'UNDERSKY ★ Música Oficial',
      text: '¡Escucha la música de UNDERSKY en SoundCloud!',
      url: window.location.href.includes('http') ? window.location.href : CONFIG.soundCloudProfileUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback a portapapeles si el usuario cancela o no soporta
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast('⚡ ¡Enlace copiado al portapapeles!');
    } catch (e) {
      showToast('Enlace: ' + CONFIG.soundCloudProfileUrl);
    }
  });
}

// 7. Sincronización Automática con SoundCloud
async function fetchSoundCloudTracks() {
  if (syncStatusEl) syncStatusEl.textContent = 'SNC: BUSCANDO TRACKS...';

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(CONFIG.soundCloudProfileUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(CONFIG.soundCloudProfileUrl)}`
  ];

  let rawHtml = null;

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, { cache: 'no-cache' });
      if (response.ok) {
        rawHtml = await response.text();
        if (rawHtml && rawHtml.includes('<article class="audible"')) {
          break;
        }
      }
    } catch (e) {
      console.warn('Proxy intento fallido:', proxyUrl, e);
    }
  }

  if (rawHtml) {
    parseAndRenderTracks(rawHtml);
  } else {
    // Modo offline / fallback
    console.log('Utilizando catálogo base precargado.');
    if (syncStatusEl) syncStatusEl.textContent = 'SNC: CONECTADO [CACHE]';
  }
}

// Parsear canciones del HTML de SoundCloud
function parseAndRenderTracks(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = doc.querySelectorAll('article.audible[itemprop="track"]');

    if (!articles || articles.length === 0) {
      if (syncStatusEl) syncStatusEl.textContent = 'SNC: CONECTADO [CACHE]';
      return;
    }

    const tracks = [];
    articles.forEach((art, index) => {
      const linkEl = art.querySelector('h2[itemprop="name"] a[itemprop="url"]');
      const timeEl = art.querySelector('time[pubdate]');
      
      if (linkEl) {
        const title = linkEl.textContent.trim();
        let path = linkEl.getAttribute('href') || '';
        if (!path.startsWith('http')) {
          path = 'https://soundcloud.com' + path;
        }
        const pubDate = timeEl ? timeEl.textContent.trim() : 'Reciente';

        tracks.push({
          title,
          url: path,
          date: pubDate,
          isNewest: index === 0
        });
      }
    });

    if (tracks.length > 0) {
      applyNewestRelease(tracks[0]);
      renderTracklist(tracks);
      if (syncStatusEl) syncStatusEl.textContent = 'SNC: ACTUALIZADO [EN VIVO]';
      showToast('✓ Sincronizado con SoundCloud: ' + tracks[0].title);
    }
  } catch (err) {
    console.error('Error parseando SoundCloud:', err);
    if (syncStatusEl) syncStatusEl.textContent = 'SNC: MODO LOCAL';
  }
}

// Actualizar componentes cuando se detecta el lanzamiento más reciente
function applyNewestRelease(track) {
  if (alertSongTitleEl) alertSongTitleEl.textContent = track.title;
  if (alertSongLinkEl) alertSongLinkEl.href = track.url;
  
  if (alertSongDateEl && track.date) {
    alertSongDateEl.textContent = track.date.split('T')[0] || track.date;
  }

  if (lcdTrackDisplayEl) {
    lcdTrackDisplayEl.textContent = `★ UNDERSKY - ${track.title} ★`;
  }

  if (marqueeTextEl) {
    marqueeTextEl.textContent = `★ ¡NUEVO LANZAMIENTO DETECTADO! // "${track.title}" // ESCÚCHALO AHORA EN SOUNDCLOUD: @${CONFIG.soundCloudUser} // "ONE DAY SKY WILL BE SOMEONE" ★`;
  }

  // Notificar al usuario si es una canción nueva guardada en cache local
  const lastKnownSong = localStorage.getItem('undersky_last_song');
  if (lastKnownSong && lastKnownSong !== track.title) {
    showToast(`🔥 ¡NUEVA CANCIÓN EN SOUNDCLOUD! ${track.title}`);
  }
  localStorage.setItem('undersky_last_song', track.title);
}

// Renderizar la tabla de canciones completa
function renderTracklist(tracks) {
  if (!tracklistBodyEl) return;
  tracklistBodyEl.innerHTML = '';

  if (trackCountDisplayEl) {
    trackCountDisplayEl.textContent = `${tracks.length} ${tracks.length === 1 ? 'CANCIÓN REGISTRADA' : 'CANCIONES REGISTRADAS'}`;
  }

  tracks.forEach((track, idx) => {
    const tr = document.createElement('tr');
    if (track.isNewest) tr.classList.add('active-track');

    const formattedIndex = String(idx + 1).padStart(2, '0');
    const formattedDate = track.date ? track.date.split('T')[0] : '2026';

    tr.innerHTML = `
      <td class="track-idx">${formattedIndex}</td>
      <td class="track-title-cell">
        <span class="speaker-icon">🔊</span>
        <strong>${track.title}</strong>
      </td>
      <td>${track.isNewest ? '<span class="badge-new">¡NUEVO!</span>' : '<span style="color:#777;">DISPONIBLE</span>'}</td>
      <td>${formattedDate}</td>
      <td>
        <a href="${track.url}" target="_blank" rel="noopener noreferrer" class="table-play-btn">
          PLAY ↗
        </a>
      </td>
    `;

    tracklistBodyEl.appendChild(tr);
  });
}

// 8. Botón manual de refrescar
if (btnRefreshFeed) {
  btnRefreshFeed.addEventListener('click', () => {
    showToast('Buscando novedades en SoundCloud...');
    fetchSoundCloudTracks();
  });
}

// 9. Inicialización al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
  // Ejecutar búsqueda automática en segundo plano
  setTimeout(fetchSoundCloudTracks, 1200);
});
