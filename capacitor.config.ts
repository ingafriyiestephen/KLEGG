import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.webmucho.klegg",
  appName: "Klegg",
  webDir: "dist",
  server: {
    androidScheme: 'https',
    iosScheme: 'https', // Change from capacitor:// to https://
    hostname: 'localhost'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
