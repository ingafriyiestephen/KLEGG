import { StatusBar, Style } from '@capacitor/status-bar';

export const updateStatusBar = async (isDark: boolean) => {
  try {
    if (isDark) {
      // Dark theme - dark status bar
      await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
      await StatusBar.setStyle({ style: Style.Dark });
    } else {
      // Light theme - light status bar  
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setStyle({ style: Style.Light });
    }
  } catch (error) {
    console.log('Status bar update not supported on web');
  }
};

// Initialize status bar on app start
export const initStatusBar = async () => {
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    
    // Set initial style based on current theme
    const isDark = document.body.classList.contains('dark');
    await updateStatusBar(isDark);
  } catch (error) {
    console.log('Status bar init not supported on web');
  }
};