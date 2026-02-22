/**
 * SPA Router — keeps the spinning globe video persistent across page navigations.
 * Intercepts internal link clicks, fetches new page via AJAX, swaps .wrapper content.
 */
(function () {
  'use strict';

  // Only run if the spinning globe exists
  if (!document.querySelector('.spinning-globe')) return;

  // Internal pages we handle
  var PAGES = ['index.html', 'projects.html', 'contacts.html', 'iprincestories.html'];

  function isInternalLink(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      var path = url.pathname.split('/').pop() || 'index.html';
      return PAGES.indexOf(path) !== -1;
    } catch (e) {
      return false;
    }
  }

  function getPageName(href) {
    var url = new URL(href, window.location.origin);
    return url.pathname.split('/').pop() || 'index.html';
  }

  function swapPage(href, pushState) {
    var pageName = getPageName(href);

    fetch(href, { cache: 'no-cache' })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // Get the new wrapper
        var newWrapper = doc.querySelector('.wrapper');
        var oldWrapper = document.querySelector('.wrapper');

        if (!newWrapper || !oldWrapper) {
          // Fallback: normal navigation
          window.location.href = href;
          return;
        }

        // Swap wrapper
        oldWrapper.replaceWith(newWrapper);

        // Update page title
        document.title = doc.title;

        // Update active menu states
        var menuItems = document.querySelectorAll('.menu__item a');
        menuItems.forEach(function (a) {
          a.parentElement.classList.remove('active');
          var linkPage = getPageName(a.href);
          if (linkPage === pageName) {
            a.parentElement.classList.add('active');
          }
        });

        // Push to browser history
        if (pushState) {
          history.pushState({ page: pageName }, document.title, href);
        }

        // Scroll to top
        window.scrollTo(0, 0);

        // Re-initialize page scripts
        reinitPage();
      })
      .catch(function () {
        // On error, fall back to normal navigation
        window.location.href = href;
      });
  }

  function reinitPage() {
    // Re-inject cross decorations
    addCodeToClass('block-cross-in', '<span class="block-cross-in__left-crosses"></span><span class="block-cross-in__right-crosses"></span>');
    addCodeToClass('block-cross-in-link', '<span class="block-cross-in-link__left-elements"></span><span class="block-cross-in-link__right-elements"></span>');
    addCodeToClass('block-cross-out', '<span class="block-cross-out__left-crosses"></span> <span class="block-cross-out__right-crosses"></span>');

    // Re-init Rellax
    try { new Rellax('.rellax'); } catch (e) { }

    // Re-init Typed.js
    try {
      var typedEl = document.querySelector('.typing-text__text');
      if (typedEl) {
        typedEl.innerHTML = '';
        new Typed('.typing-text__text', {
          stringsElement: '#typed-strings',
          typeSpeed: 40,
          startDelay: 500,
          backDelay: 2000,
          loop: true,
          backSpeed: 15,
          smartBackspace: true
        });
      }
    } catch (e) { }

    // Re-init Swipers
    try {
      if (document.querySelector('.comments__slider')) {
        new Swiper('.comments__slider', {
          observer: true, observeParents: true,
          slidesPerView: 1, spaceBetween: 0,
          autoHeight: true, speed: 800,
          allowTouchMove: true, effect: 'fade',
          fadeEffect: { crossFade: true },
          pagination: {
            el: '.swiper-pagination', type: 'fraction',
            formatFractionCurrent: function (c) { return c.toString().padStart(2, 0); },
            formatFractionTotal: function (t) { return t.toString().padStart(2, 0); }
          },
          navigation: { prevEl: '.swiper-button-prev', nextEl: '.swiper-button-next' },
          breakpoints: { 960: { allowTouchMove: false } }
        });
      }
    } catch (e) { }

    try {
      if (document.querySelector('.stories-slider')) {
        new Swiper('.stories-slider', {
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
      }
    } catch (e) { }

    // Re-init cascade slider
    try {
      var cascadeSlider = document.querySelector('.cascade-slider');
      if (cascadeSlider) {
        var slides = document.querySelectorAll('.cascade-slider__item');
        var count = slides.length;
        var offsetY, height;
        function getOffset() { offsetY = cascadeSlider.getBoundingClientRect().top + window.scrollY; }
        function getHeight() { height = cascadeSlider.getBoundingClientRect().height; }
        function animate() {
          var bottom = offsetY + height;
          var slideH = height / count;
          if (window.scrollY > offsetY && window.scrollY < bottom) {
            for (var i = 0; i < count; i++) {
              var s = 1 - 0.04 * (window.scrollY - offsetY + 56 - slideH * i) / slideH;
              var o = 1 - 0.2 * (window.scrollY - offsetY + 56 - slideH * i) / slideH;
              var t = 56 - 30 * (window.scrollY - offsetY + 56 - slideH * i) / slideH;
              if (s > 1) s = 1;
              slides[i].style.transform = 'scale(' + s + ')';
              slides[i].style.opacity = o;
              slides[i].style.top = t + 'px';
            }
          } else {
            for (var j = 0; j < count; j++) {
              slides[j].style.transform = 'scale(1)';
              slides[j].style.opacity = 1;
              slides[j].style.top = '56px';
            }
          }
        }
        getOffset();
        setTimeout(function () { getHeight(); animate(); }, 200);
        window.addEventListener('scroll', animate);
        window.addEventListener('resize', function () { getOffset(); setTimeout(getHeight, 200); });
      }
    } catch (e) { }

    // Re-init numbers columns
    try {
      var numCols = document.querySelectorAll('.numbers-column');
      if (numCols.length) {
        numCols.forEach(function (col) {
          if (!col.hasChildNodes() || col.children.length === 0) {
            for (var i = 1; i <= 50; i++) col.insertAdjacentHTML('beforeend', i + '<br>');
          }
        });
      }
    } catch (e) { }

    // Make animated elements visible (skip preload animation on SPA nav)
    document.querySelectorAll('._text-anim-origin').forEach(function (el) { el.style.opacity = '100%'; });
    document.querySelectorAll('.media-block__animate-text').forEach(function (el) { el.style.display = 'none'; });
    document.querySelectorAll('._img-anim-hidden').forEach(function (el) { el.style.opacity = '100%'; });

    // Re-attach SPA link handlers on new content
    attachLinkHandlers();
  }

  function addCodeToClass(className, htmlCode) {
    var els = document.getElementsByClassName(className);
    for (var i = 0; i < els.length; i++) {
      // Only inject if not already present
      if (!els[i].querySelector('span')) {
        els[i].insertAdjacentHTML('afterbegin', htmlCode);
      }
    }
  }

  function attachLinkHandlers() {
    document.querySelectorAll('a').forEach(function (link) {
      if (link.dataset.spaAttached) return;
      link.dataset.spaAttached = 'true';

      if (isInternalLink(link.href)) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var href = this.href;
          // Don't navigate if already on this page
          if (getPageName(href) === getPageName(window.location.href)) {
            window.scrollTo(0, 0);
            return;
          }
          swapPage(href, true);
        });
      }
    });
  }

  // Handle browser back/forward
  window.addEventListener('popstate', function (e) {
    swapPage(window.location.href, false);
  });

  // Initial setup
  attachLinkHandlers();

  // Store initial state
  history.replaceState({ page: getPageName(window.location.href) }, document.title, window.location.href);
})();
