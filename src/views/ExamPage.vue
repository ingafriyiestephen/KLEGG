<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Exam Results</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Performance Summary Card -->
      <ion-card class="summary-card">
        <ion-card-header>
          <ion-card-title class="summary-title">
            <ion-icon :icon="barChartOutline" color="primary"></ion-icon>
            Exam Overview
          </ion-card-title>
        </ion-card-header>

        <ion-card-content class="summary-content">
          <div class="summary-item">
            <ion-text class="summary-label">Exam</ion-text>
            <ion-text class="summary-value">{{ examName }}</ion-text>
          </div>

          <div class="divider"></div>

          <div class="summary-item">
            <ion-text class="summary-label">Your Score</ion-text>
            <ion-text
              class="summary-value"
              :class="getGradeClass(percentageScore)"
            >
              {{ percentageScore }}%
            </ion-text>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Loading State -->
      <div class="loading-container" v-if="loading">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-else-if="!hasResults && !error">
        <ion-icon
          :icon="documentTextOutline"
          size="large"
          color="medium"
        ></ion-icon>
        <ion-text>
          <h3>No Exam Results</h3>
          <p>Your exam results will appear here once available</p>
        </ion-text>
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" size="large" color="danger"></ion-icon>
        <ion-text>
          <h3>Error Loading Results</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button fill="clear" @click="fetchExamResults">Retry</ion-button>
      </div>

      <!-- Exam Details -->
      <ion-card v-else class="details-card">
        <ion-card-header>
          <ion-card-title>Detailed Results</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <div class="detail-row">
            <ion-text class="detail-label">Score</ion-text>
            <ion-text class="detail-value">
              {{ examData.score_numerator }}/{{ examData.score_denominator }}
            </ion-text>
          </div>

          <div class="detail-row">
            <ion-text class="detail-label">Percentage</ion-text>
            <ion-text
              class="detail-value"
              :class="getGradeClass(percentageScore)"
            >
              {{ percentageScore }}%
            </ion-text>
          </div>

          <div class="detail-row" v-if="examData.created_at">
            <ion-text class="detail-label">Date Taken</ion-text>
            <ion-text class="detail-value">
              {{ formatDate(examData.created_at) }}
            </ion-text>
          </div>

          <div class="feedback-section" v-if="examData.comments">
            <ion-text class="feedback-title">Instructor Feedback</ion-text>
            <ion-text class="feedback-content">{{
              examData.comments
            }}</ion-text>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import axios from "axios";
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
  IonLabel,
  IonText,
  IonSpinner,
  IonButton,
  IonIcon,
} from "@ionic/vue";
import {
  barChartOutline,
  documentTextOutline,
  warningOutline,
} from "ionicons/icons";

interface ExamResult {
  student_id: number;
  tutorship_id: number;
  score_numerator: number;
  score_denominator: number;
  tutorship_name?: string;
  created_at?: string;
  comments?: string;
}
const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

// Extract values with fallbacks
const userId = userData?.user_id || 0;

const router = useRouter();
const route = useRoute();
const tutorshipId = Number(route.params.id);
const loading = ref<boolean>(true);
const error = ref<boolean>(false);
// Initialize with default values to avoid null
const examData = ref<ExamResult>({
  student_id: 0,
  tutorship_id: 0,
  score_numerator: 0,
  score_denominator: 0,
});

const hasResults = computed(() => examData.value !== null);
const examName = computed(() => examData.value?.tutorship_name || "Exam");
const percentageScore = computed(() => {
  if (!examData.value) return 0;
  return calculatePercentage(
    examData.value.score_numerator,
    examData.value.score_denominator,
  );
});

const calculatePercentage = (
  numerator: number,
  denominator: number,
): number => {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
};

const getGradeClass = (percentage: number): string => {
  if (percentage >= 85) return "excellent";
  if (percentage >= 70) return "good";
  if (percentage >= 50) return "average";
  return "poor";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return date.toLocaleDateString(undefined, options);
};

const fetchExamResults = async () => {
  try {
    loading.value = true;
    error.value = false;
    // Reset to default values
    examData.value = {
      student_id: 0,
      tutorship_id: 0,
      score_numerator: 0,
      score_denominator: 0,
    };

    const response = await axios.post(
      "https://klegg-app-whh7m.ondigitalocean.app/api/exams",
      {
        tutorship_id: tutorshipId,
        student_id: userId,
      },
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );

    if (response.data.length > 0) {
      examData.value = response.data[0]; // Get first exam result
    }
  } catch (err) {
    console.error("Error fetching exam results:", err);
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
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

StatusBar.setOverlaysWebView({ overlay: false });
StatusBar.setBackgroundColor({ color: "#ffffff" });
StatusBar.setStyle({ style: Style.Light }); // Options: Light, Dark, Default

onMounted(() => {
  fetchExamResults();
});
</script>

<style scoped>
/* Summary Card */
.summary-card {
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-text-color);
  white-space: pre-line;
}

.summary-title ion-icon {
  font-size: 24px;
}

.summary-content {
  display: flex;
  justify-content: space-between;
  padding: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.divider {
  width: 1px;
  background-color: var(--ion-color-light);
  margin: 0 8px;
}

.summary-label {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 600;
}

/* Grade Colors */
.excellent {
  color: var(--ion-color-success);
}
.good {
  color: var(--ion-color-primary);
}
.average {
  color: var(--ion-color-warning);
}
.poor {
  color: var(--ion-color-danger);
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

/* Details Card */
.details-card {
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.details-card ion-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-text-color);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--ion-color-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.detail-value {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Feedback Section */
.feedback-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-light);
}

.feedback-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
}

.feedback-content {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .summary-card,
  .details-card {
    margin: 16px auto;
    max-width: 800px;
  }
}
</style>
