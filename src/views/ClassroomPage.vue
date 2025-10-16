<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Classroom</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :fullscreen="true">
      <!-- Header Section -->
      <div class="header-section">
        <ion-text class="title" v-if="tutorshipName">{{
          tutorshipName
        }}</ion-text>
        <ion-text class="subtitle">{{ weekRange }}</ion-text>
      </div>

      <!-- Loading State -->
      <div class="loading-container" v-if="loading">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-else-if="!hasClasses">
        <ion-icon :icon="calendarOutline" size="large"></ion-icon>
        <ion-text>
          <h3>No Classes Scheduled</h3>
          <p>Your timetable will appear here when classes are scheduled</p>
        </ion-text>
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" color="danger" size="large"></ion-icon>
        <ion-text>
          <h3>Failed to load timetable</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button @click="fetchTimetable" fill="clear">Retry</ion-button>
      </div>

      <!-- Timetable Cards -->
      <div class="timetable-container" v-else>
        <ion-card
          v-for="(day, index) in visibleDays"
          :key="index"
          class="day-card"
          :class="{ 'today-card': day.isToday }"
        >
          <ion-card-header>
            <ion-card-title class="day-title">
              {{ day.name }}
              <ion-badge color="success" v-if="day.isToday">Today</ion-badge>
            </ion-card-title>
          </ion-card-header>

          <ion-card-content class="time-content">
            <ion-item lines="none">
              <ion-icon
                slot="start"
                :icon="timeOutline"
                color="primary"
              ></ion-icon>
              <ion-label> {{ day.startTime }} - {{ day.endTime }} </ion-label>
            </ion-item>
            
            <!-- Replace this section in your template -->
            <!-- Join Link Section -->
            <div class="join-section" v-if="day.isToday">
              <ion-button 
                class="join-button"
                :disabled="!day.canJoin && !day.classEnded"
                :fill="getButtonFill(day)"
                :color="getButtonColor(day)"
                @click="joinClass(day)"
                expand="block"
              >
                <ion-icon slot="start" :icon="getButtonIcon(day)"></ion-icon>
                {{ getButtonText(day) }}
              </ion-button>
              
              <!-- Countdown Timer -->
              <div class="countdown" v-if="day.countdown && !day.canJoin && !day.classInProgress">
                <ion-text color="medium">
                  Starts in {{ day.countdown }}
                </ion-text>
              </div>
              
              <!-- Status Message -->
              <div class="status-message" v-if="day.statusMessage">
                <ion-text :color="day.statusColor">
                  {{ day.statusMessage }}
                </ion-text>
              </div>
            </div>
            
            <!-- Not Today Message -->
            <div class="not-today-message" v-else>
              <ion-text color="medium">
                Join link will be available on {{ day.name }}
              </ion-text>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted} from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import { updateStatusBar } from '@/utils/statusBar';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonText,
  IonSpinner,
  IonButton,
  IonBadge,
} from "@ionic/vue";
import { 
  timeOutline, 
  calendarOutline, 
  warningOutline, 
  videocamOutline,
  checkmarkCircleOutline 
} from "ionicons/icons";
import axios from "axios";

interface TimetableEntry {
  tutorship_id: number;
  tutorship_name?: string;
  monday_start: string;
  monday_end: string;
  tuesday_start: string;
  tuesday_end: string;
  wednesday_start: string;
  wednesday_end: string;
  thursday_start: string;
  thursday_end: string;
  friday_start: string;
  friday_end: string;
  saturday_start: string;
  saturday_end: string;
  sunday_start: string;
  sunday_end: string;
}

// Replace the DaySchedule interface
interface DaySchedule {
  name: string;
  dayKey: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
  canJoin: boolean;
  classInProgress: boolean;
  classEnded: boolean;
  countdown?: string;
  statusMessage?: string;
  statusColor?: string;
  startDateTime?: Date;
  endDateTime?: Date;
}

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user");
const userData = userDataString ? JSON.parse(userDataString) : null;

const route = useRoute();
const router = useRouter();
const tutorshipId = Number(route.params.id);
const tutorshipName = ref<string>("");
const weekRange = ref<string>("");
const loading = ref<boolean>(true);
const error = ref<boolean>(false);
const hasClasses = ref<boolean>(false);
const visibleDays = ref<DaySchedule[]>([]);
let countdownInterval: number | null = null;

const getWeekDates = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  return `${monday.toLocaleDateString(undefined, options)} - ${sunday.toLocaleDateString(undefined, options)}`;
};

// Add these new helper functions
const getButtonText = (day: DaySchedule): string => {
  if (day.classEnded) return 'Join Ended';
  if (day.classInProgress) return 'Join Now';
  if (day.canJoin) return 'Join Soon';
  return 'Join Soon';
};

const getButtonColor = (day: DaySchedule): string => {
  if (day.classEnded) return 'medium';
  if (day.classInProgress) return 'success';
  if (day.canJoin) return 'primary';
  return 'medium';
};

// Replace the getButtonFill function
const getButtonFill = (day: DaySchedule): "solid" | "outline" | "clear" => {
  if (day.classEnded) return 'outline';
  if (day.classInProgress) return 'solid';
  if (day.canJoin) return 'solid';
  return 'outline';
};

const getButtonIcon = (day: DaySchedule) => {
  if (day.classEnded) return timeOutline;
  if (day.classInProgress) return videocamOutline;
  if (day.canJoin) return timeOutline;
  return timeOutline;
};

const hasClassTime = (startTime: string, endTime: string): boolean => {
  return (
    !!startTime && startTime.trim() !== "" && !!endTime && endTime.trim() !== ""
  );
};

// Parse time string and create Date object for today
const parseClassTime = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today;
};

// Check if join should be enabled (10 minutes before class)
const shouldEnableJoin = (startTime: Date): boolean => {
  const now = new Date();
  const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
  return now >= tenMinutesBefore && now < startTime;
};

// Check if class is in progress
const isClassInProgress = (startTime: Date, endTime: Date): boolean => {
  const now = new Date();
  return now >= startTime && now < endTime;
};

// Check if class has ended
const isClassEnded = (endTime: Date): boolean => {
  const now = new Date();
  return now >= endTime;
};

// Calculate countdown until join becomes available
const getCountdown = (startTime: Date): string => {
  const now = new Date();
  const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
  
  if (now < tenMinutesBefore) {
    const diff = tenMinutesBefore.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  return '';
};

// Update join status for all classes
const updateJoinStatus = () => {
  visibleDays.value.forEach(day => {
    if (day.isToday && day.startDateTime && day.endDateTime) {
      const now = new Date();
      const tenMinutesBefore = new Date(day.startDateTime.getTime() - 10 * 60 * 1000);
      
      // Reset status
      day.canJoin = false;
      day.statusMessage = '';
      day.statusColor = 'medium';
      
      if (now < tenMinutesBefore) {
        // Class hasn't started yet, join not available
        day.countdown = getCountdown(day.startDateTime);
        day.statusMessage = `Join available at ${formatTime(tenMinutesBefore)}`;
      } else if (now >= tenMinutesBefore && now < day.startDateTime) {
        // Join is available (10 minutes before class)
        day.canJoin = true;
        day.countdown = '';
        day.statusMessage = 'Join now to enter class';
        day.statusColor = 'success';
      } else if (isClassInProgress(day.startDateTime, day.endDateTime)) {
        // Class is in progress
        day.canJoin = true;
        day.countdown = '';
        day.statusMessage = 'Class in progress - Join now';
        day.statusColor = 'warning';
      } else if (isClassEnded(day.endDateTime)) {
        // Class has ended
        day.countdown = '';
        day.statusMessage = 'Class has ended';
        day.statusColor = 'danger';
      }
    }
  });
};

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fetchTimetable = async () => {
  try {
    loading.value = true;
    error.value = false;

    const response = await axios.post(
      "https://klegg-app-whh7m.ondigitalocean.app/api/timetable",
      {
        tutorship_id: tutorshipId,
      },
      {
        headers: getAuthHeaders(),
        timeout: 20000,
      },
    );
    console.log("Timetable response:", response.data);
    processTimetableData(response.data);
  } catch (err) {
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const processTimetableData = (data: TimetableEntry[]) => {
  const days = [
    { name: "Monday", dayKey: "monday" },
    { name: "Tuesday", dayKey: "tuesday" },
    { name: "Wednesday", dayKey: "wednesday" },
    { name: "Thursday", dayKey: "thursday" },
    { name: "Friday", dayKey: "friday" },
    { name: "Saturday", dayKey: "saturday" },
    { name: "Sunday", dayKey: "sunday" },
  ];

  const todayIndex = new Date().getDay();
  const todayKey = days[todayIndex === 0 ? 6 : todayIndex - 1].dayKey;

  visibleDays.value = [];
  hasClasses.value = false;

  data.forEach((entry) => {
    if (entry.tutorship_id === tutorshipId) {
      tutorshipName.value = entry.tutorship_name || "My Timetable";

      days.forEach((day) => {
        const startTime = entry[
          `${day.dayKey}_start` as keyof TimetableEntry
        ] as string;
        const endTime = entry[
          `${day.dayKey}_end` as keyof TimetableEntry
        ] as string;

        if (hasClassTime(startTime, endTime)) {
          hasClasses.value = true;
          
          const startDateTime = parseClassTime(startTime);
          const endDateTime = parseClassTime(endTime);
          const isToday = day.dayKey === todayKey;
          
        // In processTimetableData, update the daySchedule object creation:
        const daySchedule: DaySchedule = {
          name: day.name,
          dayKey: day.dayKey,
          startTime,
          endTime,
          isToday,
          canJoin: false,
          classInProgress: false,
          classEnded: false,
          startDateTime,
          endDateTime
        };

          // Initialize join status
          if (isToday) {
            updateDayJoinStatus(daySchedule);
          }

          visibleDays.value.push(daySchedule);
        }
      });
    }
  });

  // Start countdown timer if there are today's classes
  startCountdownTimer();
};

// Replace the updateDayJoinStatus function
const updateDayJoinStatus = (day: DaySchedule) => {
  if (!day.startDateTime || !day.endDateTime) return;

  const now = new Date();
  const tenMinutesBefore = new Date(day.startDateTime.getTime() - 10 * 60 * 1000);
  
  // Reset all states
  day.canJoin = false;
  day.classInProgress = false;
  day.classEnded = false;
  day.countdown = '';
  day.statusMessage = '';
  day.statusColor = 'medium';
  
  if (now < tenMinutesBefore) {
    // Class hasn't started yet
    day.countdown = getCountdown(day.startDateTime);
    day.statusMessage = `Join available at ${formatTime(tenMinutesBefore)}`;
    day.statusColor = 'medium';
  } else if (now >= tenMinutesBefore && now < day.startDateTime) {
    // Join window is open but class hasn't started
    day.canJoin = true;
    day.statusMessage = 'Class starting soon - Join now';
    day.statusColor = 'success';
  } else if (isClassInProgress(day.startDateTime, day.endDateTime)) {
    // Class is in progress
    day.canJoin = true;
    day.classInProgress = true;
    day.statusMessage = 'Class in progress';
    day.statusColor = 'warning';
  } else if (isClassEnded(day.endDateTime)) {
    // Class has ended
    day.classEnded = true;
    day.statusMessage = 'Class has ended';
    day.statusColor = 'danger';
  }
};

const startCountdownTimer = () => {
  // Clear existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update every minute
  countdownInterval = window.setInterval(() => {
    updateJoinStatus();
  }, 60000);
};

const joinClass = (day: DaySchedule) => {
  if (!day.canJoin) return;

  // Here you would implement the actual join logic
  // For now, we'll show a success message
  Toast.show({
    text: `Joining ${tutorshipName.value} class...`,
    position: 'top',
    duration: 'short'
  });

  // Simulate joining process
  setTimeout(() => {
    Toast.show({
      text: `Successfully joined ${tutorshipName.value} class!`,
      position: 'top',
      duration: 'short'
    });
    
    // You would typically navigate to the video call page here
    // router.push('/video-call');
  }, 1000);
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

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

const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
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

onMounted(() => {
  initThemeDetection();
  weekRange.value = getWeekDates();
  fetchTimetable();
});

onIonViewWillEnter(async () => {
  initThemeDetection();
});


onUnmounted(() => {
  // Clean up countdown interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
});
</script>

<style scoped>
/* Header Section */
.header-section {
  margin-bottom: 24px;
  text-align: center;
  background: var(--ion-background-color);
}

.title {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-bottom: 4px;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background: var(--ion-background-color);
}

.loading-container ion-spinner {
  color: var(--ion-color-primary);
}

/* Empty & Error States */
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: 20px;
  background: var(--ion-background-color);
}

.empty-state ion-icon {
  color: var(--ion-color-medium);
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.error-state ion-icon {
  color: var(--ion-color-danger);
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-state h3,
.error-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-text-color);
}

.empty-state p,
.error-state p {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
  line-height: 1.4;
}

/* Timetable Cards */
.timetable-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--ion-background-color);
}

.day-card {
  background: var(--ion-card-background);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  border-left: 4px solid var(--ion-color-primary);
  border: 1px solid var(--ion-border-color);
}

.today-card {
  border-left: 4px solid var(--ion-color-success);
  background: rgba(var(--ion-color-success-rgb), 0.05);
  border-color: rgba(var(--ion-color-success-rgb), 0.2);
}

.day-card-header {
  padding: 16px;
  border-bottom: 1px solid var(--ion-border-color);
  background: var(--ion-item-background);
  border-radius: 12px 12px 0 0;
}

.day-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-text-color);
}

.day-date {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  font-weight: 400;
}

.time-content {
  padding: 16px;
  background: var(--ion-card-background);
  border-radius: 0 0 12px 12px;
}

.time-content ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: transparent;
  --border-color: var(--ion-border-color);
  margin-bottom: 12px;
}

.time-content ion-item:last-child {
  margin-bottom: 0;
}

.time-content ion-icon {
  margin-right: 8px;
  color: var(--ion-color-primary);
}

/* Join Section Styles */
.join-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-step-100);
}

.join-button {
  margin-bottom: 8px;
}

.join-button:not(.button-disabled) {
  --box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
}

.countdown {
  text-align: center;
  margin-bottom: 8px;
}

.countdown ion-text {
  font-size: 0.8rem;
  font-weight: 500;
}

.status-message {
  text-align: center;
}

.status-message ion-text {
  font-size: 0.8rem;
  font-weight: 500;
}

.not-today-message {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-step-100);
  text-align: center;
}

.not-today-message ion-text {
  font-size: 0.8rem;
  font-style: italic;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .timetable-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .day-card {
    margin: 0;
  }
}

@media (min-width: 1024px) {
  .timetable-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Animation for cards */
.day-card:active {
  transform: scale(0.98);
}

.day-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* Focus states for accessibility */
.day-card:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.join-button:focus {
  --box-shadow: 0 0 0 2px var(--ion-color-primary);
}

/* Loading animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.day-card {
  animation: fadeIn 0.3s ease-out;
}

.day-card:nth-child(odd) {
  animation-delay: 0.1s;
}

.day-card:nth-child(even) {
  animation-delay: 0.2s;
}
</style>