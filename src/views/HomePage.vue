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
      <!-- Today's Class Alert -->
      <div v-if="todayClassInfo" class="todays-class-alert">
        <ion-card class="alert-card">
          <ion-card-content class="alert-content">
            <div class="alert-header">
              <ion-icon :icon="videocamOutline" color="success" size="large"></ion-icon>
              <div class="alert-text">
                <h3>Class Today!</h3>
                <p>{{ todayClassInfo.courseName }} at {{ todayClassInfo.startTime }}</p>
              </div>
            </div>
            
            <ion-button 
              v-if="todayClassInfo.hasMeetingLink"
              @click="joinTodayClass"
              expand="block"
              fill="solid"
              color="success"
              class="join-button"
            >
              <ion-icon slot="start" :icon="videocamOutline"></ion-icon>
              Enter Classroom
            </ion-button>
            
            <div v-else class="no-link-message">
              <ion-text color="medium">
                <small>Meeting link will be provided by your teacher</small>
              </ion-text>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

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
                {{ truncateText(latestNotification.body, 100) }}
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
  IonText,
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
  videocamOutline,
} from "ionicons/icons";
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { isPlatform } from '@ionic/vue';
import { useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import { updateStatusBar } from '@/utils/statusBar';
import { oneSignalService } from '@/services/onesignal';

interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  user: any;
  comments_count: number;
  reaction_counts: any[];
  user_reaction: any;
}

interface Attendance {
  attendance_id: number;
  tutorship_id: number;
  attendance_code: string;
  attendance_group: string;
  tutorship_name: string;
  user_id: number;
  student_name: string;
  student_attendance: string;
  teacher_name: string;
  attendance_date: string;
  created_at: string;
  updated_at: string;
}

interface TimetableEntry {
  tutorship_id: number;
  tutorship_name?: string;
  monday_course: string;
  monday_start: string;
  monday_end: string;
  tuesday_course: string;
  tuesday_start: string;
  tuesday_end: string;
  wednesday_course: string;
  wednesday_start: string;
  wednesday_end: string;
  thursday_course: string;
  thursday_start: string;
  thursday_end: string;
  friday_course: string;
  friday_start: string;
  friday_end: string;
  saturday_course: string;
  saturday_start: string;
  saturday_end: string;
  sunday_course: string;
  sunday_start: string;
  sunday_end: string;
  monday_meeting_link?: string | null;
  tuesday_meeting_link?: string | null;
  wednesday_meeting_link?: string | null;
  thursday_meeting_link?: string | null;
  friday_meeting_link?: string | null;
  saturday_meeting_link?: string | null;
  sunday_meeting_link?: string | null;
}

interface TodayClassInfo {
  courseName: string;
  startTime: string;
  endTime: string;
  hasMeetingLink: boolean;
  meetingLink?: string | null;
  tutorshipId: number;
  tutorshipName: string;
}

const token = localStorage.getItem("parisklegg_token") || "";
const userDataString = localStorage.getItem("parisklegg_user");
const userData = userDataString ? JSON.parse(userDataString) : null;
const studentName = userData?.fullname || "";
const userId = userData?.user_id || null;

const router = useRouter();
const loading = ref(true);
const notifications = ref<Notification[]>([]);
const attendances = ref<Attendance[]>([]);
const todayClassInfo = ref<TodayClassInfo | null>(null);

// Day configuration
const daysConfig = [
  { name: "Sunday", dayKey: "sunday", index: 0 },
  { name: "Monday", dayKey: "monday", index: 1 },
  { name: "Tuesday", dayKey: "tuesday", index: 2 },
  { name: "Wednesday", dayKey: "wednesday", index: 3 },
  { name: "Thursday", dayKey: "thursday", index: 4 },
  { name: "Friday", dayKey: "friday", index: 5 },
  { name: "Saturday", dayKey: "saturday", index: 6 }
];

// Get today's day index
const today = new Date();
const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
const todayDayKey = daysConfig.find(d => d.index === todayDayIndex)?.dayKey || '';

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

// Get latest attendance
const latestAttendance = computed(() => {
  if (attendances.value.length > 0) {
    const sorted = [...attendances.value].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0];
  }
  return null;
});

// Check if there's a class today
const hasClassToday = computed(() => {
  return todayClassInfo.value !== null;
});

// Default avatar
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

// Format time for display
const formatDisplayTime = (timeString: string): string => {
  if (!timeString) return "";
  return timeString.split(':').slice(0, 2).join(':');
};

// Check if there's a valid class time
const hasClassTime = (startTime: string, endTime: string): boolean => {
  return !!startTime && 
         startTime.trim() !== "" && 
         startTime !== "00:00" && 
         startTime !== "00:00:00" &&
         !!endTime && 
         endTime.trim() !== "" &&
         endTime !== "00:00" &&
         endTime !== "00:00:00";
};



// Update checkTodayClasses to accept timetable data
const checkTodayClassesFromData = (timetableData: TimetableEntry[], tutorshipId: number, tutorshipName: string) => {
  // Get today's day key
  const today = new Date();
  const todayDayIndex = today.getDay();
  const todayDayKey = daysConfig.find(d => d.index === todayDayIndex)?.dayKey || '';
  
  if (!todayDayKey) return;

  for (const entry of timetableData) {
    if (entry.tutorship_id === tutorshipId) {
      const startTime = entry[`${todayDayKey}_start` as keyof TimetableEntry] as string;
      const endTime = entry[`${todayDayKey}_end` as keyof TimetableEntry] as string;
      const courseName = entry[`${todayDayKey}_course` as keyof TimetableEntry] as string;
      const meetingLink = entry[`${todayDayKey}_meeting_link` as keyof TimetableEntry] as string | null;
      
      if (hasClassTime(startTime, endTime)) {
        todayClassInfo.value = {
          courseName: courseName || tutorshipName || "Class",
          startTime: formatDisplayTime(startTime),
          endTime: formatDisplayTime(endTime),
          hasMeetingLink: !!meetingLink && meetingLink.trim() !== "",
          meetingLink: meetingLink,
          tutorshipId: tutorshipId,
          tutorshipName: tutorshipName
        };
        return; // Found today's class
      }
    }
  }
};

// Navigation methods
const goToClasses = () => router.push("/tutorships");
const goToNotifications = () => router.push("/notifications");
const goToSettings = () => router.push("/settings");

// Join today's class
const joinTodayClass = async () => {
  if (!todayClassInfo.value?.hasMeetingLink || !todayClassInfo.value?.meetingLink) {
    Toast.show({
      text: 'Meeting link not available',
      position: 'top',
      duration: 'short'
    });
    return;
  }

  try {
    Toast.show({
      text: `Opening ${todayClassInfo.value.courseName}...`,
      position: 'top',
      duration: 'short'
    });

    // Open meeting link
    if (isMobile()) {
      if (todayClassInfo.value.meetingLink.includes('zoom.us')) {
        const zoomUrl = todayClassInfo.value.meetingLink.replace('/j/', '/join/');
        window.open(zoomUrl, '_system');
      } else if (todayClassInfo.value.meetingLink.includes('meet.google.com')) {
        window.open(todayClassInfo.value.meetingLink, '_system');
      } else {
        window.open(todayClassInfo.value.meetingLink, '_blank');
      }
    } else {
      window.open(todayClassInfo.value.meetingLink, '_blank');
    }
    
  } catch (error) {
    console.error('Error joining class:', error);
    Toast.show({
      text: 'Failed to open meeting link',
      position: 'top',
      duration: 'short'
    });
  }
};

const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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



// Fetch all data
const fetchData = async () => {
  try {
    const [notificationsRes, attendancesRes, classesRes] = await Promise.all([
      axios.get("https://klegg-app-whh7m.ondigitalocean.app/api/notifications", {
        headers: getAuthHeaders(),
      }),
      axios.get("https://klegg-app-whh7m.ondigitalocean.app/api/attendances", {
        headers: getAuthHeaders(),
      }),
      axios.get("https://klegg-app-whh7m.ondigitalocean.app/api/tutorships", {
        headers: getAuthHeaders(),
      })
    ]);

    // Notifications
    notifications.value = notificationsRes.data.data || [];
    
    // Attendances
    const allAttendances = attendancesRes.data || [];
    if (userId) {
      attendances.value = allAttendances.filter((attendance: Attendance) => 
        attendance.user_id === userId
      );
    } else {
      attendances.value = [];
    }

    // Get user's classes and filter for this user
    const allClasses = classesRes.data || [];
    const userClasses = allClasses.filter((classItem: any) => {
      try {
        const studentIds = classItem.students_list
          ?.split(",")
          .map(Number)
          .filter((id: number) => !isNaN(id)) || [];
        return studentIds.includes(userId);
      } catch (e) {
        console.warn("Error parsing students_list", classItem);
        return false;
      }
    });

    // Now check timetable for each class to find today's class
    await checkTodaysClasses(userClasses);

  } catch (error: any) {
    handleFetchError(error);
  }
};

// Check for today's classes across all user classes
const checkTodaysClasses = async (userClasses: any[]) => {
  todayClassInfo.value = null;
  
  // Get today's day key
  const today = new Date();
  const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayDayKey = daysConfig.find(d => d.index === todayDayIndex)?.dayKey || '';
  
  if (!todayDayKey) return;

  // Check timetable for each class
  for (const classItem of userClasses) {
    try {
      const response = await axios.post(
        "https://klegg-app-whh7m.ondigitalocean.app/api/timetable",
        {
          tutorship_id: classItem.tutorship_id,
        },
        {
          headers: getAuthHeaders(),
          timeout: 10000,
        },
      );

      const timetableData = response.data || [];
      
      // Check if this class has a timetable entry for today
      for (const entry of timetableData) {
        if (entry.tutorship_id === classItem.tutorship_id) {
          const startTime = entry[`${todayDayKey}_start` as keyof TimetableEntry] as string;
          const endTime = entry[`${todayDayKey}_end` as keyof TimetableEntry] as string;
          const courseName = entry[`${todayDayKey}_course` as keyof TimetableEntry] as string;
          const meetingLink = entry[`${todayDayKey}_meeting_link` as keyof TimetableEntry] as string | null;
          
          if (hasClassTime(startTime, endTime)) {
            todayClassInfo.value = {
              courseName: courseName || classItem.tutorship_name || "Class",
              startTime: formatDisplayTime(startTime),
              endTime: formatDisplayTime(endTime),
              hasMeetingLink: !!meetingLink && meetingLink.trim() !== "",
              meetingLink: meetingLink,
              tutorshipId: classItem.tutorship_id,
              tutorshipName: classItem.tutorship_name
            };
            return; // Found today's class, stop searching
          }
        }
      }
    } catch (error) {
      console.error(`Error checking timetable for class ${classItem.tutorship_id}:`, error);
      // Continue checking other classes even if one fails
    }
  }
};

// Remove or update the old fetchTimetable function since we don't need it separately anymore
const fetchTimetable = async (tutorshipId: number): Promise<TimetableEntry[]> => {
  try {
    const response = await axios.post(
      "https://klegg-app-whh7m.ondigitalocean.app/api/timetable",
      {
        tutorship_id: tutorshipId,
      },
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      },
    );
    
    console.log(`Timetable response for ${tutorshipId}:`, response.data);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching timetable for ${tutorshipId}:`, error);
    return [];
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

// Separate error handler
const handleFetchError = (error: unknown) => {
  console.error("Error fetching data:", error);

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      router.replace("/");
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

  Toast.show({
    text: "Failed to load data. Please try again later",
    position: "top",
  });
};

// Handle system theme changes
const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
  updateStatusBar(isDark);
};

// Initialize theme detection
const initThemeDetection = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  handleSystemThemeChange(prefersDark);
  prefersDark.addEventListener('change', handleSystemThemeChange);
  return prefersDark;
};

// Setup OneSignal
const setupOneSignal = async (external_id_sub: string) => {
  const user_id = 'user_' + external_id_sub;
  await oneSignalService.setUser(user_id);
  console.log('OneSignal user set:', user_id);
};

// Initialize data
onMounted(async () => {
  try {
    detectPlatform();
    initThemeDetection();
    const currentUserName = userData?.username;
    await setupOneSignal(currentUserName);
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

/* Today's Class Alert */
.todays-class-alert {
  margin: 16px;
}

.alert-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: linear-gradient(
    135deg,
    rgba(var(--ion-color-success-rgb), 0.1),
    rgba(var(--ion-color-primary-rgb), 0.1)
  );
  border: 1px solid rgba(var(--ion-color-success-rgb), 0.2);
}

.alert-content {
  padding: 16px;
}

.alert-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.alert-header ion-icon {
  margin-right: 12px;
}

.alert-text h3 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ion-color-success);
}

.alert-text p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.join-button {
  --box-shadow: 0 4px 12px rgba(var(--ion-color-success-rgb), 0.3);
}

.join-button:active {
  --box-shadow: 0 2px 8px rgba(var(--ion-color-success-rgb), 0.3);
}

.no-link-message {
  text-align: center;
  padding: 8px;
}

.no-link-message ion-text {
  font-size: 0.8rem;
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
  background: var(--ion-color-primary);
}

.action-icon {
  font-size: 20px;
  color: white !important;
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
  .alert-card {
    background: linear-gradient(
      135deg,
      rgba(var(--ion-color-success-rgb), 0.15),
      rgba(var(--ion-color-primary-rgb), 0.15)
    );
    border: 1px solid rgba(var(--ion-color-success-rgb), 0.3);
  }
  
  .action-item {
    background: var(--ion-color-step-150);
    border-color: var(--ion-border-color);
  }
  
  .action-icon-wrapper {
    background: var(--ion-color-primary);
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
  .todays-class-alert {
    margin: 12px;
  }
  
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
  .todays-class-alert {
    margin: 16px auto;
    max-width: 600px;
  }
  
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

.join-button:focus-visible {
  outline: 2px solid var(--ion-color-success);
  outline-offset: 2px;
}

/* Safe area support for notched devices */
@supports(padding: max(0px)) {
  .todays-class-alert {
    margin-left: max(16px, env(safe-area-inset-left));
    margin-right: max(16px, env(safe-area-inset-right));
  }
  
  .content-card {
    margin-left: max(16px, env(safe-area-inset-left));
    margin-right: max(16px, env(safe-area-inset-right));
  }
  
  .quick-actions-container {
    padding-left: max(8px, env(safe-area-inset-left)) !important;
    padding-right: max(8px, env(safe-area-inset-right)) !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .action-item,
  .action-icon-wrapper,
  .join-button {
    transition: none;
  }
  
  .action-item:active,
  .join-button:active {
    transform: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .alert-card {
    border: 2px solid var(--ion-color-success);
  }
  
  .content-card {
    border: 2px solid var(--ion-border-color);
  }
  
  .action-item {
    border: 2px solid var(--ion-border-color);
  }
}
</style>