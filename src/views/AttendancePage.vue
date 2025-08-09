<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Attendance</ion-title>
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
          <ion-card class="summary-card present">
            <ion-card-content>
              <div class="summary-content">
                <ion-icon
                  :icon="checkmarkCircle"
                  class="summary-icon"
                ></ion-icon>
                <div>
                  <ion-text class="summary-count">{{ presentCount }}</ion-text>
                  <ion-text class="summary-label">Present</ion-text>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card class="summary-card absent">
            <ion-card-content>
              <div class="summary-content">
                <ion-icon :icon="closeCircle" class="summary-icon"></ion-icon>
                <div>
                  <ion-text class="summary-count">{{ absentCount }}</ion-text>
                  <ion-text class="summary-label">Absent</ion-text>
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
      <div class="empty-state" v-else-if="!hasRecords && !error">
        <ion-icon :icon="calendarOutline" color="medium"></ion-icon>
        <ion-text>
          <h3>No Attendance Records</h3>
          <p>Your attendance will appear here when marked by your teacher</p>
        </ion-text>
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" color="danger"></ion-icon>
        <ion-text>
          <h3>Error Loading Attendance</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button fill="clear" @click="fetchAttendance">Retry</ion-button>
      </div>

      <!-- Attendance Records -->
      <div v-else>
        <ion-list lines="none">
          <ion-item-sliding
            v-for="(record, index) in attendanceRecords"
            :key="index"
          >
            <ion-item class="attendance-item" :detail="false">
              <div
                slot="start"
                class="status-indicator"
                :style="{
                  backgroundColor: getStatusColor(record.student_attendance),
                }"
              ></div>

              <ion-label class="attendance-content">
                <div class="attendance-header">
                  <ion-text
                    class="attendance-status"
                    :style="{
                      color: getStatusColor(record.student_attendance),
                    }"
                  >
                    {{ record.student_attendance }}
                  </ion-text>
                  <ion-text class="attendance-date">
                    {{
                      formatDate(record.attendance_date || record.created_at)
                    }}
                  </ion-text>
                </div>

                <div class="attendance-details">
                  <div class="detail-row">
                    <ion-icon :icon="personOutline"></ion-icon>
                    <ion-text>{{ record.student_name }}</ion-text>
                  </div>

                  <div class="detail-row">
                    <ion-icon :icon="schoolOutline"></ion-icon>
                    <ion-text>{{ record.teacher_name }}</ion-text>
                  </div>

                  <div class="detail-row" v-if="record.attendance_code">
                    <ion-icon :icon="barcodeOutline"></ion-icon>
                    <ion-text>Code: {{ record.attendance_code }}</ion-text>
                  </div>

                  <div class="detail-row" v-if="record.remark">
                    <ion-icon :icon="documentTextOutline"></ion-icon>
                    <ion-text>{{ record.remark }}</ion-text>
                  </div>
                </div>
              </ion-label>

              <div slot="end" class="attendance-icon">
                <ion-icon
                  :icon="getStatusIcon(record.student_attendance)"
                  :color="getStatusIconColor(record.student_attendance)"
                ></ion-icon>
              </div>
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option color="danger" @click="reportIssue(record)">
                <ion-icon slot="icon-only" :icon="flagOutline"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
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
} from "@ionic/vue";
import {
  checkmarkCircle,
  closeCircle,
  warningOutline,
  calendarOutline,
  personOutline,
  schoolOutline,
  documentTextOutline,
  flagOutline,
  timeOutline,
  barcodeOutline,
  checkmarkDoneOutline,
  closeOutline,
  alarmOutline,
  medicalOutline,
  helpCircleOutline,
} from "ionicons/icons";

interface AttendanceRecord {
  user_id: number;
  student_name: string;
  teacher_name: string;
  tutorship_id: number;
  tutorship_name: string;
  student_attendance: string;
  attendance_code?: string;
  attendance_group?: string;
  attendance_date?: string;
  created_at: string;
  remark?: string;
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
const hasRecords = ref<boolean>(false);
const attendanceRecords = ref<AttendanceRecord[]>([]);
const presentCount = ref<number>(0);
const absentCount = ref<number>(0);

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "present":
      return "var(--ion-color-success)";
    case "absent":
      return "var(--ion-color-danger)";
    case "late":
      return "var(--ion-color-warning)";
    case "sick":
      return "var(--ion-color-primary)";
    default:
      return "var(--ion-color-medium)";
  }
};

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case "present":
      return checkmarkDoneOutline;
    case "absent":
      return closeOutline;
    case "late":
      return alarmOutline;
    case "sick":
      return medicalOutline;
    default:
      return helpCircleOutline;
  }
};

const getStatusIconColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "present":
      return "success";
    case "absent":
      return "danger";
    case "late":
      return "warning";
    case "sick":
      return "primary";
    default:
      return "medium";
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } as Intl.DateTimeFormatOptions);
};

const fetchAttendance = async () => {
  try {
    loading.value = true;
    error.value = false;
    attendanceRecords.value = [];
    presentCount.value = 0;
    absentCount.value = 0;

    const response = await axios.get(
      "https://school.klgilc.com/api/attendances",
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );

    const userAttendance = response.data.filter(
      (record: AttendanceRecord) =>
        record.tutorship_id === tutorshipId && record.user_id === userId,
    );

    console.log("Filtered user attendance records:", userAttendance);

    if (userAttendance.length > 0) {
      hasRecords.value = true;
      tutorshipName.value = userAttendance[0].tutorship_name || "My Attendance";

      userAttendance.forEach((record: AttendanceRecord) => {
        if (record.student_attendance.toLowerCase() === "present") {
          presentCount.value++;
        } else if (record.student_attendance.toLowerCase() === "absent") {
          absentCount.value++;
        }
      });

      attendanceRecords.value = userAttendance.sort(
        (a: AttendanceRecord, b: AttendanceRecord) =>
          new Date(b.attendance_date || b.created_at).getTime() -
          new Date(a.attendance_date || a.created_at).getTime(),
      );
    }
  } catch (err) {
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const reportIssue = (record: AttendanceRecord) => {
  // Implement issue reporting functionality
  console.log("Reporting issue for record:", record);
  // This could open a modal or navigate to a reporting page
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
  fetchAttendance();
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

.summary-card.present {
  --background: rgba(var(--ion-color-success-rgb), 0.1);
}

.summary-card.absent {
  --background: rgba(var(--ion-color-danger-rgb), 0.1);
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 32px;
}

.summary-card.present .summary-icon {
  color: var(--ion-color-success);
}

.summary-card.absent .summary-icon {
  color: var(--ion-color-danger);
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

/* Attendance Records */
.status-indicator {
  width: 4px;
  height: 100%;
  border-radius: 4px;
  position: absolute;
  left: 0;
}

.attendance-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --background: var(--ion-item-background, var(--ion-background-color, #fff));
  margin-bottom: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.attendance-content {
  margin-left: 12px;
}

.attendance-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.attendance-status {
  font-weight: 600;
  font-size: 0.9rem;
}

.attendance-date {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.attendance-details {
  font-size: 0.875rem;
  color: var(--ion-color-medium);
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.detail-row ion-icon {
  margin-right: 8px;
  font-size: 16px;
  min-width: 20px;
}

.attendance-icon {
  font-size: 24px;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .summary-cards {
    gap: 24px;
  }

  .attendance-item {
    margin: 0 auto 12px;
    max-width: 800px;
  }
}
</style>
