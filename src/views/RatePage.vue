<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/courses"></ion-back-button>
        </ion-buttons>
        <ion-title>Course Rating</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :fullscreen="true">
      <!-- Course Header -->
      <!-- <div class="course-header">
        <ion-text color="medium">
          <p class="course-code">Course ID: {{ courseId }}</p>
        </ion-text>
        <ion-text>
          <h1 class="course-title">{{ courseName }}</h1>
        </ion-text>
        <ion-text color="medium">
          <p class="instructor">Taught by: {{ instructorName }}</p>
        </ion-text>
      </div> -->

      <!-- Rating Card -->
      <ion-card class="rating-card">
        <ion-card-header>
          <ion-card-title>Share Your Experience</ion-card-title>
          <ion-card-subtitle>How would you rate this course?</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content>
          <!-- Star Rating -->
          <div class="stars-container">
            <div class="stars">
              <ion-icon
                v-for="star in 5"
                :key="star"
                :icon="star <= rating ? star : starOutline"
                :color="star <= rating ? 'warning' : 'medium'"
                size="large"
                @click="setRating(star)"
                class="star-icon"
              />
            </div>
            <ion-text color="medium">
              <p class="rating-hint" v-if="rating === 0">Tap to rate</p>
              <p class="rating-hint" v-else>{{ ratingText }}</p>
            </ion-text>
          </div>

          <!-- Feedback Form -->
          <ion-item class="feedback-item" lines="none">
            <ion-textarea
              label="Your feedback (optional)"
              label-placement="floating"
              placeholder="What did you like or think could be improved?"
              v-model="comment"
              :counter="true"
              :disabled="submitting"
            ></ion-textarea>
          </ion-item>

          <!-- Submit Button -->
          <ion-button 
            expand="block" 
            shape="round" 
            :disabled="rating === 0 || submitting" 
            @click="submitRating"
            class="submit-button"
          >
            <ion-spinner v-if="submitting" name="crescent"></ion-spinner>
            <span v-else>Submit Rating</span>
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <ion-toast
      :is-open="showToast"
      :message="toastMessage"
      :duration="2000"
      @didDismiss="showToast = false"
      position="top"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { StatusBar, Style } from "@capacitor/status-bar";
import axios from 'axios';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonTextarea, IonBackButton, IonButton, IonIcon, IonSpinner, 
  IonToast, IonText, IonItem, IonButtons
} from '@ionic/vue';
import { star, starOutline } from 'ionicons/icons';

const token = localStorage.getItem("parisklegg_token") || "";
const route = useRoute();
const courseId = route.params.id || 1;

// Mock data - replace with API call
const courseName = ref("Advanced Mathematics");
const instructorName = ref("Dr. Sarah Johnson");

const rating = ref(0);
const comment = ref('');
const submitting = ref(false);
const toastMessage = ref('');
const showToast = ref(false);

const ratingTexts = [
  "Poor",
  "Fair",
  "Good",
  "Very Good",
  "Excellent"
];

const ratingText = computed(() => ratingTexts[rating.value - 1]);

const setRating = (value: number) => {
  rating.value = value;
};

const submitRating = async () => {
  try {
    submitting.value = true;
    
    await axios.post(
      `https://school.klgilc.com/api/courses/${courseId}/ratings`,
      {
        rating: rating.value,
        comment: comment.value
      },
      {
        headers: getAuthHeaders(),
        timeout: 20000,
      }
    );

    toastMessage.value = 'Thank you for your feedback!';
    showToast.value = true;
    resetForm();
    
  } catch (error) {
    toastMessage.value = 'Failed to submit rating. Please try again.';
    showToast.value = true;
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  rating.value = 0;
  comment.value = '';
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

onMounted(() => {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setBackgroundColor({ color: "#ffffff" });
  StatusBar.setStyle({ style: Style.Light });
});
</script>

<style scoped>
.course-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 0 16px;
}

.course-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 8px 0;
}

.course-code {
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.instructor {
  font-size: 1rem;
  margin-top: 4px;
}

.rating-card {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin: 0;
}

.stars-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
}

.stars {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.star-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.star-icon:hover {
  transform: scale(1.2);
}

.rating-hint {
  text-align: center;
  font-size: 0.9rem;
  margin: 0;
}

.feedback-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin: 24px 0;
}

.submit-button {
  margin-top: 16px;
  --border-radius: 12px;
  height: 48px;
  font-weight: 600;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .stars {
    gap: 8px;
  }
  
  .star-icon {
    font-size: 32px;
  }
  
  .course-title {
    font-size: 1.3rem;
  }
}
</style>