<template>
  <ion-page>
    <ion-content class="ion-padding" :fullscreen="true">
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

const darkMode = ref(false)

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
      "https://klegg-app-whh7m.ondigitalocean.app/api/check_version",
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
      "https://klegg-app-whh7m.ondigitalocean.app/api/login",
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


// Initialize data
onMounted(async () => {
    // Load saved preference
    const saved = localStorage.getItem('darkMode')
  try {
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

    
    await checkVersion();
  
  } catch (error) {
    console.error("Initialization error:", error);
  } finally {
    loading.value = false;
  }
});
</script>


<style scoped>
/* Main container */
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 1rem;
  padding-top: max(2rem, env(safe-area-inset-top));
}

/* Logo section */
.logo-section {
  text-align: center;
  margin-bottom: 2.5rem;
  padding: 0 1rem;
  width: 100%;
  max-width: 400px;
}

.logo-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid var(--ion-color-primary);
  background-color: var(--ion-card-background);
  object-fit: contain;
}

.app-title {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.app-subtitle {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  color: var(--ion-color-medium);
}

/* Login form */
.login-form {
  background: var(--ion-card-background);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--ion-border-color);
}

.dark .login-form {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.form-item {
  --background: var(--ion-color-step-50);
  --border-radius: 12px;
  --padding-start: 1rem;
  --inner-padding-end: 0.5rem;
  margin-bottom: 1.25rem;
  --border-color: var(--ion-border-color);
  --highlight-color-focused: var(--ion-color-primary);
}

.form-item:focus-within {
  --background: var(--ion-color-step-100);
  --border-color: var(--ion-color-primary);
}

.input-icon {
  color: var(--ion-color-primary);
  font-size: 1.2rem;
  margin-right: 0.75rem;
}

.custom-input {
  --padding-top: 1rem;
  --padding-bottom: 1rem;
  --padding-start: 0.5rem;
  --color: var(--ion-text-color);
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 0.6;
  font-size: 1rem;
}

.password-toggle {
  --padding-start: 0;
  --padding-end: 0;
  --color: var(--ion-color-medium);
  --background-hover: var(--ion-color-step-100);
}

.password-toggle:active {
  --color: var(--ion-color-primary);
}

/* Login button */
.login-button {
  --border-radius: 12px;
  --padding-top: 1.25rem;
  --padding-bottom: 1.25rem;
  --box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.2);
  margin-top: 2rem;
  font-weight: 600;
  font-size: 1.1rem;
  height: 56px;
  text-transform: none;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.login-button:active {
  --box-shadow: 0 1px 4px rgba(var(--ion-color-primary-rgb), 0.2);
  transform: translateY(1px);
}

/* Form footer */
.form-footer {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  padding: 1rem;
}

.forgot-password {
  --color: var(--ion-color-medium);
  font-size: 0.9rem;
  text-transform: none;
  font-weight: 500;
  --background-hover: var(--ion-color-step-50);
  --background-activated: var(--ion-color-step-100);
}

.forgot-password:active {
  --color: var(--ion-color-primary);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .login-container {
    padding: 0.5rem;
    padding-top: max(1.5rem, env(safe-area-inset-top));
  }
  
  .login-form {
    padding: 1.5rem;
  }

  .logo-image {
    width: 80px;
    height: 80px;
  }

  .app-title {
    font-size: 1.5rem;
  }

  .login-button {
    height: 52px;
    font-size: 1rem;
  }
}

@media (min-width: 768px) {
  .login-container {
    padding-top: max(3rem, env(safe-area-inset-top));
  }
}

/* Focus states for accessibility */
.form-item:focus-within {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.login-button:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

.forgot-password:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Loading state for button */
.login-button.loading {
  --background: var(--ion-color-step-300);
  pointer-events: none;
}

/* Error state */
.form-item.error {
  --border-color: var(--ion-color-danger);
  --background: rgba(var(--ion-color-danger-rgb), 0.05);
}

.error-message {
  color: var(--ion-color-danger);
  font-size: 0.8rem;
  margin-top: 0.5rem;
  margin-left: 1rem;
}

/* Success state */
.form-item.success {
  --border-color: var(--ion-color-success);
  --background: rgba(var(--ion-color-success-rgb), 0.05);
}

/* Animation for form elements */
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

.login-form {
  animation: slideInUp 0.6s ease-out;
}

.logo-section {
  animation: slideInUp 0.4s ease-out;
}

/* Hover effects */
@media (hover: hover) {
  .login-button:hover {
    --box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
    transform: translateY(-1px);
  }

  .forgot-password:hover {
    --color: var(--ion-color-primary);
  }

  .password-toggle:hover {
    --color: var(--ion-color-primary);
  }
}
</style>