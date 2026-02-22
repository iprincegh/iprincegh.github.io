/**
 * SPA Router — Persistent Globe & Smooth Page Transitions
 *
 * The globe video element is NEVER removed from the DOM. Only the .wrapper
 * (page content) is swapped via fetch + DOMParser with smooth fade animations.
 * All interactive JS components are properly reinitialized after each swap.
 */
(function () {
  'use strict';

  // ─── Configuration ───
  var FADE_OUT = 200;   // ms wrapper fades out
  var FADE_IN  = 350;   // ms wrapper fades in

  // ─── State ───
  var navigating   = false;
  var cleanupFns   = [];
  var prefetchCache = {};

  // ─── Persistent DOM ───
  var overlay = document.querySelector('.page-transition');

  // ─── Initial page load: fade out the black overlay ───
  if (overlay) {
    // Fade overlay as soon as possible (globe has autoplay, images are preloaded)
    setTimeout(function () { overlay.style.opacity = '0'; }, 50);
    setTimeout(function () { overlay.style.display = 'none'; }, 450);
  }

  // ─── Prefetch pages on hover for instant navigation ───
  document.addEventListener('mouseenter', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || link.target) return;
    try {
      var url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      if (prefetchCache[url.pathname]) return;
      fetch(url.href)
        .then(function (r) { return r.text(); })
        .then(function (html) { prefetchCache[url.pathname] = html; })
        .catch(function () {});
    } catch (err) {}
  }, true);

  // ─── Intercept internal link clicks ───
  document.addEventListener('click', function (e) {
    if (navigating) return;
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || link.target) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    // Skip non-HTML links (files, images, etc.)
    if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|webm|ico)$/i.test(url.pathname)) return;

    e.preventDefault();
    navigateTo(url.href, true);
  });

  // ─── Handle browser back / forward ───
  window.addEventListener('popstate', function () {
    if (!navigating) navigateTo(location.href, false);
  });

  // ═══════════════════════════════════════════════
  //  Core SPA Navigation
  // ═══════════════════════════════════════════════
  function navigateTo(href, pushState) {
    if (navigating) return;
    navigating = true;

    var wrapper = document.querySelector('.wrapper');
    if (!wrapper) { window.location.href = href; return; }

    // Cleanup components from current page
    cleanup();

    // ── Fade out current wrapper ──
    wrapper.style.transition = 'opacity ' + FADE_OUT + 'ms ease-in';
    wrapper.style.opacity = '0';

    var pathname;
    try { pathname = new URL(href, location.href).pathname; } catch (e) { pathname = ''; }

    setTimeout(function () {
      var cached = prefetchCache[pathname];
      if (cached) {
        processHTML(cached, href, pushState, wrapper);
      } else {
        fetch(href)
          .then(function (resp) {
            if (!resp.ok) throw new Error(resp.status);
            return resp.text();
          })
          .then(function (html) {
            processHTML(html, href, pushState, wrapper);
          })
          .catch(function () {
            navigating = false;
            window.location.href = href;
          });
      }
    }, FADE_OUT + 20);
  }

  function processHTML(html, href, pushState, oldWrapper) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var newWrapper = doc.querySelector('.wrapper');
    if (!newWrapper) { navigating = false; window.location.href = href; return; }

    // ── Update <head> metadata ──
    document.title = doc.title;
    updateAttr('link[rel="canonical"]', 'href', doc);
    updateAttr('meta[name="description"]', 'content', doc);

    // ── Replace wrapper ──
    oldWrapper.replaceWith(newWrapper);

    // ── Scroll to top ──
    window.scrollTo(0, 0);

    // ── Fade in new wrapper ──
    newWrapper.style.opacity = '0';
    newWrapper.offsetHeight; // force reflow
    newWrapper.style.transition = 'opacity ' + FADE_IN + 'ms ease-out';
    newWrapper.style.opacity = '1';
    setTimeout(function () {
      newWrapper.style.transition = '';
      newWrapper.style.opacity = '';
    }, FADE_IN + 50);

    // ── Update browser history ──
    if (pushState) history.pushState(null, '', href);

    // ── Skip entrance animations — show everything immediately ──
    showContentImmediately(newWrapper);

    // ── Reinitialize JS components for new content ──
    reinitComponents(newWrapper);

    // ── Setup lazy videos (used on about page) ──
    setupLazyVideos(newWrapper);

    navigating = false;
  }

  // ═══════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════

  function updateAttr(selector, attr, doc) {
    var n = doc.querySelector(selector);
    var o = document.querySelector(selector);
    if (n && o) o[attr] = n[attr];
  }

  /** Show all animated elements immediately (skip entrance animations on SPA nav) */
  function showContentImmediately(wrapper) {
    wrapper.querySelectorAll('._text-anim-origin').forEach(function (el) {
      el.style.opacity = '100%';
    });
    wrapper.querySelectorAll('.media-block__animate-text').forEach(function (el) {
      el.style.display = 'none';
    });
    wrapper.querySelectorAll('._img-anim-hidden').forEach(function (el) {
      el.style.opacity = '100%';
    });
    // Hide preload text holders if present (about page)
    var orig = wrapper.querySelector('#preload-text-original');
    if (orig) orig.style.display = 'none';
    var holder = wrapper.querySelector('#preload-text-position-holder');
    if (holder) holder.style.opacity = '100%';
  }

  /** Destroy components created by a previous SPA navigation */
  function cleanup() {
    cleanupFns.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  // ═══════════════════════════════════════════════
  //  Component Reinitialization
  //  (mirrors what app.min.js does on first load)
  // ═══════════════════════════════════════════════
  function reinitComponents(wrapper) {

    // ── Cross decorations ──
    addDecoration(wrapper, 'block-cross-in',
      '<span class="block-cross-in__left-crosses"></span><span class="block-cross-in__right-crosses"></span>');
    addDecoration(wrapper, 'block-cross-in-link',
      '<span class="block-cross-in-link__left-elements"></span><span class="block-cross-in-link__right-elements"></span>');
    addDecoration(wrapper, 'block-cross-out',
      '<span class="block-cross-out__left-crosses"></span> <span class="block-cross-out__right-crosses"></span>');

    // ── Numbers columns (projects page) ──
    wrapper.querySelectorAll('.numbers-column').forEach(function (col) {
      if (col.childElementCount === 0) {
        for (var i = 1; i <= 50; i++) col.insertAdjacentHTML('beforeend', i + '<br>');
      }
    });

    // ── Swiper: Comments slider (about page) ──
    if (wrapper.querySelector('.comments__slider')) {
      var cSwiper = new Swiper('.comments__slider', {
        observer: true, observeParents: true,
        slidesPerView: 1, spaceBetween: 0,
        autoHeight: true, speed: 800,
        allowTouchMove: true,
        effect: 'fade', fadeEffect: { crossFade: true },
        pagination: {
          el: '.swiper-pagination', type: 'fraction',
          formatFractionCurrent: function (c) { return c.toString().padStart(2, '0'); },
          formatFractionTotal:   function (t) { return t.toString().padStart(2, '0'); }
        },
        navigation: { prevEl: '.swiper-button-prev', nextEl: '.swiper-button-next' },
        breakpoints: { 960: { allowTouchMove: false } },
        on: { init: function () { initShowMore(wrapper, cSwiper); } }
      });
      cleanupFns.push(function () { cSwiper.destroy(true, true); });
    }

    // ── Swiper: Stories slider (projects page) ──
    if (wrapper.querySelector('.stories-slider')) {
      var sSwiper = new Swiper('.stories-slider', {
        observer: true, observeParents: true,
        autoHeight: false, speed: 5000,
        allowTouchMove: true, keyboard: true,
        pagination: false, centeredSlides: true,
        navigation: false, slidesPerView: 'auto',
        loop: true, spaceBetween: 24,
        freeMode: true,
        autoplay: { delay: 1, disableOnInteraction: false },
        breakpoints: { 320: { spaceBetween: 16 }, 720: { spaceBetween: 24 } }
      });
      cleanupFns.push(function () { sSwiper.destroy(true, true); });
    }

    // ── Rellax parallax ──
    if (wrapper.querySelector('.rellax')) {
      try {
        var rellax = new Rellax('.rellax');
        cleanupFns.push(function () { rellax.destroy(); });
      } catch (e) {}
    }

    // ── Typed.js ──
    if (wrapper.querySelector('.typing-text__text') && wrapper.querySelector('#typed-strings')) {
      try {
        var typed = new Typed('.typing-text__text', {
          stringsElement: '#typed-strings',
          typeSpeed: 40, startDelay: 500, backDelay: 2000,
          loop: true, backSpeed: 15, smartBackspace: true
        });
        cleanupFns.push(function () { typed.destroy(); });
      } catch (e) {}
    }

    // ── Cascade slider (scroll-driven, projects page) ──
    var cs = wrapper.querySelector('.cascade-slider');
    if (cs) {
      var items   = wrapper.querySelectorAll('.cascade-slider__item');
      var count   = items.length;
      var csH, csY;

      function getY() { csY = cs.getBoundingClientRect().top + window.scrollY; }
      function getH() { csH = cs.getBoundingClientRect().height; }
      function animate() {
        if (!csH) return;
        var slideH = csH / count;
        if (window.scrollY > csY && window.scrollY < csY + csH) {
          for (var i = 0; i < count; i++) {
            var r = (window.scrollY - csY + 56 - slideH * i) / slideH;
            items[i].style.transform = 'scale(' + Math.min(1, 1 - 0.04 * r) + ')';
            items[i].style.opacity   = 1 - 0.2 * r;
            items[i].style.top       = (56 - 30 * r) + 'px';
          }
        } else {
          for (var j = 0; j < count; j++) {
            items[j].style.transform = 'scale(1)';
            items[j].style.opacity   = 1;
            items[j].style.top       = '56px';
          }
        }
      }

      getY();
      setTimeout(function () { getH(); animate(); }, 200);

      var onScroll = function () { animate(); };
      var onResize = function () { getY(); setTimeout(getH, 200); };
      window.addEventListener('scroll', onScroll);
      window.addEventListener('resize', onResize);
      cleanupFns.push(function () {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      });
    }
  }

  /** Show-more buttons for comments slider */
  function initShowMore(wrapper, swiperInst) {
    wrapper.querySelectorAll('.comments__slide').forEach(function (slide) {
      var text = slide.querySelector('.slide-comm__text');
      var btn  = slide.querySelector('.slide-comm__button');
      if (!text || !btn) return;
      btn.style.display = text.classList.contains('needShowMore') ? 'block' : 'none';
    });
    wrapper.querySelectorAll('.slide-comm__button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.slide-comm__text').forEach(function (el) {
          if (el.classList.contains('opened-full-text')) {
            el.classList.remove('opened-full-text');
            if (el.nextElementSibling) el.nextElementSibling.classList.remove('opened-full-text');
          } else {
            el.classList.add('opened-full-text');
            if (el.nextElementSibling) el.nextElementSibling.classList.add('opened-full-text');
          }
        });
        swiperInst.updateAutoHeight(300);
      });
    });
  }

  /** Add cross decoration spans to elements */
  function addDecoration(wrapper, className, htmlCode) {
    var els = wrapper.getElementsByClassName(className);
    for (var i = 0; i < els.length; i++) {
      els[i].insertAdjacentHTML('afterbegin', htmlCode);
    }
  }

  /** Lazy-load videos when they scroll into view */
  function setupLazyVideos(wrapper) {
    var vids = wrapper.querySelectorAll('video[data-lazy-src]');
    if (!vids.length) return;
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var v = entry.target;
            v.src = v.dataset.lazySrc;
            v.removeAttribute('data-lazy-src');
            v.play();
            obs.unobserve(v);
          }
        });
      }, { rootMargin: '200px' });
      vids.forEach(function (v) { obs.observe(v); });
      cleanupFns.push(function () { obs.disconnect(); });
    } else {
      vids.forEach(function (v) { v.src = v.dataset.lazySrc; v.play(); });
    }
  }

})();
