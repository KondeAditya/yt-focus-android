/**
 * WebView JavaScript injection scripts for YouTube customization.
 * Includes UI customization and optional content filtering.
 */

import { getAdFilterScript } from './contentFilter';

// ─── Hide Shorts Script ────────────────────────────────────────
/**
 * Returns JavaScript that hides YouTube Shorts-related UI elements.
 * Uses a MutationObserver for dynamic content and wraps everything
 * in try/catch for graceful degradation if YouTube changes its DOM.
 */
export function getHideShortsScript(): string {
  return `
    (function() {
      'use strict';
      try {
        var SHORTS_SELECTORS = [
          'ytd-reel-shelf-renderer',
          'ytd-rich-shelf-renderer[is-shorts]',
          'ytd-guide-entry-renderer:has(a[title="Shorts"])',
          'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
          'ytd-video-renderer:has([overlay-style="SHORTS"])',
          'ytd-grid-video-renderer:has([overlay-style="SHORTS"])',
          'ytd-rich-item-renderer:has([overlay-style="SHORTS"])',
          'yt-tab-shape[tab-title="Shorts"]',
          'ytm-reel-shelf-renderer',
          'ytm-shorts-lockup-view-model',
          'ytm-pivot-bar-item-renderer:has(.pivot-shorts)',
          'ytm-pivot-bar-item-renderer:nth-child(2)', // Mobile bottom nav shorts tab
          'a[href^="/shorts"]', // Any link to a short
          'a[href*="/shorts/"]'
        ];

        var SHORTS_STYLE_ID = '__ytfocus_hide_shorts_style';

        function injectShortsCSS() {
          if (document.getElementById(SHORTS_STYLE_ID)) return;
          var style = document.createElement('style');
          style.id = SHORTS_STYLE_ID;
          style.textContent = SHORTS_SELECTORS.map(function(sel) {
            return sel + ' { display: none !important; }';
          }).join('\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        function hideShortElements() {
          try {
            SHORTS_SELECTORS.forEach(function(selector) {
              try {
                var elements = document.querySelectorAll(selector);
                elements.forEach(function(el) {
                  if (el && el.style) {
                    el.style.setProperty('display', 'none', 'important');
                  }
                });
              } catch(e) {}
            });

            // Aggressive Inner-Text scanning to kill the bottom nav tab and home chips
            var allDivs = document.querySelectorAll('div, span, yt-formatted-string');
            for (var i = 0; i < allDivs.length; i++) {
              var el = allDivs[i];
              if (el.textContent && el.textContent.trim() === 'Shorts') {
                // If this is inside a pivot bar (bottom nav), kill the whole tab
                var pivotItem = el.closest('ytm-pivot-bar-item-renderer, ytd-mini-guide-entry-renderer, ytd-guide-entry-renderer');
                if (pivotItem) {
                  pivotItem.style.setProperty('display', 'none', 'important');
                }
                
                // If this is a chip cloud filter
                var chipItem = el.closest('yt-chip-cloud-chip-renderer, ytm-chip-cloud-chip-renderer');
                if (chipItem) {
                  chipItem.style.setProperty('display', 'none', 'important');
                }
              }
            }
          } catch(e) {}
        }

        // Inject CSS immediately
        injectShortsCSS();
        // Also do direct DOM hiding
        hideShortElements();

        // Observe DOM mutations for dynamically loaded content
        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectShortsCSS();
              hideShortElements();
            }, 150);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        // Re-run on page transitions (YouTube SPA navigation)
        var lastUrl = location.href;
        setInterval(function() {
          if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(function() {
              injectShortsCSS();
              hideShortElements();
            }, 500);
          }
          
          // ABSOLUTE NUKE: If URL ever becomes a shorts URL, redirect to home instantly
          if (window.location.pathname.indexOf('/shorts') === 0) {
             window.location.replace('/');
          }
        }, 100);

        // Monkey-patch SPA navigations
        var originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
          if (typeof url === 'string' && url.indexOf('/shorts') > -1) {
            arguments[2] = '/';
          }
          return originalPushState.apply(this, arguments);
        };

        var originalReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
          if (typeof url === 'string' && url.indexOf('/shorts') > -1) {
            arguments[2] = '/';
          }
          return originalReplaceState.apply(this, arguments);
        };

      } catch(e) {
        // Complete failure — YouTube still works, just Shorts visible
      }
    })();
    true;
  `;
}

// ─── No-op Script ───────────────────────────────────────────────
/**
 * Returns a no-op script when Hide Shorts is disabled.
 */
export function getNoopScript(): string {
  return 'true;';
}

// ─── Mobile YouTube Enhancements ────────────────────────────────
/**
 * Returns JavaScript that enhances the mobile YouTube experience:
 * 1. Sets viewport meta tag to prevent zoom issues.
 * 2. Permanently removes the 'Open App' banner and button.
 */
export function getEnhancementScript(): string {
  return `
    (function() {
      'use strict';
      try {
        // Prevent text size adjustment issues
        var metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
          metaViewport = document.createElement('meta');
          metaViewport.name = 'viewport';
          metaViewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
          document.head.appendChild(metaViewport);
        }

        // ── Remove 'Open App' Buttons and Banners Everywhere ──
        var OPEN_APP_STYLE_ID = '__zentube_hide_open_app_style';
        if (!document.getElementById(OPEN_APP_STYLE_ID)) {
          var style = document.createElement('style');
          style.id = OPEN_APP_STYLE_ID;
          style.textContent = [
            '[aria-label*="Open App" i],',
            '[aria-label*="Open in app" i],',
            '.promo-app-install,',
            'ytm-open-app-button,',
            '.c-header-app-button,',
            '.mobile-topbar-header-endpoint:has(button),',
            'a[href*="youtube.com/app"],',
            'a[href*="app.adjust.com"],',
            '.ytm-open-app-button {',
            '  display: none !important;',
            '}'
          ].join('\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        function removeOpenAppElements() {
          try {
            var buttons = document.querySelectorAll('button, a, ytm-open-app-button, .mobile-topbar-header-endpoint');
            for (var i = 0; i < buttons.length; i++) {
              var el = buttons[i];
              var text = (el.textContent || '').trim().toLowerCase();
              if (text === 'open app' || text === 'open in app' || text === 'get app') {
                var container = el.closest('ytm-open-app-button, .mobile-topbar-header-endpoint, .header-action-button') || el;
                container.style.setProperty('display', 'none', 'important');
              }
            }
          } catch(e) {}
        }

        removeOpenAppElements();
        setInterval(removeOpenAppElements, 1000);
      } catch(e) {
        // Ignore
      }
    })();
    true;
  `;
}

// ─── Complete In-Page Fullscreen Engine ────────────────────────
/**
 * Enables complete edge-to-edge fullscreen for YouTube without launching
 * iOS WebKit's native AVPlayer:
 * 1. Expands #movie_player to fill 100vw x 100vh with fixed positioning.
 * 2. Hides the header bar, video title/likes, and right-column recommended videos.
 * 3. Keeps YouTube's native touch controls (play/pause, scrubber, gear icon for 1080p quality & speed) fully accessible.
 * 4. Rotates device to landscape and restores portrait on exit.
 */
export function getFullscreenInterceptorScript(): string {
  return `
    (function() {
      'use strict';
      if (window.__zenTubeFSInstalled) return;
      window.__zenTubeFSInstalled = true;

      var isLandscapeFS = false;
      var lastToggleTime = 0;
      var FS_STYLE_ID = '__zentube_complete_fs_style';

      // ── 1. Inject Complete Fullscreen CSS ──
      function injectCompleteFSCSS() {
        if (document.getElementById(FS_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = FS_STYLE_ID;
        style.textContent = [
          // ── Root page lockdown in fullscreen ──
          'html.__yt_zen_fullscreen, body.__yt_zen_fullscreen {',
          '  overflow: hidden !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  margin: 0 !important;',
          '  padding: 0 !important;',
          '  background: #000 !important;',
          '  position: fixed !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '}',

          // ── Hide page chrome & recommendation feed below video ──
          'html.__yt_zen_fullscreen #header-bar,',
          'html.__yt_zen_fullscreen ytm-header-bar,',
          'html.__yt_zen_fullscreen ytm-mobile-topbar-renderer,',
          'html.__yt_zen_fullscreen ytm-pivot-bar-renderer,',
          'html.__yt_zen_fullscreen .pivot-bar,',
          'html.__yt_zen_fullscreen .watch-below-the-player,',
          'html.__yt_zen_fullscreen #below,',
          'html.__yt_zen_fullscreen ytm-single-column-watch-next-results-renderer,',
          'html.__yt_zen_fullscreen .related-items-container,',
          'html.__yt_zen_fullscreen #related,',
          'html.__yt_zen_fullscreen #comments {',
          '  display: none !important;',
          '}',

          // ── App & Watch containers fill screen ──
          'html.__yt_zen_fullscreen ytm-app,',
          'html.__yt_zen_fullscreen #app,',
          'html.__yt_zen_fullscreen ytm-watch {',
          '  transform: none !important;',
          '  perspective: none !important;',
          '  filter: none !important;',
          '  overflow: visible !important;',
          '  padding: 0 !important;',
          '  margin: 0 !important;',
          '  max-width: none !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '}',

          // ── Fixed Player Container (Edge-to-Edge) ──
          'html.__yt_zen_fullscreen #player-container-id,',
          'html.__yt_zen_fullscreen ytm-watch #player-container-id,',
          'html.__yt_zen_fullscreen .player-container,',
          'html.__yt_zen_fullscreen ytm-watch .player-container {',
          '  position: fixed !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  max-width: 100vw !important;',
          '  max-height: 100vh !important;',
          '  min-width: 100vw !important;',
          '  min-height: 100vh !important;',
          '  z-index: 1000 !important;',
          '  background: #000 !important;',
          '  border-radius: 0 !important;',
          '  margin: 0 !important;',
          '  padding: 0 !important;',
          '  box-sizing: border-box !important;',
          '  overflow: hidden !important;',
          '}',

          'html.__yt_zen_fullscreen #player,',
          'html.__yt_zen_fullscreen #movie_player,',
          'html.__yt_zen_fullscreen .html5-video-player,',
          'html.__yt_zen_fullscreen .player-wrapper,',
          'html.__yt_zen_fullscreen .html5-video-container {',
          '  position: absolute !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  width: 100% !important;',
          '  height: 100% !important;',
          '  max-width: 100% !important;',
          '  max-height: 100% !important;',
          '  min-width: 100% !important;',
          '  min-height: 100% !important;',
          '  background: transparent !important;',
          '  border-radius: 0 !important;',
          '  margin: 0 !important;',
          '  padding: 0 !important;',
          '  box-sizing: border-box !important;',
          '  z-index: 1 !important;',
          '}',

          'html.__yt_zen_fullscreen video,',
          'html.__yt_zen_fullscreen .html5-main-video {',
          '  position: absolute !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  width: 100% !important;',
          '  height: 100% !important;',
          '  max-width: 100% !important;',
          '  max-height: 100% !important;',
          '  object-fit: contain !important;',
          '  background: #000 !important;',
          '  z-index: 1 !important;',
          '}',

          // ── SOLVE MORE VIDEOS, SHARE, SAVE OVERLAP ON RESIZE & SCRUBBER ──
          'html.__yt_zen_fullscreen button[aria-label*="More videos" i],',
          'html.__yt_zen_fullscreen .ytm-more-videos-button,',
          'html.__yt_zen_fullscreen .more-videos-button,',
          'html.__yt_zen_fullscreen button[aria-label*="Share" i],',
          'html.__yt_zen_fullscreen button[aria-label*="Save" i],',
          'html.__yt_zen_fullscreen button[aria-label*="Remix" i],',
          'html.__yt_zen_fullscreen button[aria-label*="Dislike" i],',
          'html.__yt_zen_fullscreen button[aria-label*="Like" i],',
          'html.__yt_zen_fullscreen .slim-video-action-bar-actions,',
          'html.__yt_zen_fullscreen ytm-slim-video-action-bar-renderer,',
          'html.__yt_zen_fullscreen .ytp-pause-overlay,',
          'html.__yt_zen_fullscreen .ytp-expand-pause-overlay,',
          'html.__yt_zen_fullscreen .ytp-suggestion-set,',
          'html.__yt_zen_fullscreen .fullscreen-engagement-overlay,',
          'html.__yt_zen_fullscreen ytm-fullscreen-engagement-overlay,',
          'html.__yt_zen_fullscreen ytm-engagement-panel-section-list-renderer,',
          'html.__yt_zen_fullscreen .engagement-panel-container,',
          'html.__yt_zen_fullscreen .ytp-ce-element,',
          'html.__yt_zen_fullscreen .ytp-endscreen-content,',
          'html.__yt_zen_fullscreen .ytp-cards-teaser,',
          'html.__yt_zen_fullscreen .ytp-suggested-action-badge {',
          '  display: none !important;',
          '}',

          // ── PERMANENTLY HIDE WEBKIT MEDIA CONTROLS & DESKTOP CHROME ──
          'video::-webkit-media-controls,',
          'video::-webkit-media-controls-enclosure,',
          'video::-webkit-media-controls-panel,',
          'video::-webkit-media-controls-play-button,',
          'video::-webkit-media-controls-start-playback-button,',
          'video::-webkit-media-controls-overlay-play-button,',
          'video::-webkit-media-controls-fullscreen-button,',
          'video::-webkit-media-controls-wireless-playback-picker-button,',
          'video::-webkit-media-controls-current-time-display,',
          'video::-webkit-media-controls-time-remaining-display,',
          'video::-webkit-media-controls-timeline,',
          'video::-webkit-media-controls-volume-slider,',
          'video::-webkit-media-controls-mute-button {',
          '  display: none !important;',
          '  -webkit-appearance: none !important;',
          '  opacity: 0 !important;',
          '  pointer-events: none !important;',
          '}',
          '.ytp-unmute,',
          '.ytp-unmute-box,',
          '.ytp-unmute-button,',
          '.ytp-unmute-inner,',
          '.ytp-volume-control-hover-text,',
          '.ytp-chrome-bottom,',
          '.ytp-chrome-top {',
          '  display: none !important;',
          '  visibility: hidden !important;',
          '  opacity: 0 !important;',
          '  pointer-events: none !important;',
          '}',

          // ── SETTINGS POPUP MENU (Quality 1080p, Playback speed, Subtitles) ──
          'html.__yt_zen_fullscreen ytm-menu-popup-renderer,',
          'html.__yt_zen_fullscreen .ytm-menu-popup-renderer,',
          'html.__yt_zen_fullscreen tp-yt-iron-dropdown,',
          'html.__yt_zen_fullscreen ytm-bottom-sheet-renderer,',
          'html.__yt_zen_fullscreen ytm-sheet,',
          'html.__yt_zen_fullscreen yt-sheet-renderer,',
          'html.__yt_zen_fullscreen .menu-content,',
          'html.__yt_zen_fullscreen .dropdown-content,',
          'html.__yt_zen_fullscreen [role="dialog"],',
          'html.__yt_zen_fullscreen [role="menu"] {',
          '  z-index: 2147483647 !important;',
          '  pointer-events: auto !important;',
          '}',

          'html.__yt_zen_fullscreen tp-yt-iron-overlay-backdrop,',
          'html.__yt_zen_fullscreen .bottom-sheet-overlay {',
          '  z-index: 2147483640 !important;',
          '  pointer-events: auto !important;',
          '}'
        ].join('\\n');
        (document.head || document.documentElement).appendChild(style);
      }

      injectCompleteFSCSS();

      function notifyReactNative(isFS) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fullscreen',
            isFullscreen: isFS
          }));
        }
      }

      function enforceInlineVideo(v) {
        if (!v) return;
        try {
          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.playsInline = true;
          v.webkitPlaysInline = true;
          v.removeAttribute('controls');
        } catch(e) {}
      }

      function ensureVideoAudio() {
        try {
          var v = document.querySelector('video');
          if (v) {
            enforceInlineVideo(v);
            if (v.muted) v.muted = false;
            if (v.volume === 0) v.volume = 1;
          }
        } catch(e) {}
      }

      function enterCompleteFullscreen(video) {
        lastToggleTime = Date.now();
        injectCompleteFSCSS();
        isLandscapeFS = true;
        document.documentElement.classList.add('__yt_zen_fullscreen');
        document.body.classList.add('__yt_zen_fullscreen');

        // Ensure audio is unmuted and mobile overlay is visible
        ensureVideoAudio();

        var overlay = document.querySelector('.player-control-overlay');
        if (overlay) {
          overlay.classList.remove('fade-out');
          overlay.classList.add('fade-in');
        }

        notifyReactNative(true);
      }

      function exitCompleteFullscreen(video) {
        lastToggleTime = Date.now();
        isLandscapeFS = false;

        document.documentElement.classList.remove('__yt_zen_fullscreen');
        document.body.classList.remove('__yt_zen_fullscreen');

        notifyReactNative(false);

        // Remove any fixed inline styles
        var playerContainer = document.querySelector('#player-container-id') || document.querySelector('.player-container');
        if (playerContainer) {
          playerContainer.style.removeProperty('position');
          playerContainer.style.removeProperty('top');
          playerContainer.style.removeProperty('left');
          playerContainer.style.removeProperty('width');
          playerContainer.style.removeProperty('height');
          playerContainer.style.removeProperty('z-index');
          try { playerContainer.scrollIntoView(); } catch(e) {}
        }

        // Multi-stage resize dispatch so YouTube smoothly reflows to portrait layout
        window.dispatchEvent(new Event('resize'));
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 150);
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 300);
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 600);
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 1000);

        // Ensure video is visible and playing without blank screen
        setTimeout(function() {
          var v = document.querySelector('video');
          if (v) {
            v.style.removeProperty('display');
            v.style.removeProperty('visibility');
            if (v.paused && !v.userHitPause) {
              try { v.play(); } catch(e) {}
            }
          }
        }, 150);
      }

      // ── Hotstar-style WebKit Fullscreen Neutralization ──
      // Prevents WebKit native media controls and AVPlayer from ever taking over
      try {
        Object.defineProperty(HTMLVideoElement.prototype, 'webkitDisplayingFullscreen', {
          configurable: true,
          get: function() {
            return false;
          }
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'webkitSupportsFullscreen', {
          configurable: true,
          get: function() {
            return false;
          }
        });
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          get: function() {
            return isLandscapeFS ? (document.querySelector('#movie_player') || document.querySelector('video')) : null;
          }
        });
        Object.defineProperty(document, 'webkitFullscreenElement', {
          configurable: true,
          get: function() {
            return isLandscapeFS ? (document.querySelector('#movie_player') || document.querySelector('video')) : null;
          }
        });
        Object.defineProperty(document, 'webkitIsFullScreen', {
          configurable: true,
          get: function() {
            return false;
          }
        });
      } catch(e) {}

      document.exitFullscreen = function() {
        exitCompleteFullscreen();
        return Promise.resolve();
      };
      document.webkitExitFullscreen = function() {
        exitCompleteFullscreen();
      };

      // Neuter WebKit native fullscreen trigger completely (matches Hotstar implementation)
      HTMLVideoElement.prototype.webkitEnterFullscreen = function() {
        return false;
      };

      HTMLVideoElement.prototype.webkitExitFullscreen = function() {
        return false;
      };

      // ── Click / Tap interception ONLY for Fullscreen / Resize toggle button ──
      // All other taps (gear icon, play/pause, scrubber, quality menu) flow directly to YouTube!
      document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target) return;

        var fsBtn = target.closest(
          '.fullscreen-icon, ' +
          'button.fullscreen-icon, ' +
          'button[aria-label*="Exit full screen" i], ' +
          'button[aria-label*="Exit fullscreen" i], ' +
          'button[aria-label*="Full screen" i], ' +
          'button[aria-label*="Fullscreen" i], ' +
          'button[aria-label*="Collapse" i], ' +
          'button.player-control-fullscreen, ' +
          '.ytm-fullscreen-button, ' +
          '.ytp-fullscreen-button, ' +
          '.ytp-collapse-button'
        );
        if (fsBtn) {
          e.preventDefault();
          e.stopPropagation();
          var now = Date.now();
          if (now - lastToggleTime < 1000) return;
          lastToggleTime = now;

          if (isLandscapeFS) {
            exitCompleteFullscreen();
          } else {
            enterCompleteFullscreen();
          }
          return;
        }
      }, true);

      // ── Swipe-down gesture to dismiss/exit fullscreen ──
      var touchStartY = 0;
      var touchStartX = 0;
      var touchStartTime = 0;

      window.addEventListener('touchstart', function(e) {
        if (!isLandscapeFS || !e.touches || e.touches.length !== 1) return;
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
      }, { passive: true });

      window.addEventListener('touchend', function(e) {
        if (!isLandscapeFS || !e.changedTouches || e.changedTouches.length !== 1) return;
        var deltaY = e.changedTouches[0].clientY - touchStartY;
        var deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
        var deltaTime = Date.now() - touchStartTime;

        // Swiped down (> 70px) mostly vertical within 600ms
        if (deltaY > 70 && deltaY > deltaX * 1.3 && deltaTime < 600) {
          exitCompleteFullscreen();
        }
      }, { passive: true });

      // Unmute on play
      document.addEventListener('play', ensureVideoAudio, true);

      // Handle SPA navigation / popstate to prevent blank screens
      window.addEventListener('popstate', function() {
        if (isLandscapeFS) exitCompleteFullscreen();
      });

      window.addEventListener('hashchange', function() {
        if (isLandscapeFS) exitCompleteFullscreen();
      });

      var lastCheckUrl = location.href;
      setInterval(function() {
        if (location.href !== lastCheckUrl) {
          lastCheckUrl = location.href;
          if (isLandscapeFS && location.pathname.indexOf('/watch') === -1) {
            exitCompleteFullscreen();
          }
        }
      }, 250);

      window.__exitZenTubeFullscreen = function() {
        exitCompleteFullscreen();
      };
    })();
    true;
  `;
}

// ─── Media Backgrounding & Picture-in-Picture Script ───────────
/**
 * Brave iOS-style MediaBackgrounding:
 * 1. Spoofs Document.prototype.visibilityState and hidden so web players never pause on minimize
 * 2. Intercepts unintended pause events when the app moves to background with multi-retry
 * 3. Provides window.__triggerZenTubePiP() to programmatically enter native iOS Picture-in-Picture
 * 4. Tracks foreground/background state to prevent WebView freezing on return
 */
export function getMediaBackgroundingScript(pipEnabled: boolean = true): string {
  return `
    (function() {
      'use strict';
      if (window.__zenTubeMediaBGInstalled) return;
      window.__zenTubeMediaBGInstalled = true;

      try {
        window.__zenTubePipEnabled = ${pipEnabled};
        window.__zenTubeIsBackground = false;

        // ── 1. Page Visibility Spoofing (Brave Shield MediaBackgrounding) ──
        try {
          Object.defineProperty(Document.prototype, 'visibilityState', {
            enumerable: true,
            configurable: true,
            get: function() { return 'visible'; }
          });
          Object.defineProperty(Document.prototype, 'hidden', {
            enumerable: true,
            configurable: true,
            get: function() { return false; }
          });
          // Block visibilitychange events from reaching listeners
          document.addEventListener('visibilitychange', function(e) {
            e.stopImmediatePropagation();
          }, true);
        } catch(e) {}

        // ── 2. Track User Pause vs Backgrounding Pause ──
        Object.defineProperty(HTMLVideoElement.prototype, 'userHitPause', {
          enumerable: false,
          configurable: true,
          writable: true,
          value: false
        });

        var origPause = HTMLVideoElement.prototype.pause;
        HTMLVideoElement.prototype.pause = function() {
          // Only mark as user pause if we're NOT in background
          if (!window.__zenTubeIsBackground) {
            this.userHitPause = true;
          }
          return origPause.apply(this, arguments);
        };

        var origPlay = HTMLVideoElement.prototype.play;
        HTMLVideoElement.prototype.play = function() {
          this.userHitPause = false;
          return origPlay.apply(this, arguments);
        };

        // ── 3. Picture-in-Picture Trigger Helper ──
        window.__triggerZenTubePiP = function() {
          try {
            var videos = document.querySelectorAll('video');
            for (var i = 0; i < videos.length; i++) {
              var v = videos[i];
              if (v && !v.paused) {
                v.setAttribute('playsinline', 'true');
                v.setAttribute('webkit-playsinline', 'true');
                v.playsInline = true;

                if (typeof v.webkitSetPresentationMode === 'function') {
                  v.webkitSetPresentationMode('picture-in-picture');
                  return true;
                } else if (typeof v.requestPictureInPicture === 'function') {
                  v.requestPictureInPicture().catch(function(){});
                  return true;
                }
              }
            }
          } catch(e) {}
          return false;
        };

        // ── 4. Multi-retry resume helper ──
        function tryResumeVideo(v, attempt) {
          if (!v || v.userHitPause || v.ended) return;
          if (v.paused) {
            try {
              var playPromise = origPlay.call(v);
              if (playPromise && playPromise.catch) {
                playPromise.catch(function() {
                  // If play failed and we have retries left, try again
                  if (attempt < 3) {
                    setTimeout(function() {
                      tryResumeVideo(v, attempt + 1);
                    }, 200 * (attempt + 1));
                  }
                });
              }
            } catch(e) {
              if (attempt < 3) {
                setTimeout(function() {
                  tryResumeVideo(v, attempt + 1);
                }, 200 * (attempt + 1));
              }
            }
          }
        }

        // ── 5. Attach Protection to Videos ──
        function protectVideo(v) {
          if (!v || v.__zenTubeProtected) return;
          v.__zenTubeProtected = true;

          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.playsInline = true;

          // Resume on unintended background pause with multi-retry
          v.addEventListener('pause', function() {
            if (!v.userHitPause && !v.ended) {
              tryResumeVideo(v, 0);
            }
          }, false);

          v.addEventListener('webkitpresentationmodechanged', function(e) {
            e.stopPropagation();
          }, true);
        }

        // ── 6. Background/Foreground detection via page lifecycle ──
        window.addEventListener('pagehide', function() {
          window.__zenTubeIsBackground = true;
          if (window.__zenTubePipEnabled) {
            window.__triggerZenTubePiP();
          }
          // Force-resume any paused videos after a short delay
          setTimeout(function() {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              tryResumeVideo(vids[i], 0);
            }
          }, 100);
        });

        window.addEventListener('pageshow', function() {
          window.__zenTubeIsBackground = false;
        });

        // Also handle blur/focus at window level
        window.addEventListener('blur', function() {
          window.__zenTubeIsBackground = true;
          // Ensure videos keep playing after a moment
          setTimeout(function() {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              if (!vids[i].userHitPause && !vids[i].ended && vids[i].paused) {
                tryResumeVideo(vids[i], 0);
              }
            }
          }, 150);
        });

        window.addEventListener('focus', function() {
          window.__zenTubeIsBackground = false;
        });

        // ── 7. Scan existing videos ──
        var existingVideos = document.querySelectorAll('video');
        for (var i = 0; i < existingVideos.length; i++) {
          protectVideo(existingVideos[i]);
        }

        // ── 8. Observe DOM for newly added videos ──
        if (typeof MutationObserver !== 'undefined') {
          var observer = new MutationObserver(function(mutations) {
            for (var m = 0; m < mutations.length; m++) {
              var nodes = mutations[m].addedNodes;
              for (var n = 0; n < nodes.length; n++) {
                if (nodes[n].nodeName === 'VIDEO') {
                  protectVideo(nodes[n]);
                } else if (nodes[n].querySelectorAll) {
                  var vids = nodes[n].querySelectorAll('video');
                  for (var v = 0; v < vids.length; v++) {
                    protectVideo(vids[v]);
                  }
                }
              }
            }
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        // ── 9. Periodic protection + resume check (every 2s to reduce CPU) ──
        setInterval(function() {
          var allVids = document.querySelectorAll('video');
          for (var j = 0; j < allVids.length; j++) {
            protectVideo(allVids[j]);
            // If we're in background and a video got paused unintentionally, resume it
            if (window.__zenTubeIsBackground && !allVids[j].userHitPause && !allVids[j].ended && allVids[j].paused) {
              tryResumeVideo(allVids[j], 0);
            }
          }
        }, 2000);

      } catch(e) {}
    })();
    true;
  `;
}

// ─── Combined Script Builder ────────────────────────────────────
/**
 * Builds the complete injection script based on settings.
 */
export function buildInjectionScript(hideShorts: boolean, contentFilter: boolean = false, pipEnabled: boolean = true): string {
  const scripts: string[] = [
    getEnhancementScript(),
    getFullscreenInterceptorScript(),
    getMediaBackgroundingScript(pipEnabled)
  ];
  if (hideShorts) {
    scripts.push(getHideShortsScript());
  }
  if (contentFilter) {
    scripts.push(getAdFilterScript());
  }
  return scripts.join('\n');
}
