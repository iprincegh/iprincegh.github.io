/**
 * Globe Continuity + Page Transitions
 * 1. Saves/restores the globe video playback position across navigations
 *    so the globe appears to spin continuously without restarting.
 * 2. Adds a smooth fade-to-black transition between pages to completely
 *    mask any brief loading moment.
 */
(function () {
  'use strict';

  var video   = document.querySelector('.spinning-globe video');
  var overlay = document.querySelector('.page-transition');

  var KEY_TIME = 'globeTime';
  var KEY_TS   = 'globeTimestamp';

  /* ========== Globe Continuity ========== */

  function seekGlobe() {
    if (!video || !video.duration) return;
    var savedTime = parseFloat(sessionStorage.getItem(KEY_TIME));
    var savedTs   = parseInt(sessionStorage.getItem(KEY_TS), 10);
    if (!isNaN(savedTime) && !isNaN(savedTs)) {
      var elapsed = (Date.now() - savedTs) / 1000;
      video.currentTime = (savedTime + elapsed) % video.duration;
    }
  }

  function ensureGlobePlaying() {
    if (!video) return;
    seekGlobe();
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (video) {
    if (video.readyState >= 1) {
      ensureGlobePlaying();
    } else {
      video.addEventListener('loadedmetadata', ensureGlobePlaying, { once: true });
    }
    // Belt-and-suspenders: also try on canplay in case metadata wasn't enough
    video.addEventListener('canplay', function () {
      if (video.paused) ensureGlobePlaying();
    }, { once: true });
  }

  function savePosition() {
    if (video && !video.paused && video.duration) {
      sessionStorage.setItem(KEY_TIME, String(video.currentTime));
      sessionStorage.setItem(KEY_TS,   String(Date.now()));
    }
  }

  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('pagehide', savePosition);

  /* ========== Page Transitions ========== */

  if (!overlay) return;

  // Reveal the page: wait for globe to be ready, then fade out overlay
  function revealPage() {
    overlay.style.opacity = '0';
  }

  // Small delay lets the globe video seek + start behind the overlay
  // before we reveal the page. 80ms is enough for cached video.
  setTimeout(revealPage, 80);

  // Intercept internal link clicks: fade to black, then navigate
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link || link.target) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    // Skip same-page anchors
    if (url.pathname === location.pathname && url.hash) return;

    e.preventDefault();
    savePosition();

    // Fade to black
    overlay.style.transition = 'opacity 0.3s ease-in';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';

    var dest = link.href;
    setTimeout(function () {
      window.location.href = dest;
    }, 300);
  });

})();
