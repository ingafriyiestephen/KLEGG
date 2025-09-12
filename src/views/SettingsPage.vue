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

      <IonList lines="full" class="settings-list">
        <IonList-header>
          <ion-label>Appearance</ion-label>
        </IonList-header>
        
        <ion-item lines="none">
          <IonIcon slot="start" :icon="moonOutline" color="medium" />
          <IonLabel>Dark Mode</IonLabel>
          <ion-toggle
            slot="end"
            v-model="darkMode"
            @ionChange="toggleDarkTheme($event.detail.checked)"
          ></ion-toggle>
        </ion-item>

      </IonList>


      <IonList lines="full" class="settings-list">
        <IonList-header>
          <ion-label>General</ion-label>  
        </IonList-header>

        <IonItem
          button
          :detail="true"
          @click="
            navigateToExternal('https://legal.klgilc.com/privacy-policy.html')
          "
        >
          <IonIcon slot="start" :icon="lockClosedOutline" color="medium" />
          <IonLabel>Privacy Policy</IonLabel>
        </IonItem>

        <IonItem
          button
          :detail="true"
          @click="
            navigateToExternal('https://legal.klgilc.com/terms-of-service.html')
          "
        >
          <IonIcon slot="start" :icon="readerOutline" color="medium" />
          <IonLabel>Terms of Service</IonLabel>
        </IonItem>

        <IonItem
          button
          :detail="true"
          @click="navigateToExternal('https://wa.me/+233208345390')"
        >
          <IonIcon slot="start" :icon="chatbubbleOutline" color="medium" />
          <IonLabel>Contact Support</IonLabel>
        </IonItem>

        <IonItem
          button
          :detail="true"
          @click="
            navigateToExternal('https://legal.klgilc.com/account-deletion.html')
          "
        >
          <IonIcon slot="start" :icon="personRemoveOutline" color="medium" />
          <IonLabel>Delete Account</IonLabel>
        </IonItem>

        <IonItem button :detail="true" @click="shareApp">
          <IonIcon slot="start" :icon="shareOutline" color="medium" />
          <IonLabel>Share App</IonLabel>
        </IonItem>

        <IonItem button id="about-alert" :detail="true">
          <IonIcon slot="start" :icon="informationCircleOutline" color="medium" />
          <IonLabel>About</IonLabel>
        </IonItem>

        <ion-alert
          trigger="about-alert"
          header="Klegg"
          sub-header="Version 1.0.7"
          message="Ⓒ 2025 - Klegg Institute of Language and Communication."
          :buttons="closeAlert"
        ></ion-alert>
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
import { ref, onMounted } from "vue";
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
  IonToggle,
  IonListHeader
} from "@ionic/vue";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Toast } from "@capacitor/toast";
import {
  lockClosedOutline,
  chatbubbleOutline,
  readerOutline,
  personRemoveOutline,
  shareOutline,
  informationCircleOutline,
  logOutOutline,
  moonOutline
} from "ionicons/icons";
import { refreshOutline } from 'ionicons/icons';

const router = useRouter();
const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp"; // Default profile pic
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



const darkMode = ref(false)

const toggleDarkTheme = (shouldEnable:any) => {
  document.body.classList.toggle('dark', shouldEnable)
  localStorage.setItem('darkMode', shouldEnable)
}

onMounted(async () => {
  // Load saved preference
  const saved = localStorage.getItem('darkMode')
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
    console.log("User data:", parsedUserData.user_id);
  }


  if (saved !== null) {
    darkMode.value = saved === 'true'
    document.body.classList.toggle('dark', darkMode.value)
  } else {
    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
    darkMode.value = prefersDark.matches
    document.body.classList.toggle('dark', darkMode.value)

    prefersDark.addEventListener('change', (mediaQuery) => {
      darkMode.value = mediaQuery.matches
      document.body.classList.toggle('dark', darkMode.value)
    })
  }



});

StatusBar.setOverlaysWebView({ overlay: false });
StatusBar.setBackgroundColor({ color: "#ffffff" });
StatusBar.setStyle({ style: Style.Light });

const shareApp = async () => {
  await Share.share({
    title: "Download Klegg.",
    text: "Get the Klegg app on the Google Play Store.",
    url: "https://play.google.com/store/apps/details?id=com.webmucho.klegg",
    dialogTitle:
      "Available to learners at the Klegg Institute of Language and Communication",
  });
};

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
  background: #fff;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.profile-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-right: 16px;
  object-fit: cover;
  border: 2px solid #f4f4f4;
}

.profile-info h2 {
  font-size: 1.1rem;
  margin: 0 0 4px 0;
  font-weight: 600;
  color: #333;
}

.profile-info p {
  color: #666;
  margin: 0 0 4px 0;
  font-size: 0.9rem;
}

.settings-list {
  background: transparent;
  margin-bottom: 24px;
}

.settings-list ion-item {
  --padding-start: 12px;
  --padding-end: 12px;
  --min-height: 56px;
  --border-color: rgba(0, 0, 0, 0.08);
}

.logout-section {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.logout-button {
  --padding-start: 12px;
  --padding-end: 12px;
  --background-activated: rgba(244, 67, 54, 0.1);
  font-weight: 500;
}

.logout-button:hover {
  color: var(--ion-color-danger);
}
</style>