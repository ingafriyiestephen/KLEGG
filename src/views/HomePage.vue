<template>
  <ion-page>
    <!-- Header -->
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-avatar class="toolbar-avatar">
            <img :src="userAvatar" alt="Student" />
          </ion-avatar>
        </ion-buttons>

        <ion-title class="toolbar-title">
          <div class="greeting">{{ greeting }}</div>
          <div class="student-name">{{ studentName }}</div>
        </ion-title>

        <ion-buttons slot="end">
          <ion-button @click="refreshData" fill="clear">
            <ion-icon :icon="refreshOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading your data...</p>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Recent Updates Section -->
        <ion-card class="content-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon :icon="notificationsOutline"></ion-icon>
              Recent Updates
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <div v-if="latestNotification" class="notification-content">
              <p>
                {{ truncateText(latestNotification.body, 100) }} <!-- Changed from notification_body to body -->
              </p>
              <ion-note>{{
                formatDate(latestNotification.created_at)
              }}</ion-note>
            </div>
            <div v-else class="empty-state">
              <ion-icon :icon="notificationsOffOutline"></ion-icon>
              <p>No recent updates</p>
            </div>

            <ion-button
              expand="block"
              fill="clear"
              size="small"
              @click="goToNotifications"
              class="view-all-button"
            >
              View All Notifications ({{ notifications.length }})
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Attendance Section -->
        <ion-card class="content-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon :icon="checkmarkDoneOutline"></ion-icon>
              Recent Attendance
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <div v-if="latestAttendance" class="attendance-content">
              <p>
                You were marked
                <strong>{{ latestAttendance.student_attendance }}</strong>
                in <strong>{{ latestAttendance.tutorship_name }}</strong>
              </p>
              <ion-note>{{ 
                formatDate(latestAttendance.attendance_date) || 
                formatDate(latestAttendance.created_at) 
              }}</ion-note>
            </div>
            <div v-else class="empty-state">
              <ion-icon :icon="timeOutline"></ion-icon>
              <p>No attendance records yet</p>
            </div>
            
            <!-- Show attendance count for debugging -->
            <!-- <ion-note v-if="attendances.length > 0" style="font-size: 12px; display: block; text-align: center; margin-top: 8px;">
              {{ attendances.length }} attendance records found
            </ion-note> -->
          </ion-card-content>
        </ion-card>

        <!-- Quick Actions - Redesigned -->
        <ion-card class="content-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon :icon="flashOutline"></ion-icon>
              Quick Actions
            </ion-card-title>
          </ion-card-header>

          <ion-card-content class="quick-actions-container">
            <div class="quick-actions-grid">
              <div class="action-item" @click="goToClasses">
                <div class="action-icon-wrapper">
                  <ion-icon :icon="calendarOutline" class="action-icon"></ion-icon>
                </div>
                <ion-text class="action-label">Classes</ion-text>
              </div>

              <div class="action-item" @click="goToNotifications">
                <div class="action-icon-wrapper">
                  <ion-icon :icon="notificationsOutline" class="action-icon"></ion-icon>
                </div>
                <ion-text class="action-label">Notifications</ion-text>
              </div>

              <div class="action-item" @click="goToSettings">
                <div class="action-icon-wrapper">
                  <ion-icon :icon="settingsOutline" class="action-icon"></ion-icon>
                </div>
                <ion-text class="action-label">Settings</ion-text>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonNote,
  IonSpinner,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
} from "@ionic/vue";
import {
  homeOutline,
  calendarOutline,
  notificationsOutline,
  notificationsOffOutline,
  settingsOutline,
  flashOutline,
  checkmarkDoneOutline,
  timeOutline,
  refreshOutline,
} from "ionicons/icons";
import { ref, computed, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { isPlatform } from '@ionic/vue';
import { useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import { updateStatusBar } from '@/utils/statusBar';


interface Notification {
  id: number;
  title: string; // Changed from notification_title
  body: string; // Changed from notification_body
  is_read: boolean;
  created_at: string;
  user: any;
  comments_count: number;
  reaction_counts: any[];
  user_reaction: any;
}

interface ApiResponse {
  current_page: number;
  data: Notification[];
  // ... other pagination properties
}

interface Attendance {
  attendance_id: number; // Changed from id
  tutorship_id: number;
  attendance_code: string;
  attendance_group: string;
  tutorship_name: string;
  user_id: number;
  student_name: string;
  student_attendance: string; // This is correct!
  teacher_name: string;
  attendance_date: string;
  created_at: string;
  updated_at: string;
}

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

// Extract values with fallbacks
const studentName = userData?.fullname || "";

const router = useRouter();
const loading = ref(true);
const notifications = ref<Notification[]>([]);
const attendances = ref<Attendance[]>([]);

// Compute greeting based on time of day
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
});

// Get latest notification
const latestNotification = computed(() => {
  return notifications.value.length > 0 ? notifications.value[0] : null;
});

// Get latest attendance - sort by date to get the most recent
const latestAttendance = computed(() => {
  if (attendances.value.length > 0) {
    // Sort by created_at or attendance_date to get the most recent
    const sorted = [...attendances.value].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];
    console.log('Latest attendance:', latest);
    return latest;
  }
  console.log('No attendances available');
  return null;
});


// Safe attendance access
const getLatestAttendance = computed(() => {
  try {
    if (attendances.value && attendances.value.length > 0) {
      const sorted = [...attendances.value].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return sorted[0];
    }
    return null;
  } catch (error) {
    console.error('Error processing attendance data:', error);
    return null;
  }
});

// Default avatar (can be replaced with actual user avatar)
const userAvatar = computed(() => {
  return "/assets/img/login-logo.png";
});

// Add platform class to body for CSS targeting
const detectPlatform = () => {
  const body = document.body;
  body.classList.remove('ios', 'android');
  
  if (isPlatform('ios')) {
    body.classList.add('ios');
  } else if (isPlatform('android')) {
    body.classList.add('android');
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return "Recently";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

// Truncate text with ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Navigation methods
const goToClasses = () => router.push("/tutorships");
const goToNotifications = () => router.push("/notifications");
const goToSettings = () => router.push("/settings");

// Refresh data
const refreshData = async () => {
  loading.value = true;
  try {
    await fetchData();
    await Toast.show({ text: "Data refreshed", position: "top" });
  } catch (error) {
    console.error("Refresh error:", error);
    await Toast.show({ text: "Refresh failed", position: "top" });
  } finally {
    loading.value = false;
  }
};


// Fetch data from API
const fetchData = async () => {
  try {
    const [notificationsRes, attendancesRes] = await Promise.all([
      axios.get("https://klegg-app-whh7m.ondigitalocean.app/api/notifications", {
        headers: getAuthHeaders(),
      }),
      axios.get("https://klegg-app-whh7m.ondigitalocean.app/api/attendances", {
        headers: getAuthHeaders(),
      }),
    ]);

    // Notifications: paginated response (access .data.data)
    notifications.value = notificationsRes.data.data || [];
    
    // Attendances: direct array response (access .data directly)
    const allAttendances = attendancesRes.data || [];
    
    // Filter attendances to show only the current student's records
    const currentUserId = userData?.user_id; // Make sure this matches your user data structure
    console.log('Current user ID:', currentUserId);
    console.log('All attendances before filtering:', allAttendances);
    
    if (currentUserId) {
      attendances.value = allAttendances.filter((attendance: Attendance) => {
        // Use the correct field that identifies the student
        // This could be user_id, student_id, etc. - check your API response
        const matches = attendance.user_id === currentUserId;
        console.log(`Attendance ${attendance.attendance_id}: user_id=${attendance.user_id}, matches=${matches}`);
        return matches;
      });
    } else {
      attendances.value = [];
    }

    console.log('Filtered attendances for current user:', attendances.value);

  } catch (error: any) {
    handleFetchError(error);
  }
};

// Get auth headers
const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Separate error handler for better reusability
const handleFetchError = (error: unknown) => {
  console.error("Error fetching data:", error);

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      router.replace("/"); // More specific route
      Toast.show({
        text: "Session expired. Please login again",
        position: "top",
        duration: "long",
      });
      return;
    }

    if (error.code === "ECONNABORTED") {
      Toast.show({
        text: "Request timeout. Please try again",
        position: "top",
      });
      return;
    }
  }

  // Generic error for all other cases
  Toast.show({
    text: "Failed to load data. Please try again later",
    position: "top",
  });
};

// Handle system theme changes
const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
  // Update status bar automatically using our utility
  updateStatusBar(isDark);
};

// Initialize theme detection
const initThemeDetection = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  // Set initial status bar based on current system theme
  handleSystemThemeChange(prefersDark);
  // Listen for system theme changes
  prefersDark.addEventListener('change', handleSystemThemeChange);
  return prefersDark;
};

// Initialize data
onMounted(async () => {
  try {
    detectPlatform();
    initThemeDetection();
    await fetchData();
  } catch (error) {
    console.error("Initialization error:", error);
  } finally {
    loading.value = false;
  }
});

</script>

<style scoped>
/* Header Styles */
ion-toolbar {
  --background: linear-gradient(
    135deg,
    var(--ion-color-primary),
    var(--ion-color-secondary)
  );
  --color: white;
  --min-height: 80px;
  --border-color: transparent;
}

.toolbar-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.toolbar-title {
  padding-left: 8px;
}

.greeting {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.9;
}

.student-name {
  font-size: 18px;
  font-weight: 600;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  background: var(--ion-background-color);
}

.loading-container ion-spinner {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: var(--ion-color-primary);
}

.loading-container p {
  color: var(--ion-color-medium);
  margin-top: 8px;
}

/* Content Cards */
.content-card {
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: var(--ion-card-background);
  border: 1px solid var(--ion-border-color);
}

ion-card-header {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ion-border-color);
}

ion-card-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-text-color);
}

ion-card-title ion-icon {
  margin-right: 8px;
  color: var(--ion-color-primary);
}

ion-card-content {
  padding-top: 0;
  color: var(--ion-text-color);
}

/* Notification & Attendance Content */
.notification-content,
.attendance-content {
  margin-bottom: 16px;
}

.notification-content p,
.attendance-content p {
  margin-bottom: 4px;
  color: var(--ion-text-color);
  opacity: 0.9;
}

ion-note {
  font-size: 14px;
  color: var(--ion-color-medium);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  text-align: center;
  color: var(--ion-color-medium);
  background: var(--ion-background-color);
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 8px;
  opacity: 0.5;
  color: var(--ion-color-medium);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* View All Button */
.view-all-button {
  --color: var(--ion-color-primary);
  --background: transparent;
  margin-top: 8px;
}

.view-all-button:hover {
  --background: var(--ion-color-light-shade);
}

/* Quick Actions - Fixed Icon Visibility */
.quick-actions-container {
  padding: 8px 4px !important;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: 16px;
  background: var(--ion-item-background);
  border: 1px solid var(--ion-border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 90px;
  justify-content: center;
  position: relative;
}

.action-item:active {
  background: var(--ion-color-light-shade);
  transform: scale(0.98);
}

.action-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  /* Fixed background for better visibility */
  background: var(--ion-color-primary);
}

.action-icon {
  font-size: 20px;
  color: white !important; /* Force white icons for better contrast */
}

.action-label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  color: var(--ion-text-color);
  line-height: 1.3;
  padding: 0 2px;
}

/* Dark Mode Optimizations */
@media (prefers-color-scheme: dark) {
  .action-item {
    background: var(--ion-color-step-150);
    border-color: var(--ion-border-color);
  }
  
  .action-icon-wrapper {
    background: var(--ion-color-primary); /* Keep primary color in dark mode too */
  }
  
  .action-item:active {
    background: var(--ion-color-step-200);
  }
}



/* Platform Specific Adjustments */
.ios .action-item {
  border-radius: 18px;
  min-height: 92px;
}

.android .action-item {
  border-radius: 12px;
  min-height: 88px;
}

.ios .action-label {
  font-weight: 600;
}

.android .action-label {
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 360px) {
  .quick-actions-grid {
    gap: 8px;
  }
  
  .action-item {
    padding: 12px 6px;
    min-height: 80px;
  }
  
  .action-icon-wrapper {
    width: 42px;
    height: 42px;
  }
  
  .action-icon {
    font-size: 18px;
  }
  
  .action-label {
    font-size: 11px;
  }
}

@media (min-width: 410px) {
  .quick-actions-grid {
    gap: 16px;
  }
  
  .action-item {
    padding: 20px 12px;
    min-height: 100px;
  }
}

@media (min-width: 768px) {
  .quick-actions-container {
    padding: 16px 8px !important;
  }
  
  .quick-actions-grid {
    gap: 24px;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .action-item {
    padding: 24px 16px;
    min-height: 110px;
  }
  
  .action-icon-wrapper {
    width: 56px;
    height: 56px;
  }
  
  .action-icon {
    font-size: 24px;
  }
  
  .action-label {
    font-size: 13px;
  }
}

/* Focus states for accessibility */
.action-item:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Safe area support for notched devices */
@supports(padding: max(0px)) {
  .quick-actions-container {
    padding-left: max(8px, env(safe-area-inset-left)) !important;
    padding-right: max(8px, env(safe-area-inset-right)) !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .action-item,
  .action-icon-wrapper {
    transition: none;
  }
  
  .action-item:active {
    transform: none;
  }
}

/* Bottom Tabs */
ion-tab-bar {
  --background: var(--ion-card-background);
  --border: 1px solid var(--ion-border-color);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  padding-top: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  height: auto;
  min-height: 60px;
}

ion-tab-button {
  --color: var(--ion-color-medium);
  --color-selected: var(--ion-color-primary);
  --background: transparent;
  --background-focused: var(--ion-color-step-100);
}

ion-tab-button ion-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

ion-tab-button ion-label {
  font-size: 12px;
  margin-top: 0;
  font-weight: 500;
}

/* Dark mode specific adjustments */
.dark .content-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .quick-action-button {
  --background: var(--ion-color-step-150);
  border-color: var(--ion-border-color);
}

.dark .quick-action-button .action-icon {
  background: var(--ion-color-step-200);
}

.dark ion-tab-bar {
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}

/* Focus and active states */
.quick-action-button:focus-visible,
ion-tab-button:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.quick-action-button:active {
  transform: translateY(1px);
}

/* Responsive Adjustments */
@media (max-width: 400px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .quick-action-button {
    --padding-top: 8px;
    --padding-bottom: 8px;
  }

  .quick-action-button .action-icon {
    width: 40px;
    height: 40px;
  }

  .quick-action-button ion-icon {
    font-size: 20px;
  }

  ion-tab-button ion-icon {
    font-size: 22px;
  }

  ion-tab-button ion-label {
    font-size: 11px;
  }
}

@media (min-width: 768px) {
  .content-card {
    margin: 16px auto;
    max-width: 600px;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .content-card {
    border: 2px solid var(--ion-border-color);
  }

  .quick-action-button {
    border: 2px solid var(--ion-border-color);
  }

  ion-tab-bar {
    --border: 2px solid var(--ion-border-color);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .quick-action-button {
    transition: none;
  }
  
  .quick-action-button:active {
    transform: none;
  }
}

/* Safe area insets for notched devices */
@supports(padding: max(0px)) {
  .content-card {
    margin-left: max(16px, env(safe-area-inset-left));
    margin-right: max(16px, env(safe-area-inset-right));
  }
  
  ion-tab-bar {
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
  }
}
</style>
