<template>
  <ion-page class="modern-school-theme">
    <!-- Header with school-themed gradient -->
    <ion-header class="header-gradient">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/home"
            class="back-button"
          ></ion-back-button>
        </ion-buttons>
        <ion-title class="page-title">My Classes</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshClasses" fill="clear" class="refresh-btn">
            <ion-icon :icon="syncOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Main Content -->
    <ion-content :fullscreen="true" class="content-bg">
      <!-- Loading State -->
      <div class="loading-container" v-if="loading">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading your classes...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="classes.length === 0" class="creative-empty-state">
        <div class="desk-illustration">
          <div class="desk"></div>
          <div class="lamp"></div>
          <div class="book-stack">
            <div class="book"></div>
            <div class="book"></div>
            <div class="book"></div>
          </div>
        </div>
        <h3>No Classes Yet</h3>
        <p>When you enroll in a class, it'll appear here</p>
        <ion-button @click="refreshClasses" fill="solid" class="cta-button">
          Check Again
        </ion-button>
      </div>

      <div v-else class="class-grid">
        <div
          v-for="classItem in classes"
          :key="classItem.tutorship_id"
          class="class-card"
          @click="handleCardClick(classItem.tutorship_id)"
        >
          <!-- Main Card Content -->
          <div class="card-content">
            <div class="card-header">
              <div class="subject-badge">
                {{ getSubjectEmoji(classItem.subject_name) }}
              </div>
              <div
                class="quick-action"
                @click.stop="quickAction(classItem.tutorship_id, 'rate')"
              >
                <ion-icon :icon="starOutline"></ion-icon>
                {{ classItem.average_rating?.toFixed(1) || "Rate" }}
              </div>
            </div>

            <h3>{{ classItem.tutorship_name }}</h3>
            <p class="subject-name">{{ classItem.subject_name }}</p>
          </div>

          <!-- Two-Row Smart Action Ribbon -->
          <div
            class="action-ribbon two-row"
            :class="{ active: activeCard === classItem.tutorship_id }"
          >
            <div class="ribbon-row top-row">
              <button
                v-for="action in firstRowActions"
                :key="'first-' + action.id"
                @click.stop="navigateTo(classItem.tutorship_id, action.label)"
                class="ribbon-button"
                :style="{ '--delay': action.id }"
              >
                <ion-icon :icon="action.icon"></ion-icon>
                <span>{{ action.label }}</span>
              </button>
            </div>
            <div class="ribbon-row bottom-row">
              <button
                v-for="action in secondRowActions"
                :key="'second-' + action.id"
                @click.stop="navigateTo(classItem.tutorship_id, action.url)"
                class="ribbon-button"
                :style="{ '--delay': action.id + firstRowActions.length }"
              >
                <ion-icon :icon="action.icon"></ion-icon>
                <span>{{ action.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonToolbar,
  IonHeader,
  IonTitle,
  IonBackButton,
  IonButtons,
} from "@ionic/vue";
import {
  syncOutline,
  peopleOutline,
  starOutline,
  chevronForwardOutline,
  calendarOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  documentOutline,
  chatbubbleOutline,
  settingsOutline,
  clipboardOutline,
  bookOutline,
  starHalfOutline,
  checkmarkOutline,
  schoolOutline,
  peopleCircleOutline,
  desktopOutline,
} from "ionicons/icons";
import axios from "axios";
import { ref, onMounted, onUnmounted } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import { useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import { updateStatusBar } from '@/utils/statusBar';

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

// Extract values with fallbacks
const userId = userData?.user_id || 0;

console.log(userId);

interface ClassItem {
  tutorship_id: number;
  tutorship_name: string;
  subject_name: string;
  students_count: number;
  average_rating?: number;
  students_list: string;
}

const router = useRouter();
const activeCard = ref(null);
const loading = ref(true);
const classes = ref<ClassItem[]>([]);

const fetchClasses = async () => {
  try {
    loading.value = true;

    const response = await axios.get<ClassItem[]>(
      "https://klegg-app-whh7m.ondigitalocean.app/api/tutorships",
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );

    if (isNaN(userId)) {
      throw new Error("Invalid student ID");
    }

    classes.value = response.data
      .filter((classItem) => {
        try {
          // Handle potential malformed students_list
          const studentIds =
            classItem.students_list
              ?.split(",")
              .map(Number)
              .filter((id) => !isNaN(id)) || [];

          return studentIds.includes(userId);
        } catch (e) {
          console.warn("Error parsing students_list", classItem);
          return false;
        }
      })
      .map((classItem) => ({
        ...classItem,
        rating_score:
          classItem.average_rating !== undefined
            ? parseFloat(classItem.average_rating.toFixed(1))
            : undefined,
      }));
  } catch (error: unknown) {
    handleFetchError(error);
  } finally {
    loading.value = false;
  }
};

const refreshClasses = () => {
  loading.value = true;
  fetchClasses();
};

const getSubjectEmoji = (subject: any) => {
  const emojiMap = {
    math: "∫",
    mathematics: "∫",
    science: "🧪",
    chemistry: "🧪",
    english: "📚",
    literature: "📚",
    history: "🏛️",
    default: "📖",
  };

  return emojiMap["default"];
};

const firstRowActions = [
  { id: 1, icon: desktopOutline, label: "Classroom", url: "classroom" },
  { id: 2, icon: peopleOutline, label: "Attendance", url: "attendance" },
  { id: 3, icon: bookOutline, label: "Assignment", url: "assignment" },
];

const secondRowActions = [
  { id: 4, icon: checkmarkOutline, label: "Assessment", url: "assessment" },
  { id: 5, icon: documentOutline, label: "Exam", url: "exam" },
];

const handleCardClick = (id: any) => {
  activeCard.value = activeCard.value === id ? null : id;
};

const quickAction = (classId: number, action: string) => {
  if (action === "rate") {
    router.push(`/rate/${classId}`);
  }
};

const navigateTo = (classId: number, action: string) => {
  router.push(`/${action}/${classId}/`);
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

// Handle system theme changes
const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
  // Update status bar automatically using our utility
  updateStatusBar(isDark);
};

onIonViewWillEnter(async () => {
  await fetchClasses();
});

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
  fetchClasses();
});

</script>

<style scoped>
.modern-school-theme {
  --ion-font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  --math-color: #ff6b6b;
  --science-color: #4ecdc4;
  --english-color: #ff9ff3;
  --history-color: #feca57;
  --default-color: #8395a7;
}

/* Floating Header */
.floating-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--ion-card-background);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  z-index: 10;
  border-bottom: 1px solid var(--ion-border-color);
}

.header-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ion-text-color);
  margin: 0;
}

.back-btn {
  --color: var(--ion-text-color);
  --icon-font-size: 1.4rem;
}

.refresh-btn {
  --color: var(--ion-text-color);
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

@keyframes pageFlip {
  0%,
  100% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(-20deg);
  }
}

/* Empty State */
.creative-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  padding: 20px;
  text-align: center;
  background: var(--ion-background-color);
}

.desk-illustration {
  width: 200px;
  height: 150px;
  position: relative;
  margin-bottom: 30px;
}

.desk {
  position: absolute;
  bottom: 0;
  width: 180px;
  height: 10px;
  background: #a55c40; /* Kept as fixed color for consistency */
  border-radius: 4px;
}

.lamp {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 80px;
  background: var(--ion-color-step-200);
  border-radius: 30px 30px 0 0;
}

.lamp::after {
  content: "";
  position: absolute;
  bottom: -10px;
  left: 0;
  width: 100%;
  height: 20px;
  background: var(--ion-color-primary);
  border-radius: 0 0 10px 10px;
}

.book-stack {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
}

.book-stack .book {
  position: absolute;
  height: 8px;
  background: var(--ion-color-step-100);
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.book-stack .book:nth-child(1) {
  width: 100px;
  bottom: 0;
  left: 0;
  background: var(--english-color);
}

.book-stack .book:nth-child(2) {
  width: 110px;
  bottom: 10px;
  left: 5px;
  background: var(--history-color);
}

.book-stack .book:nth-child(3) {
  width: 90px;
  bottom: 20px;
  left: 15px;
  background: var(--science-color);
}

.creative-empty-state h3 {
  font-size: 1.3rem;
  color: var(--ion-text-color);
  margin-bottom: 8px;
}

.creative-empty-state p {
  color: var(--ion-color-medium);
  margin-bottom: 25px;
}

.cta-button {
  --background: var(--ion-color-primary);
  --background-activated: var(--ion-color-primary-shade);
  --color: var(--ion-color-primary-contrast);
  font-weight: 500;
  padding: 0 25px;
}

/* Class Grid */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
  background: var(--ion-background-color);
}

.class-card {
  background: var(--ion-card-background);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  cursor: pointer;
  border: 1px solid var(--ion-border-color);
}

.class-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

/* Subject Card Colors */
.math-card {
  border-top: 4px solid var(--math-color);
}

.science-card {
  border-top: 4px solid var(--science-color);
}

.english-card {
  border-top: 4px solid var(--english-color);
}

.history-card {
  border-top: 4px solid var(--history-color);
}

.default-card {
  border-top: 4px solid var(--default-color);
}

/* Card Content */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.subject-badge {
  width: 40px;
  height: 40px;
  background: var(--ion-color-step-100);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.class-meta {
  display: flex;
  gap: 12px;
}

.student-count,
.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

ion-icon {
  font-size: 16px;
  color: var(--ion-color-medium);
}

.class-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ion-text-color);
  margin: 0 0 5px 0;
}

.subject-name {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin: 0 0 20px 0;
}

.progress-bar {
  height: 6px;
  background: var(--ion-color-step-100);
  border-radius: 3px;
  margin-bottom: 15px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--ion-color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.completion-text {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  font-weight: 500;
}

.arrow-icon {
  color: var(--ion-color-medium);
  font-size: 1.2rem;
}

/* Card Container */
.class-card {
  position: relative;
  background: var(--ion-card-background);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid var(--ion-border-color);
}

.class-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Action Ribbon Container - FIXED */
.action-ribbon.two-row {
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
  background: var(--ion-color-step-50);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-ribbon.two-row.active {
  height: 120px; /* Enough height for two rows */
  padding: 8px 0;
  opacity: 1;
}

.ribbon-row {
  display: flex;
  justify-content: space-around;
  width: 100%;
  flex: 1;
}

.ribbon-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  margin: 0 4px;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--ion-color-medium);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s calc(var(--delay) * 0.1s);
}

.action-ribbon.two-row.active .ribbon-button {
  opacity: 1;
  transform: translateY(0);
}

.ribbon-button ion-icon {
  font-size: 1.2rem;
  margin-bottom: 4px;
  color: var(--ion-color-medium);
}

.ribbon-button span {
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--ion-color-medium);
}

/* Quick Rating Action */
.quick-action {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  color: var(--ion-color-warning);
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
}

/* Progress Bar */
.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.progress-bar {
  flex-grow: 1;
  height: 6px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--ion-color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* Subject Badges */
.subject-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
}

.math-badge {
  background: linear-gradient(135deg, var(--math-color), #ff8e8e);
}
.science-badge {
  background: linear-gradient(135deg, var(--science-color), #88f3ed);
}
.english-badge {
  background: linear-gradient(135deg, var(--english-color), #fd79a8);
}
.history-badge {
  background: linear-gradient(135deg, var(--history-color), #ff9f43);
}

/* Action Ribbon Container */
.action-ribbon.two-row {
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
  background: var(--ion-color-step-50);
  border-radius: 8px;
}

.action-ribbon.two-row.active {
  height: 120px;
  padding: 8px 0;
}

.ribbon-row {
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.ribbon-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  margin: 0 4px;
  min-width: 0;
}

.ribbon-button ion-icon {
  font-size: 1.2rem;
  margin-bottom: 4px;
  color: var(--ion-color-medium);
}

.ribbon-button span {
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--ion-color-medium);
}

/* Dark mode specific adjustments */
.dark .class-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .class-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.dark .floating-header {
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
}

.dark .action-ribbon {
  background: var(--ion-color-step-150);
}

.dark .action-ribbon.two-row {
  background: var(--ion-color-step-150);
}

/* Responsive Adjustments */
@media (max-width: 600px) {
  .class-grid {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
  }

  .floating-header {
    padding: 12px 15px;
  }
  
  .class-card {
    padding: 16px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .class-card {
    border: 2px solid var(--ion-border-color);
  }
  
  .action-ribbon {
    border: 1px solid var(--ion-border-color);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .class-card {
    transition: none;
  }
  
  .class-card:hover {
    transform: none;
  }
  
  .action-ribbon {
    transition: none;
  }
}

/* Safe area insets */
@supports(padding: max(0px)) {
  .class-grid {
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
  }
  
  .floating-header {
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
  }
}

/* Focus states for accessibility */
.class-card:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.ribbon-button:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Hover effects */
@media (hover: hover) {
  .class-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
  
  .ribbon-button:hover {
    color: var(--ion-color-primary);
  }
  
  .ribbon-button:hover ion-icon {
    color: var(--ion-color-primary);
  }
}

/* Animation for cards */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.class-card {
  animation: slideInUp 0.4s ease-out;
}

.class-card:nth-child(odd) {
  animation-delay: 0.1s;
}

.class-card:nth-child(even) {
  animation-delay: 0.2s;
}
</style>
