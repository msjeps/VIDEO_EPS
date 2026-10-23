import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.eps.videoepsv2',
  appName: 'Video EPS V2',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#09090b',
      showSpinner: false,
      splashImmersive: false,
      splashFullScreen: false,
    },
  },
};

export default config;
