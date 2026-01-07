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
            <ion-card-subtitle 
              class="course-name" 
              v-if="day.courseName && day.courseName !== '-'"
            >
              {{ day.courseName }}
            </ion-card-subtitle>
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
            
            <!-- Join Button Section - SIMPLIFIED -->
            <div class="join-section" v-if="day.isToday">
              <ion-button 
                class="join-button"
                :disabled="!day.hasMeetingLink"
                :fill="day.hasMeetingLink ? 'solid' : 'outline'"
                :color="day.hasMeetingLink ? 'success' : 'medium'"
                @click="joinClass(day)"
                expand="block"
              >
                <ion-icon slot="start" :icon="day.hasMeetingLink ? videocamOutline : timeOutline"></ion-icon>
                {{ day.hasMeetingLink ? 'Enter Classroom' : 'No Meeting Link' }}
              </ion-button>
              
              <!-- Simple status message -->
              <div class="status-message">
                <ion-text :color="day.hasMeetingLink ? 'success' : 'medium'">
                  <small>
                    {{ day.hasMeetingLink ? 
                      `Class scheduled for today at ${day.startTime}` : 
                      'Meeting link not available' 
                    }}
                  </small>
                </ion-text>
              </div>
            </div>

            <!-- Not Today Message -->
            <div class="not-today-message" v-else>
              <ion-text color="medium">
                {{ getFutureDayMessage(day) }}
              </ion-text>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
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
  videocamOutline
} from "ionicons/icons";
import axios from "axios";

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
  // Meeting links
  monday_meeting_link?: string | null;
  tuesday_meeting_link?: string | null;
  wednesday_meeting_link?: string | null;
  thursday_meeting_link?: string | null;
  friday_meeting_link?: string | null;
  saturday_meeting_link?: string | null;
  sunday_meeting_link?: string | null;
}

interface DaySchedule {
  name: string;
  dayKey: string;
  courseName: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
  hasMeetingLink: boolean;
  meetingLink?: string | null;
  dayIndex: number;
}

const token = localStorage.getItem("parisklegg_token") || "";
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
const today = new Date();
const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

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

const getWeekDates = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  return `${monday.toLocaleDateString(undefined, options)} - ${sunday.toLocaleDateString(undefined, options)}`;
};

// Get message for future days
const getFutureDayMessage = (day: DaySchedule): string => {
  const daysUntil = (day.dayIndex - todayDayIndex + 7) % 7;
  if (daysUntil === 1) return "Join link available tomorrow";
  if (daysUntil > 0) return `Join link available in ${daysUntil} days`;
  return "Join link available next week";
};

// Simplified: Check if there's a valid class time
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

const fetchTimetable = async () => {
  try {
    loading.value = true;
    error.value = false;
    visibleDays.value = [];
    hasClasses.value = false;

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
  visibleDays.value = [];
  hasClasses.value = false;

  data.forEach((entry) => {
    if (entry.tutorship_id === tutorshipId) {
      tutorshipName.value = entry.tutorship_name || "My Timetable";

      // Process each day
      daysConfig.forEach((dayConfig) => {
        const startTime = entry[`${dayConfig.dayKey}_start` as keyof TimetableEntry] as string;
        const endTime = entry[`${dayConfig.dayKey}_end` as keyof TimetableEntry] as string;
        const courseName = entry[`${dayConfig.dayKey}_course` as keyof TimetableEntry] as string;
        const meetingLink = entry[`${dayConfig.dayKey}_meeting_link` as keyof TimetableEntry] as string | null;

        if (hasClassTime(startTime, endTime)) {
          hasClasses.value = true;
          
          const isToday = dayConfig.index === todayDayIndex;
          const hasMeetingLink = !!meetingLink && meetingLink.trim() !== "";

          const daySchedule: DaySchedule = {
            name: dayConfig.name,
            dayKey: dayConfig.dayKey,
            courseName: courseName || "General Class",
            startTime: formatDisplayTime(startTime),
            endTime: formatDisplayTime(endTime),
            isToday,
            hasMeetingLink,
            meetingLink,
            dayIndex: dayConfig.index
          };

          visibleDays.value.push(daySchedule);
        }
      });
    }
  });

  // Sort by day index (starting from today)
  visibleDays.value.sort((a, b) => {
    const aDiff = (a.dayIndex - todayDayIndex + 7) % 7;
    const bDiff = (b.dayIndex - todayDayIndex + 7) % 7;
    return aDiff - bDiff;
  });
};

// Format time for display (remove seconds if present)
const formatDisplayTime = (timeString: string): string => {
  if (!timeString) return "";
  // Remove seconds if present
  return timeString.split(':').slice(0, 2).join(':');
};

const joinClass = async (day: DaySchedule) => {
  if (!day.hasMeetingLink || !day.meetingLink) {
    Toast.show({
      text: 'Meeting link not available for this class',
      position: 'top',
      duration: 'short'
    });
    return;
  }

  try {
    Toast.show({
      text: `Opening ${tutorshipName.value} class...`,
      position: 'top',
      duration: 'short'
    });

    // For mobile apps, use _system to open in appropriate app
    if (isMobile()) {
      // For Zoom links
      if (day.meetingLink.includes('zoom.us')) {
        const zoomUrl = day.meetingLink.replace('/j/', '/join/');
        window.open(zoomUrl, '_system');
        return;
      }
      
      // For Google Meet links
      if (day.meetingLink.includes('meet.google.com')) {
        window.open(day.meetingLink, '_system');
        return;
      }
    }

    // For web or other links
    window.open(day.meetingLink, '_blank');
    
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

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": `Bearer ${token}`,
});

const handleFetchError = (error: unknown) => {
  console.error("Error fetching timetable:", error);

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
    text: "Failed to load timetable. Please try again later",
    position: "top",
  });
};

const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
  updateStatusBar(isDark);
};

const initThemeDetection = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  handleSystemThemeChange(prefersDark);
  prefersDark.addEventListener('change', handleSystemThemeChange);
  return prefersDark;
};

onMounted(() => {
  initThemeDetection();
  weekRange.value = getWeekDates();
  fetchTimetable();
});

onIonViewWillEnter(() => {
  initThemeDetection();
  fetchTimetable();
});
</script>

<style scoped>
/* Header Section */
.header-section {
  margin-bottom: 24px;
  text-align: center;
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
}

.empty-state ion-icon {
  color: var(--ion-color-medium);
  font-size: 64px;
  margin-bottom: 16px;
}

.error-state ion-icon {
  color: var(--ion-color-danger);
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3,
.error-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-state p,
.error-state p {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

/* Timetable Cards */
.timetable-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.day-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
  border-left: 4px solid var(--ion-color-primary);
}

.today-card {
  border-left: 4px solid var(--ion-color-success);
  background: rgba(var(--ion-color-success-rgb), 0.05);
}

.day-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.1rem;
  font-weight: 600;
}

.time-content {
  padding-top: 0;
}

.time-content ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: transparent;
  margin-bottom: 16px;
}

.time-content ion-icon {
  margin-right: 8px;
}

/* Join Section */
.join-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-step-100);
}

.join-button:not(.button-disabled) {
  --box-shadow: 0 4px 12px rgba(var(--ion-color-success-rgb), 0.3);
}

.status-message {
  text-align: center;
  margin-top: 8px;
}

.status-message ion-text {
  font-size: 0.85rem;
}

.not-today-message {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-step-100);
  text-align: center;
}

.not-today-message ion-text {
  font-size: 0.85rem;
  font-style: italic;
}

.course-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ion-color-primary);
  margin-top: 4px;
}

/* Responsive */
@media (min-width: 768px) {
  .timetable-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1024px) {
  .timetable-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

.day-card:active {
  transform: scale(0.98);
}
</style>