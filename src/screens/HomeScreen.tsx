import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform, AppState, AppStateStatus, StatusBar } from 'react-native';
import { WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { YouTubeWebView, YouTubeWebViewRef } from '../components/YouTubeWebView';
import { ErrorView } from '../components/ErrorView';
import { OfflineView } from '../components/OfflineView';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../theme/theme';
import { saveLastVisitedUrl, getLastVisitedUrl } from '../services/storage';

const YOUTUBE_HOME = 'https://m.youtube.com/';

export function HomeScreen() {
  const webViewRef = useRef<YouTubeWebViewRef>(null);
  const { isConnected } = useNetworkStatus();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasError, setHasError] = useState(false);
  const [initialUrl, setInitialUrl] = useState<string>(YOUTUBE_HOME);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  isFullscreenRef.current = isFullscreen;

  // Determine initial URL based on settings
  useEffect(() => {
    (async () => {
      if (settings.rememberLastPage && !settings.openHomeOnStartup) {
        const lastUrl = await getLastVisitedUrl();
        if (lastUrl) {
          setInitialUrl(lastUrl);
        }
      }
      setIsReady(true);
    })();
  }, []);

  // Auto-trigger PiP on minimize & re-sync WebView on foreground return
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'inactive' || nextAppState === 'background') {
        // Going to background → notify webview and trigger PiP if enabled
        webViewRef.current?.injectJavaScript(`
          (function() {
            if (window.__zenTubeSetBackground) {
              window.__zenTubeSetBackground(true);
            }
            if (window.__triggerZenTubePiP && ${settings.pipYouTube}) {
              window.__triggerZenTubePiP();
            }
          })();
          true;
        `);
      } else if (nextAppState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
        // Returning to foreground → notify webview and restore PiP videos to inline
        webViewRef.current?.injectJavaScript(`
          (function() {
            if (window.__zenTubeSetBackground) {
              window.__zenTubeSetBackground(false);
            }
            try {
              var videos = document.querySelectorAll('video');
              for (var i = 0; i < videos.length; i++) {
                var v = videos[i];
                if (v && typeof v.webkitSetPresentationMode === 'function' && v.webkitPresentationMode === 'picture-in-picture') {
                  try { v.webkitSetPresentationMode('inline'); } catch(e) {}
                }
              }
            } catch(e) {}
          })();
          true;
        `);
      }
    });

    return () => subscription.remove();
  }, [settings.pipYouTube]);

  // Handle back button & restore portrait on blur
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If in fullscreen, exit fullscreen first
        if (isFullscreenRef.current) {
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (window.__exitZenTubeFullscreen) {
                window.__exitZenTubeFullscreen();
              }
            })();
            true;
          `);
          return true;
        }

        if (webViewRef.current?.canGoBack) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = Platform.OS === 'android'
        ? BackHandler.addEventListener('hardwareBackPress', onBackPress)
        : null;

      return () => {
        subscription?.remove();
        // If in fullscreen when navigating away, tell webView to exit fullscreen and restore portrait
        if (isFullscreenRef.current) {
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (window.__exitZenTubeFullscreen) {
                window.__exitZenTubeFullscreen();
              }
            })();
            true;
          `);
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
          StatusBar.setHidden(false);
        }
      };
    }, [])
  );

  // Track navigation for "remember last page"
  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (settings.rememberLastPage && navState.url) {
        saveLastVisitedUrl(navState.url);
      }
    },
    [settings.rememberLastPage]
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  // Show offline view
  if (isConnected === false) {
    return <OfflineView onRetry={handleRetry} />;
  }

  // Show error view
  if (hasError) {
    return <ErrorView onRetry={handleRetry} />;
  }

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: isFullscreen ? 0 : insets.top,
        },
      ]}
    >
      <YouTubeWebView
        ref={webViewRef}
        url={initialUrl}
        hideShorts={settings.hideShorts}
        contentFilter={settings.contentFilter}
        pipEnabled={settings.pipYouTube}
        isFullscreen={isFullscreen}
        onFullscreenChange={setIsFullscreen}
        onNavigationStateChange={handleNavigationStateChange}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
