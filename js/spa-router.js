/**
 * Globe Continuity — keeps the spinning globe seamlessly synced across
 * page navigations. Saves the video's playback position on exit and
 * restores it on the next page load (accounting for navigation time),
 * so the globe appears to spin continuously without restarting.
 */
(function () {
  'use strict';

  var video = document.querySelector('.spinning-globe video');
  if (!video) return;

  var KEY_TIME = 'globeTime';
  var KEY_TS   = 'globeTimestamp';

  /* ---- Restore position & play ---- */
  function seekAndPlay() {
    var savedTime = parseFloat(sessionStorage.getItem(KEY_TIME));
    var savedTs   = parseInt(sessionStorage.getItem(KEY_TS), 10);

    if (!isNaN(savedTime) && !isNaN(savedTs) && video.duration) {
      var elapsed = (Date.now() - savedTs) / 1000;
      video.currentTime = (savedTime + elapsed) % video.duration;
    }
    video.play().catch(function () {});
  }

  // Seek as soon as we know the video's duration
  if (video.readyState >= 1) {
    seekAndPlay();
  } else {
    video.addEventListener('loadedmetadata', seekAndPlay, { once: true });
  }

  /* ---- Save position before leaving ---- */
  function savePosition() {
    if (!video.paused && video.duration) {
      sessionStorage.setItem(KEY_TIME, String(video.currentTime));
      sessionStorage.setItem(KEY_TS,   String(Date.now()));
    }
  }

  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('pagehide', savePosition);

  // Also save on internal link clicks for extra reliability (mobile Safari)
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (link && link.href && !link.target &&
        new URL(link.href, location.href).origin === location.origin) {
      savePosition();
    }
  });
})();
