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

// ─── Standard WebKit Fullscreen Script ────────────────────────
/**
 * Enables standard iOS WebKit native fullscreen viewer (AVPlayerViewController) for landscape:
 * 1. Attaches webkitbeginfullscreen / webkitendfullscreen listeners to video elements.
 * 2. On enter: notifies React Native to lock orientation to LANDSCAPE and hide status bar.
 * 3. On exit: notifies React Native to lock orientation to PORTRAIT_UP and restore status bar.
 * 4. Ensures native WebKit fullscreen can be invoked from YouTube's fullscreen button.
 */
export function getFullscreenInterceptorScript(): string {
  return `
    (function() {
      'use strict';
      if (window.__zenTubeFSInstalled) return;
      window.__zenTubeFSInstalled = true;

      window.__zenTubeIsFullscreen = false;

      function notifyReactNative(isFS) {
        window.__zenTubeIsFullscreen = !!isFS;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fullscreen',
            isFullscreen: !!isFS
          }));
        }
      }

      function attachVideoListeners(v) {
        if (!v || v.__zenTubeFSAttached) return;
        v.__zenTubeFSAttached = true;

        // iOS native WebKit fullscreen viewer lifecycle events
        v.addEventListener('webkitbeginfullscreen', function() {
          if (window.__zenTubeOnFullscreenEnter) {
            window.__zenTubeOnFullscreenEnter();
          }
          notifyReactNative(true);
        }, true);

        v.addEventListener('webkitendfullscreen', function() {
          notifyReactNative(false);
        }, true);

        v.addEventListener('webkitpresentationmodechanged', function() {
          if (v.webkitPresentationMode === 'fullscreen') {
            notifyReactNative(true);
          } else if (v.webkitPresentationMode === 'inline') {
            notifyReactNative(false);
          }
        }, true);
      }

      // Attach to all current videos
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        attachVideoListeners(videos[i]);
      }

      // Observe DOM for newly added video elements
      if (typeof MutationObserver !== 'undefined') {
        var obs = new MutationObserver(function() {
          var allVids = document.querySelectorAll('video');
          for (var j = 0; j < allVids.length; j++) {
            attachVideoListeners(allVids[j]);
          }
        });
        obs.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      }

      setInterval(function() {
        var allVids = document.querySelectorAll('video');
        for (var k = 0; k < allVids.length; k++) {
          attachVideoListeners(allVids[k]);
        }
      }, 1000);

      // On direct user tap of YouTube's fullscreen toggle button:
      // Trigger WebKit native fullscreen viewer directly if not already in fullscreen
      document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target) return;
        // Enter fullscreen buttons
        var enterFsBtn = target.closest(
          '.fullscreen-icon, ' +
          'button.fullscreen-icon, ' +
          'button[aria-label*="Full screen" i], ' +
          'button[aria-label*="Fullscreen" i], ' +
          '.ytm-fullscreen-button, ' +
          '.ytp-fullscreen-button, ' +
          'button[title*="Full screen" i], ' +
          'button[title*="Fullscreen" i], ' +
          'button[data-title-no-tooltip*="Full screen" i], ' +
          'button[aria-keyshortcuts="f"]'
        );
        if (enterFsBtn) {
          var v = document.querySelector('video');
          if (v) {
            v.userHitPause = false;
            window.__zenTubeIsEnteringFS = true;
            setTimeout(function() { window.__zenTubeIsEnteringFS = false; }, 2500);

            // Immediately tell React Native to lock orientation to landscape
            notifyReactNative(true);

            if (!v.webkitDisplayingFullscreen && v.webkitPresentationMode !== 'fullscreen') {
              if (typeof v.webkitEnterFullscreen === 'function') {
                try {
                  v.webkitEnterFullscreen();
                } catch(err) {}
              }
            }
          }
          return;
        }

        // Exit fullscreen / collapse buttons
        var exitFsBtn = target.closest(
          'button[aria-label*="Exit full screen" i], ' +
          'button[aria-label*="Exit fullscreen" i], ' +
          'button[aria-label*="Collapse" i], ' +
          'button[title*="Exit full screen" i], ' +
          'button[title*="Exit fullscreen" i], ' +
          '.ytp-collapse-button'
        );
        if (exitFsBtn) {
          notifyReactNative(false);
          var v2 = document.querySelector('video');
          if (v2 && (v2.webkitDisplayingFullscreen || v2.webkitPresentationMode === 'fullscreen')) {
            if (typeof v2.webkitExitFullscreen === 'function') {
              try { v2.webkitExitFullscreen(); } catch(err) {}
            }
          }
        }
      }, true);

      // Global exit helper
      window.__exitZenTubeFullscreen = function() {
        var allVideos = document.querySelectorAll('video');
        for (var i = 0; i < allVideos.length; i++) {
          try {
            if (allVideos[i].webkitDisplayingFullscreen) {
              if (typeof allVideos[i].webkitExitFullscreen === 'function') {
                allVideos[i].webkitExitFullscreen();
              } else if (typeof allVideos[i].webkitSetPresentationMode === 'function') {
                allVideos[i].webkitSetPresentationMode('inline');
              }
            }
          } catch(e) {}
        }
        notifyReactNative(false);
      };
    })();
    true;
  `;
}

// ─── Media Backgrounding & Picture-in-Picture Script ───────────
/**
 * Brave iOS-style MediaBackgrounding:
 * 1. Spoofs Document.prototype.visibilityState and hidden so web players never pause on minimize
 * 2. Allows full, unhindered pausing in WebKit native fullscreen viewer and in foreground
 * 3. Only auto-resumes unintentional pauses when app is genuinely sent to the background
 * 4. Provides window.__triggerZenTubePiP() to programmatically enter native iOS Picture-in-Picture
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
        var lastFSEnterTime = 0;
        var lastBackgroundTime = 0;

        // Public helper for React Native AppState to accurately set background/foreground state
        window.__zenTubeSetBackground = function(isBg) {
          window.__zenTubeIsBackground = !!isBg;
          if (isBg) {
            lastBackgroundTime = Date.now();
          }
        };

        // Track fullscreen enter timestamp globally
        window.__zenTubeOnFullscreenEnter = function() {
          lastFSEnterTime = Date.now();
        };

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
          // If entering fullscreen, YouTube is triggering pause internally.
          // Block it completely so the native AVPlayer presents in a playing state!
          if (window.__zenTubeIsEnteringFS) {
            return;
          }
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
              if (v && !v.paused && !v.userHitPause) {
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
                  if (attempt < 4) {
                    setTimeout(function() {
                      tryResumeVideo(v, attempt + 1);
                    }, 150 * (attempt + 1));
                  }
                });
              }
            } catch(e) {
              if (attempt < 4) {
                setTimeout(function() {
                  tryResumeVideo(v, attempt + 1);
                }, 150 * (attempt + 1));
              }
            }
          }
        }

        // Helper to check if a video is currently displaying in WebKit native fullscreen
        function isVideoInFullscreen(v) {
          return !!(
            (v && (v.webkitDisplayingFullscreen || v.webkitPresentationMode === 'fullscreen')) ||
            window.__zenTubeIsFullscreen
          );
        }

        // ── 5. Attach Protection to Videos ──
        function protectVideo(v) {
          if (!v || v.__zenTubeProtected) return;
          v.__zenTubeProtected = true;

          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.playsInline = true;

          // Clear userHitPause whenever the video plays
          v.addEventListener('play', function() {
            v.userHitPause = false;
          }, false);

          v.addEventListener('playing', function() {
            v.userHitPause = false;
          }, false);

          // Track fullscreen lifecycle on video
          v.addEventListener('webkitbeginfullscreen', function() {
            v.userHitPause = false;
            lastFSEnterTime = Date.now();
            window.__zenTubeIsEnteringFS = true;

            // Unconditionally force resume so video is PLAYING inside WebKit fullscreen!
            function forcePlay() {
              v.userHitPause = false;
              try {
                var p = origPlay.call(v);
                if (p && p.catch) p.catch(function(){});
              } catch(e) {}
            }

            forcePlay();
            setTimeout(forcePlay, 50);
            setTimeout(forcePlay, 120);
            setTimeout(forcePlay, 250);
            setTimeout(forcePlay, 500);
            setTimeout(forcePlay, 800);
            setTimeout(forcePlay, 1200);
            setTimeout(forcePlay, 1800);
            setTimeout(function() { window.__zenTubeIsEnteringFS = false; }, 2500);
          }, true);

          // ── THE ROCK-SOLID PAUSE EVENT HANDLER ──
          v.addEventListener('pause', function() {
            var now = Date.now();
            var isFSTransition = window.__zenTubeIsEnteringFS || (now - lastFSEnterTime < 2000);

            // 1. If WebKit paused during transition to fullscreen, keep playing!
            if (isFSTransition) {
              v.userHitPause = false;
              try {
                var p = origPlay.call(v);
                if (p && p.catch) p.catch(function(){});
              } catch(e) {}
              return;
            }

            // 2. If app is in background:
            if (window.__zenTubeIsBackground) {
              // If user tapped pause in Control Center / Lock Screen (after the initial minimize window)
              if (now - lastBackgroundTime > 1000) {
                v.userHitPause = true;
                return;
              }
              // Otherwise it's the initial OS backgrounding pause -> auto-resume!
              if (!v.userHitPause && !v.ended) {
                tryResumeVideo(v, 0);
              }
              return;
            }

            // 3. If in WebKit fullscreen and user tapped native AVPlayer pause button
            if (isVideoInFullscreen(v)) {
              v.userHitPause = true;
              return;
            }

            // 4. In portrait: if user clicked pause, HTMLVideoElement.prototype.pause already set userHitPause = true
            if (v.userHitPause) {
              return;
            }

            // 5. Any unintentional pause (e.g. interruption)
            if (!v.ended) {
              setTimeout(function() {
                if (!v.userHitPause && !v.ended && v.paused) {
                  tryResumeVideo(v, 0);
                }
              }, 50);
            }
          }, false);

          v.addEventListener('webkitpresentationmodechanged', function(e) {
            e.stopPropagation();
          }, true);
        }

        // ── 6. Background/Foreground detection via page lifecycle ──
        window.addEventListener('pagehide', function() {
          window.__zenTubeIsBackground = true;
          lastBackgroundTime = Date.now();
          if (window.__zenTubePipEnabled) {
            window.__triggerZenTubePiP();
          }
          // Force-resume any non-user-paused videos after a short delay
          setTimeout(function() {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              if (!vids[i].userHitPause && !vids[i].ended && vids[i].paused) {
                tryResumeVideo(vids[i], 0);
              }
            }
          }, 80);
        });

        window.addEventListener('pageshow', function() {
          window.__zenTubeIsBackground = false;
        });

        // Window blur/focus handling:
        window.addEventListener('blur', function() {
          var vids = document.querySelectorAll('video');
          var anyInFS = false;
          for (var i = 0; i < vids.length; i++) {
            if (isVideoInFullscreen(vids[i])) {
              anyInFS = true;
              break;
            }
          }
          if (anyInFS || window.__zenTubeIsFullscreen) {
            return;
          }

          if (document.hidden) {
            window.__zenTubeIsBackground = true;
            lastBackgroundTime = Date.now();
          }
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

        // ── 9. Periodic protection + resume check (every 2s) ──
        setInterval(function() {
          var allVids = document.querySelectorAll('video');
          for (var j = 0; j < allVids.length; j++) {
            protectVideo(allVids[j]);
            if (
              window.__zenTubeIsBackground &&
              !allVids[j].userHitPause &&
              !allVids[j].ended &&
              allVids[j].paused &&
              !isVideoInFullscreen(allVids[j])
            ) {
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
