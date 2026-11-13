import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../i18n';

// Ignore React Native Web development-only touch responder sync warnings
LogBox.ignoreLogs([
  'Cannot find single active touch',
]);

// Web specific mobile viewport & touch optimization
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('Cannot find single active touch') ||
      msg.includes('defaultProps will be removed') ||
      msg.includes('Encountered two children with the same key')
    ) {
      // Harmless dev warnings filtered from breaking mobile/web rendering
      return;
    }
    originalError.apply(console, args);
  };

  if (typeof document !== 'undefined') {
    // Ensure viewport meta is set properly for mobile screens
    let metaViewport = document.querySelector('meta[name="viewport"]');
    if (!metaViewport) {
      metaViewport = document.createElement('meta');
      metaViewport.setAttribute('name', 'viewport');
      document.head.appendChild(metaViewport);
    }
    metaViewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );

    // Inject touch-action optimization and prevent horizontal viewport overflow
    const styleId = 'btcm-mobile-touch-fix';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }
        html, body, #root {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          touch-action: manipulation;
          -webkit-overflow-scrolling: touch;
          background-color: #0B0E14;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0B0E14',
  },
});
