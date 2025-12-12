import OneSignal from 'onesignal-cordova-plugin';

class OneSignalService {
  // Initialize OneSignal and set external ID
  async setUser(user_id: string) {
    try {
      // Initialize with your app ID (as string)
      OneSignal.initialize("8ed4cb60-6c8b-4310-9d31-3534a40d2710");

      OneSignal.Notifications.requestPermission(false).then((accepted: boolean) => {
        console.log("User accepted notifications: " + accepted);
        // Set the external user ID
        OneSignal.login(user_id);
        console.log('OneSignal user set:', user_id);
      });
      
    } catch (error) {
      console.error('OneSignal error:', error);
    }
  }
}

export const oneSignalService = new OneSignalService();