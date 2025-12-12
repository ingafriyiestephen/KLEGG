<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Assignments</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Header Section -->
      <div class="header-section ion-padding">
        <ion-text class="title" v-if="tutorshipName">{{
          tutorshipName
        }}</ion-text>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <ion-card class="summary-card open">
            <ion-card-content>
              <div class="summary-content">
                <ion-icon :icon="timeOutline" class="summary-icon"></ion-icon>
                <div>
                  <ion-text class="summary-count">{{ openCount }}</ion-text>
                  <ion-text class="summary-label">Open</ion-text>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
          <ion-card class="summary-card closed">
            <ion-card-content>
              <div class="summary-content">
                <ion-icon :icon="closeOutline" class="summary-icon"></ion-icon>
                <div>
                  <ion-text class="summary-count">{{ closedCount }}</ion-text>
                  <ion-text class="summary-label">Closed</ion-text>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" v-if="loading">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-else-if="!hasAssignments && !error">
        <ion-icon :icon="documentTextOutline" color="medium"></ion-icon>
        <ion-text>
          <h3>No Assignments</h3>
          <p>Your assignments will appear here when created by your teacher</p>
        </ion-text>
        <ion-button fill="clear" @click="$router.back()"
          >Back to Classes</ion-button
        >
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" color="warning"></ion-icon>
        <ion-text>
          <h3>Error Loading Assignments</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button fill="clear" @click="fetchAssignments">Retry</ion-button>
      </div>

      <!-- Assignment List -->
      <div v-else>
        <ion-list lines="none">
          <ion-item-sliding
            v-for="(assignment, index) in assignments"
            :key="index"
          >
            <ion-item class="assignment-item" :detail="false">
              <div
                slot="start"
                class="status-indicator"
                :style="{ backgroundColor: getStatusColor(assignment) }"
              ></div>

              <ion-label class="assignment-content">
                <div class="assignment-header">
                  <ion-text class="assignment-title">{{
                    assignment.assignment_name
                  }}</ion-text>
                  <ion-badge :color="getStatusBadgeColor(assignment)">
                    <ion-icon
                      :icon="getStatusIcon(assignment)"
                      slot="start"
                    ></ion-icon>
                    {{ getStatusText(assignment) }}
                  </ion-badge>
                </div>

                <div class="assignment-meta theme-text-eight">
                  <ion-text class="assignment-date">
                    <ion-icon :icon="calendarOutline"></ion-icon>
                    Posted: {{ formatDate(assignment.created_at) }}
                  </ion-text>
                </div>

                <div class="assignment-notes" v-if="assignment.additional_note">
                  <ion-text class="theme-text-nine">{{ assignment.additional_note }}</ion-text>
                </div>

                <div class="assignment-footer">
                  <ion-text class="due-date">
                    <ion-icon :icon="alarmOutline"></ion-icon>
                    Due: {{ formatDate(assignment.submission_date) }}
                  </ion-text>

                  <ion-button
                    v-if="assignment.assignment_file"
                    fill="clear"
                    size="small"
                    @click="accessFile(assignment.assignment_file, isMobile ? 'view' : 'download')"
                  >
                    <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
                    {{ isMobile ? 'Open' : 'Download' }}
                  </ion-button>
                </div>
              </ion-label>
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option
                color="tertiary"
                @click="shareAssignment(assignment)"
              >
                <ion-icon slot="icon-only" :icon="shareOutline"></ion-icon>
              </ion-item-option>
              <ion-item-option
                color="primary"
                @click="viewSubmission(assignment)"
              >
                <ion-icon slot="icon-only" :icon="eyeOutline"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed} from "vue";
import { onIonViewWillEnter, isPlatform } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import { Toast } from "@capacitor/toast";
import axios from "axios";
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
  IonCardContent,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonButton,
  IonIcon,
  IonList,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonBadge,
} from "@ionic/vue";
import {
  timeOutline,
  checkmarkDoneOutline,
  warningOutline,
  documentTextOutline,
  calendarOutline,
  alarmOutline,
  downloadOutline,
  shareOutline,
  eyeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  timerOutline,
  closeOutline,
} from "ionicons/icons";

interface Assignment {
  assignment_id: number;
  tutorship_id: number;
  assignment_name: string;
  additional_note?: string;
  submission_date: string;
  assignment_file?: string;
  created_at: string;
}

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

// Extract values with fallbacks
const userId = userData?.user_id || 0;

const route = useRoute();
const router = useRouter();
const tutorshipId = Number(route.params.id);
const tutorshipName = ref<string>("");
const loading = ref<boolean>(true);
const error = ref<boolean>(false);
const hasAssignments = ref<boolean>(false);
const assignments = ref<Assignment[]>([]);
const closedCount = ref<number>(0);
const openCount = ref<number>(0);

const getStatus = (assignment: Assignment) => {
  const now = new Date();
  const dueDate = new Date(assignment.submission_date);
  const timeDiff = dueDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (now > dueDate) {
    return "closed";
  } else if (daysDiff <= 1) {
    return "dueSoon";
  } else if (daysDiff <= 3) {
    return "upcoming";
  } else {
    return "open";
  }
};


const isMobile = computed(() => {
  return isPlatform('ios') || isPlatform('android');
});


const getStatusColor = (assignment: Assignment): string => {
  const status = getStatus(assignment);
  switch (status) {
    case "closed":
      return "var(--ion-color-warning)";
    case "dueSoon":
      return "var(--ion-color-warning)";
    case "upcoming":
      return "var(--ion-color-primary)";
    default:
      return "var(--ion-color-success)";
  }
};

const getStatusBadgeColor = (assignment: Assignment): string => {
  const status = getStatus(assignment);
  switch (status) {
    case "closed":
      return "warning";
    case "open":
      return "success";
    case "dueSoon":
      return "warning";
    case "upcoming":
      return "primary";
    default:
      return "success";
  }
};

const getStatusIcon = (assignment: Assignment) => {
  const status = getStatus(assignment);
  switch (status) {
    case "closed":
      return closeCircleOutline;
    case "open":
      return closeCircleOutline;
    case "dueSoon":
      return alertCircleOutline;
    case "upcoming":
      return timerOutline;
    default:
      return checkmarkCircleOutline;
  }
};

const getStatusText = (assignment: Assignment): string => {
  const now = new Date();
  const dueDate = new Date(assignment.submission_date);
  const timeDiff = dueDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (now > dueDate) {
    return "Closed";
  } else if (daysDiff <= 1) {
    return "Due Soon";
  } else if (daysDiff <= 3) {
    return `Due in ${daysDiff} days`;
  } else {
    return "Open";
  }
};

const formatDate = (dateString: string): string => {
  const rawDate = new Date(dateString);
  const date = new Date(rawDate);

  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short", // Wed
    month: "short", // Mar
    day: "2-digit", // 26
    hour: "2-digit", // 21
    minute: "2-digit", // 15
    hour12: false, // 24-hour format
    timeZone: "UTC", // Optional: Use local time or UTC as needed
  }).format(date);

  return formatted; // "2025-03-26 21:15:56"
};

const fetchAssignments = async () => {
  try {
    loading.value = true;
    error.value = false;
    assignments.value = [];
    closedCount.value = 0;
    openCount.value = 0;

    const response = await axios.post(
      "https://klegg-app-whh7m.ondigitalocean.app/api/assignment",
      {
        tutorship_id: tutorshipId,
      },
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );

    if (response.data.length > 0) {
      hasAssignments.value = true;
      tutorshipName.value = response.data[0].tutorship_name || "My Assignments";

      // Sort by due date (earliest first)
      assignments.value = response.data.sort(
        (a: Assignment, b: Assignment) =>
          new Date(a.submission_date).getTime() -
          new Date(b.submission_date).getTime(),
      );

      // Count statuses
      assignments.value.forEach((assignment: Assignment) => {
        const status = getStatus(assignment);
        if (status === "closed") {
          closedCount.value++;
        } else {
          openCount.value++;
        }
      });
    }
  } catch (err) {
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};


const accessFile = async (filename: string, action: 'view' | 'download' = 'view') => {
  try {
    const loadingToast = await Toast.show({
      text: action === 'view' ? 'Opening file...' : 'Opening file for download...',
      position: 'top'
    });

    // For both view and download, just open the file in a new tab
    // Let the browser handle whether to show or download based on file type
    const fileUrl = `https://storage.draugustinaosabutey.com/api/files/${filename}/view`;
    window.open(fileUrl, '_blank');

    await Toast.show({
      text: 'File opened successfully',
      position: 'top',
      duration: 'short'
    });

  } catch (error) {
    console.error('File access error:', error);
    await Toast.show({
      text: `Failed to open file. Please try again.`,
      position: 'top',
      duration: 'long'
    });
  }
};



const shareAssignment = (assignment: Assignment) => {
  // Implement share functionality
  console.log("Sharing assignment:", assignment);
};

const viewSubmission = (assignment: Assignment) => {
  // Implement view submission functionality
  console.log("Viewing submission for:", assignment);
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
  fetchAssignments();
});

onIonViewWillEnter(async () => {
  initThemeDetection();
});


</script>

<style scoped>
/* Header Section */
.header-section {
  background: linear-gradient(
    135deg,
    var(--ion-color-primary) 0%,
    var(--ion-color-secondary) 100%
  );
  color: white;
  padding-bottom: 16px;
}

.header-section .title {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin-bottom: 16px;
}

/* Summary Cards */
.summary-cards {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.summary-card {
  flex: 1;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 0;
}

.summary-card.open {
  --background: rgba(var(--ion-color-success-rgb), 0.1);
}

.summary-card.closed {
  --background: rgba(var(--ion-color-warning-rgb), 0.1);
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 32px;
}

.summary-card.open .summary-icon {
  color: var(--ion-color-success);
}

.summary-card.closed .summary-icon {
  color: var(--ion-color-warning);
}

.summary-count {
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
  line-height: 1.2;
  color: var(--ion-color-light);
}

.summary-label {
  font-size: 0.875rem;
  opacity: 0.8;
  display: block;
  color: var(--ion-color-light);
}

.theme-text-nine {
  opacity: 0.9;
  color: var(--ion-text-color);
}

.theme-text-eight {
  opacity: 0.9;
  color: var(--ion-text-color);
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

.empty-state ion-icon,
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

/* Assignment Items */
.status-indicator {
  width: 4px;
  height: 100%;
  border-radius: 4px;
  position: absolute;
  left: 0;
}

.assignment-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --background: var(--ion-item-background, var(--ion-background-color, #fff));
  margin-bottom: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.assignment-content {
  margin-left: 12px;
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.assignment-title {
  font-weight: 600;
  font-size: 1rem;
  flex: 1;
  margin-right: 8px;
}

.assignment-meta {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  margin-bottom: 8px;
}

.assignment-meta ion-icon {
  margin-right: 4px;
  vertical-align: middle;
}

.assignment-notes {
  font-size: 0.875rem;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
  line-height: 1.5;
}

.assignment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-light);
}

.due-date {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.due-date ion-icon {
  margin-right: 4px;
  vertical-align: middle;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .summary-cards {
    gap: 24px;
  }

  .assignment-item {
    margin: 0 auto 12px;
    max-width: 800px;
  }
}
</style>
