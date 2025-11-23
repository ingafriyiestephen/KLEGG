<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Settings</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent class="ion-padding">
      <!-- User Profile Section -->
      <div class="profile-section">
        <img
          :src="user.image || defaultAvatar"
          class="profile-img"
          alt="Profile Picture"
        />
        <div class="profile-info">
          <h2>{{ user.name || "User Name" }}</h2>
          <p v-if="user.phone">{{ user.phone || "Phone" }}</p>
          <p>{{ user.email || "Email" }}</p>
        </div>
      </div>


      <IonList lines="none" class="settings-list">
        <!-- <IonListHeader>
          <IonLabel>General</IonLabel>  
        </IonListHeader> -->

        <IonItem
          button
          @click="
            navigateToExternal('https://legal.klgilc.com/privacy-policy.html')
          "
        >
          <IonIcon slot="start" :icon="lockClosedOutline" color="medium" />
          <IonLabel>Privacy Policy</IonLabel>
        </IonItem>

        <IonItem
          button
          @click="
            navigateToExternal('https://legal.klgilc.com/terms-of-service.html')
          "
        >
          <IonIcon slot="start" :icon="readerOutline" color="medium" />
          <IonLabel>Terms of Service</IonLabel>
        </IonItem>

        <IonItem
          button
          @click="navigateToExternal('https://wa.me/+233208345390')"
        >
          <IonIcon slot="start" :icon="chatbubbleOutline" color="medium" />
          <IonLabel>Contact Support</IonLabel>
        </IonItem>

        <IonItem
          button
          @click="
            navigateToExternal('https://legal.klgilc.com/account-deletion.html')
          "
        >
          <IonIcon slot="start" :icon="personRemoveOutline" color="medium" />
          <IonLabel>Delete Account</IonLabel>
        </IonItem>

        <IonItem button @click="shareApp">
          <IonIcon slot="start" :icon="shareOutline" color="medium" />
          <IonLabel>Share App</IonLabel>
        </IonItem>

        <IonItem button id="about-alert">
          <IonIcon slot="start" :icon="informationCircleOutline" color="medium" />
          <IonLabel>About</IonLabel>
        </IonItem>

        <IonAlert
          trigger="about-alert"
          header="Klegg"
          sub-header="Version 1.0.9"
          message="Ⓒ 2025 - Klegg Institute of Language and Communication."
          :buttons="closeAlert"
        ></IonAlert>
      </IonList>

      <div class="logout-section">
        <IonButton 
          fill="clear" 
          color="medium" 
          @click="logOut"
          class="logout-button"
        >
          <IonIcon slot="start" :icon="logOutOutline" />
          Sign Out
        </IonButton>
      </div>

      <IonLoading :is-open="loading" message="Please wait..."></IonLoading>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { Share } from "@capacitor/share";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonAlert,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonLoading,
} from "@ionic/vue";
import { updateStatusBar } from '@/utils/statusBar';
import { Toast } from "@capacitor/toast";
import {
  lockClosedOutline,
  chatbubbleOutline,
  readerOutline,
  personRemoveOutline,
  shareOutline,
  informationCircleOutline,
  logOutOutline,
  moonOutline,
  moon,
  colorPaletteOutline
} from "ionicons/icons";

const router = useRouter();
const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp";
const user = ref<{
  name: string;
  id: number;
  otp: number;
  phone: string;
  image?: string;
  email?: string;
}>({ name: "", id: 0, otp: 0, phone: "" });
const closeAlert = ["Close"];
const loading = ref(false);
const token = localStorage.getItem("parisklegg_token") || "";
let global_user_id: number | null = null;


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

onMounted(async () => {
  initThemeDetection();
  const userData = localStorage.getItem("parisklegg_user");
  if (userData) {
    const parsedUserData = JSON.parse(userData);
    if (parsedUserData) {
      user.value.name = parsedUserData.fullname;
      user.value.id = parsedUserData.user_id;
      user.value.email = parsedUserData.username;
      user.value.image = parsedUserData.profile_photo_path || defaultAvatar;
      global_user_id = parsedUserData.user_id;
    }
  }

});


const shareApp = async () => {
  await Share.share({
    title: "Klegg",
    text: "Access the Klegg app on the web.",
    url: "https://klegg.vercel.app",
    dialogTitle:
      "Available to learners at the Klegg Institute of Language and Communication",
  });
};


// const shareApp = async () => {
//   await Share.share({
//     title: "Download Klegg.",
//     text: "Get the Klegg app on the Google Play Store.",
//     url: "https://play.google.com/store/apps/details?id=com.webmucho.klegg",
//     dialogTitle:
//       "Available to learners at the Klegg Institute of Language and Communication",
//   });
// };


// const shareApp = async () => {
//   await Share.share({
//     title: "Download Klegg.",
//     text: "Get the Klegg app on the App Store.",
//     url: "https://apps.apple.com/gh/app/klegg/id6753220908",
//     dialogTitle:
//       "Available to learners at the Klegg Institute of Language and Communication",
//   });
// };

const navigateToExternal = (url: string) => {
  window.location.href = url;
};

const logOut = async () => {
  loading.value = true;
  try {
    const response = await axios.post(
      `https://klegg-app-whh7m.ondigitalocean.app/api/logout`,
      {
        user_id: global_user_id,
        bearer_token: token,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = response.data;
    console.log(data.data);
    if (data.success === true) {
      console.log("User logged out");
      localStorage.removeItem("parisklegg_user");
      localStorage.removeItem("parisklegg_token");
      router.replace("/");
    }
  } catch (error) {
    handleFetchError(error);
  } finally {
    loading.value = false;
  }
};

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


</script>

<style scoped>
/* Profile Section */
.profile-section {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--ion-card-background, var(--ion-item-background));
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--ion-border-color, rgba(0, 0, 0, 0.08));
  transition: all 0.3s ease;
}

.profile-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-right: 16px;
  object-fit: cover;
  border: 2px solid var(--ion-color-light-shade);
  transition: border-color 0.3s ease;
}

.profile-info h2 {
  font-size: 1.1rem;
  margin: 0 0 4px 0;
  font-weight: 600;
  color: var(--ion-text-color);
  transition: color 0.3s ease;
}

.profile-info p {
  color: var(--ion-color-medium);
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.settings-list {
  background: transparent;
  margin-bottom: 24px;
}

.settings-list ion-item {
  --padding-start: 12px;
  --padding-end: 12px;
  --min-height: 56px;
  --border-color: var(--ion-border-color);
  --background: var(--ion-item-background);
  --background-hover: var(--ion-color-step-50);
  --background-activated: var(--ion-color-step-100);
  transition: all 0.3s ease;
}

.settings-list ion-item:hover {
  --background: var(--ion-color-step-50);
}

.logout-section {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  padding: 16px 0;
}

.logout-button {
  --padding-start: 20px;
  --padding-end: 20px;
  --background-activated: var(--ion-color-danger-tint);
  font-weight: 500;
  border: 1px solid var(--ion-border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.logout-button:hover {
  --background: var(--ion-color-danger-tint);
  border-color: var(--ion-color-danger);
}

.theme-select {
  min-width: 120px;
}

/* Dark mode support using Ionic's CSS variables */
@media (prefers-color-scheme: dark) {
  .profile-section {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-color: var(--ion-color-step-300, #333);
  }

  .profile-img {
    border-color: var(--ion-color-step-400, #444);
  }
}

/* Alternative: If you want to manually handle dark mode with a class */
:global(ion-content.dark) .profile-section {
  background: var(--ion-color-step-50, #1a1a1a);
  border-color: var(--ion-color-step-200, #333);
}

:global(ion-content.dark) .profile-info h2 {
  color: var(--ion-text-color, #ffffff);
}

:global(ion-content.dark) .profile-info p {
  color: var(--ion-color-step-600, #888);
}

/* Ensure smooth transitions */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

/* 🎯 iOS-only dark mode fix for Quick Actions text touching edges */
@supports (-webkit-touch-callout: none) {
  .dark .quick-action-button {
    --padding-top: 14px;
    --padding-bottom: 14px;
    --padding-start: 6px;
    --padding-end: 6px;
    border: 1px solid var(--ion-color-step-250);
  }

  .dark .quick-action-button ion-label {
    padding: 0 4px;
    margin-top: 6px;
  }
}


</style>