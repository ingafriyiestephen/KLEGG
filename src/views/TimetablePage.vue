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
      "https://school.klgilc.com/api/timetable",
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
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3,
.error-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-color-dark);
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
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
}

.time-content ion-icon {
  margin-right: 8px;
}

/* Animation for cards */
.day-card:active {
  transform: scale(0.98);
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .timetable-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
