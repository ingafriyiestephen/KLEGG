<template>
  <ion-page>
    <ion-content class="ion-padding" :fullscreen="true">
      <!-- Background Gradient -->
      <div class="login-background"></div>

      <!-- Content Container -->
      <div class="login-container">
        <!-- Logo Section -->
        <div class="logo-section">
          <img
            src="/assets/img/login-logo.png"
            alt="School Logo"
            class="logo-image"
          />
          <h1 class="app-title">Student Portal</h1>
          <p class="app-subtitle">Access your academic information</p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="login-form">
          <ion-list lines="none">
            <!-- Email Input -->
            <ion-item class="form-item">
              <ion-icon
                :icon="personOutline"
                slot="start"
                class="input-icon"
              ></ion-icon>
              <ion-input
                v-model="credentials.email"
                type="email"
                placeholder="Email Address"
                required
                autocapitalize="off"
                autocorrect="off"
                class="custom-input"
              ></ion-input>
            </ion-item>

            <!-- Password Input -->
            <ion-item class="form-item">
              <ion-icon
                :icon="lockClosedOutline"
                slot="start"
                class="input-icon"
              ></ion-icon>
              <ion-input
                v-model="credentials.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                required
                class="custom-input"
              ></ion-input>
              <ion-button
                @click="togglePasswordVisibility"
                fill="clear"
                slot="end"
                class="password-toggle"
              >
                <ion-icon
                  :icon="showPassword ? eyeOffOutline : eyeOutline"
                ></ion-icon>
              </ion-button>
            </ion-item>
          </ion-list>

          <!-- Login Button -->
          <ion-button
            expand="block"
            type="submit"
            class="login-button"
            :disabled="loading"
          >
            <ion-spinner v-if="loading" name="crescent"></ion-spinner>
            <span v-else>Log In</span>
          </ion-button>

          <!-- Forgot Password Link -->
          <!-- <div class="form-footer">
            <ion-button
              fill="clear"
              size="small"
              @click="handleForgotPassword"
              class="forgot-password"
            >
              Forgot Password?
            </ion-button>
          </div> -->
        </form>
      </div>
      <ion-loading v-if="loading" message="Please wait..."> </ion-loading>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonList,
  IonSpinner,
  toastController,
} from "@ionic/vue";
import {
  personOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
} from "ionicons/icons";
import axios from "axios";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useRouter } from "vue-router";
import { ref, reactive, onMounted } from "vue";

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

// Extract values with fallbacks
const userId = userData?.user_id || 0;

const router = useRouter();
const loading = ref(false);
const showPassword = ref(false);

const credentials = reactive({
  email: "",
  password: "",
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const showToast = async (message: string, color: string = "danger") => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    color,
    position: "top",
  });
  await toast.present();
};

const checkVersion = async () => {
  loading.value = true;
  try {
    const response = await axios.get(
      "https://school.klgilc.com/api/check_version",
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );
    const data = response.data;

    if (data.success === true) {
      router.replace("/home");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    loading.value = false;
  }
};

const handleLogin = async () => {
  if (!credentials.email || !credentials.password) {
    showToast("Please enter both email and password");
    return;
  }

  loading.value = true;

  try {
    const response = await axios.post(
      "https://school.klgilc.com/api/login",
      {
        email: credentials.email,
        password: credentials.password,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    const data = response.data;
    if (data.data.role_id !== "3") {
      showToast("Only students can access this portal");
    } else if (data.success === true) {
      // Store user data
      const userData = data.data;
      localStorage.setItem("parisklegg_user", JSON.stringify(userData));
      localStorage.setItem("parisklegg_token", userData.token);
      // Navigate to home
      router.replace("/home");
      showToast("Login successful", "success");
    } else {
      showToast("Invalid login credentials");
    }
  } catch (error: any) {
    console.error("Login error:", error);
    showToast(error.response?.data?.message || error.message || "Login failed");
    //showToast('Login failed. Please try again.');
  } finally {
    loading.value = false;
  }
};

const handleForgotPassword = () => {
  showToast("Forgot password feature coming soon", "warning");
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

StatusBar.setOverlaysWebView({ overlay: false });
StatusBar.setBackgroundColor({ color: "#ffffff" });
StatusBar.setStyle({ style: Style.Light }); // Options: Light, Dark, Default

onMounted(checkVersion);
</script>

<style scoped>
/* Background with gradient */
.login-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40vh;
  background: linear-gradient(
    135deg,
    var(--ion-color-primary),
    var(--ion-color-secondary)
  );
  border-bottom-left-radius: 30% 20%;
  border-bottom-right-radius: 30% 20%;
  z-index: 0;
}

/* Main container */
.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 2rem;
}

/* Logo section */
.logo-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background-color: white;
  object-fit: contain;
}

.app-title {
  color: white;
  margin: 1rem 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 600;
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 0.9rem;
  font-weight: 400;
}

/* Login form */
.login-form {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin: 0 1rem;
}

.form-item {
  --background: #f8f9fa;
  --border-radius: 12px;
  --padding-start: 0.75rem;
  --inner-padding-end: 0.75rem;
  margin-bottom: 1rem;
}

.input-icon {
  color: var(--ion-color-primary);
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.custom-input {
  --padding-top: 0.75rem;
  --padding-bottom: 0.75rem;
  --padding-start: 0.5rem;
}

.password-toggle {
  --padding-start: 0;
  --padding-end: 0;
  --color: var(--ion-color-medium);
}

/* Login button */
.login-button {
  --border-radius: 12px;
  --padding-top: 1rem;
  --padding-bottom: 1rem;
  margin-top: 1.5rem;
  font-weight: 600;
  height: 48px;
}

/* Form footer */
.form-footer {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.forgot-password {
  --color: var(--ion-color-medium);
  font-size: 0.875rem;
  text-transform: none;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .login-container {
    max-width: 450px;
    margin: 0 auto;
    padding-top: 3rem;
  }

  .login-background {
    height: 45vh;
  }
}
</style>
