<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Timetable</ion-title>
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
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import { StatusBar, Style } from "@capacitor/status-bar";
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
import { timeOutline, calendarOutline, warningOutline } from "ionicons/icons";
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

interface DaySchedule {
  name: string;
  dayKey: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
}

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
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

const getWeekDates = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Adjust so Monday is 1, Sunday is 7
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

const hasClassTime = (startTime: string, endTime: string): boolean => {
  return (
    !!startTime && startTime.trim() !== "" && !!endTime && endTime.trim() !== ""
  );
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
        timeout: 20000, // 20-second timeout
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
          visibleDays.value.push({
            name: day.name,
            dayKey: day.dayKey,
            startTime,
            endTime,
            isToday: day.dayKey === todayKey,
          });
        }
      });
    }
  });
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

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

StatusBar.setOverlaysWebView({ overlay: false });
StatusBar.setBackgroundColor({ color: "#ffffff" });
StatusBar.setStyle({ style: Style.Light }); // Options: Light, Dark, Default

onMounted(() => {
  weekRange.value = getWeekDates();
  fetchTimetable();
  console.log("Mounted: Fetching timetable for tutorship ID:", tutorshipId);
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

.time-slot {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-primary);
}

.time-slot.today {
  border-left-color: var(--ion-color-success);
  background: rgba(var(--ion-color-success-rgb), 0.08);
}

.time-info {
  flex: 1;
}

.time-range {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin-bottom: 4px;
}

.time-subject {
  font-size: 0.9rem;
  color: var(--ion-text-color);
  opacity: 0.9;
  margin-bottom: 2px;
}

.time-location {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.time-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-primary);
  color: white;
  border-radius: 6px;
  font-size: 14px;
}

/* Animation for cards */
.day-card:active {
  transform: scale(0.98);
}

.day-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* Dark mode specific adjustments */
.dark .day-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .today-card {
  background: rgba(var(--ion-color-success-rgb), 0.08);
  border-color: rgba(var(--ion-color-success-rgb), 0.3);
}

.dark .time-slot {
  background: var(--ion-color-step-100);
}

.dark .time-slot.today {
  background: rgba(var(--ion-color-success-rgb), 0.12);
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

/* High contrast mode support */
@media (prefers-contrast: high) {
  .day-card {
    border: 2px solid var(--ion-border-color);
  }
  
  .time-slot {
    border: 1px solid var(--ion-border-color);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .day-card {
    transition: none;
  }
  
  .day-card:active {
    transform: none;
  }
}

/* Safe area insets */
@supports(padding: max(0px)) {
  .timetable-container {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
}

/* Focus states for accessibility */
.day-card:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.time-slot:focus-within {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Empty state improvements */
.empty-state .action-button {
  margin-top: 16px;
}

.error-state .retry-button {
  margin-top: 16px;
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
