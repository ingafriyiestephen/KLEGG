<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Notifications</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" @ionScroll="handleScroll($event)">
      <!-- Loading State -->
      <div class="loading-container" v-if="loading && !paginating">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading notifications...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" color="danger" size="large"></ion-icon>
        <ion-text>
          <h3>Error Loading Notifications</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button fill="clear" @click="fetchNotifications">Retry</ion-button>
      </div>

      <!-- Empty State -->
      <div
        class="empty-state"
        v-else-if="notifications.length === 0 && !loading"
      >
        <ion-icon
          :icon="notificationsOffOutline"
          color="medium"
          size="large"
        ></ion-icon>
        <ion-text>
          <h3>No Notifications</h3>
          <p>You don't have any notifications yet</p>
        </ion-text>
      </div>

      <ion-list v-else>
        <ion-item
          v-for="notification in notifications"
          :key="notification.id"
          @click="openNotification(notification.id)"
          class="notification-item"
          :class="{ unread: !notification.is_read }"
        >
          <ion-avatar slot="start" class="notification-avatar">
            <img src="/assets/img/login-logo.png" alt="School Logo" />
          </ion-avatar>

          <ion-label>
            <h2>{{ notification.title }}</h2>
            <p class="preview-text">
              {{ truncateText(notification.body, 60) }}
            </p>

            <!-- Reactions Row -->
            <div class="reactions-row" v-if="notification.reaction_counts && Object.keys(notification.reaction_counts).length">
              <ion-chip 
                v-for="(count, type) in notification.reaction_counts" 
                :key="type"
                color="light"
                class="reaction-chip"
              >
                <ion-icon :icon="getReactionIcon(type)"></ion-icon>
                <ion-label>{{ count }}</ion-label>
              </ion-chip>
            </div>

            <div class="notification-meta">
              <span class="date">{{
                formatDate(notification.created_at)
              }}</span>
              <span class="comments-count" v-if="notification.comments_count">
                <ion-icon :icon="chatbubbleOutline"></ion-icon>
                {{ notification.comments_count }}
              </span>
            </div>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Infinite Scroll Loader -->
      <ion-infinite-scroll
        @ionInfinite="loadMoreNotifications($event)"
        threshold="100px"
        :disabled="!hasMoreNotifications"
      >
        <ion-infinite-scroll-content
          loading-spinner="bubbles"
          loading-text="Loading more notifications..."
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
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
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonSpinner,
  IonButton,
  IonIcon,
  IonText,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from "@ionic/vue";
import {
  warningOutline,
  notificationsOffOutline,
  heartOutline,
  thumbsUpOutline,
  happyOutline,
  chatbubbleOutline,
} from "ionicons/icons";

interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  reaction_counts: Record<string, number>;
  comments_count: number;
  user_reaction: { reaction_type: string } | null;
}

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;

const getReactionIcon = (type: string) => {
  const icons: Record<string, any> = {
    like: happyOutline,
    heart: heartOutline,
    "thumbs-up": thumbsUpOutline,
  };
  return icons[type] || happyOutline;
};

const router = useRouter();
const loading = ref<boolean>(true);
const paginating = ref<boolean>(false);
const error = ref<boolean>(false);
const notifications = ref<Notification[]>([]);
const currentPage = ref<number>(1);
const hasMoreNotifications = ref<boolean>(true);

const fetchNotifications = async (page = 1) => {
  try {
    if (page === 1) {
      loading.value = true;
      notifications.value = [];
    } else {
      paginating.value = true;
    }

    error.value = false;

    if (!token) throw new Error("No authentication token found");

    const response = await axios.get(
      "https://klegg-app-whh7m.ondigitalocean.app/api/notifications",
      {
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
        params: {
          page: page,
        },
      },
    );

    if (page === 1) {
      notifications.value = response.data.data;
    } else {
      notifications.value = [...notifications.value, ...response.data.data];
    }

    currentPage.value = page;
    hasMoreNotifications.value = !!response.data.next_page_url;
    console.log("Notifications fetched successfully:", notifications.value);
  } catch (err: unknown) {
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
    paginating.value = false;
  }
};

const loadMoreNotifications = async (ev: CustomEvent) => {
  await fetchNotifications(currentPage.value + 1);
  (ev.target as HTMLIonInfiniteScrollElement).complete();
};

const handleScroll = (ev: CustomEvent) => {
  const scrollElement = ev.target as HTMLElement | null;

  if (!scrollElement) return; // Early return if scrollElement is null

  const scrollHeight = scrollElement.scrollHeight;
  const scrollPosition = scrollElement.scrollTop + scrollElement.clientHeight;

  // Load more when 80% scrolled
  if (
    scrollPosition > scrollHeight * 0.8 &&
    hasMoreNotifications.value &&
    !paginating.value
  ) {
    fetchNotifications(currentPage.value + 1);
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  } as Intl.DateTimeFormatOptions);
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const openNotification = (notificationId: number) => {
  router.push(`/notifications/${notificationId}`);
};

onIonViewWillEnter(async () => {
  await fetchNotifications();
});

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

  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setBackgroundColor({ color: "#ffffff" });
  StatusBar.setStyle({ style: Style.Light }); // Options: Light, Dark, Default

  // Generic error for all other cases
  Toast.show({
    text: "Failed to load data. Please try again later",
    position: "top",
  });
};

onMounted(() => {
  fetchNotifications();
});
</script>

<style scoped>
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

/* Error & Empty States */
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: 20px;
  background: var(--ion-background-color);
}

.error-state ion-icon,
.empty-state ion-icon {
  margin-bottom: 16px;
  font-size: 64px;
  opacity: 0.8;
}

.error-state ion-icon {
  color: var(--ion-color-danger);
}

.empty-state ion-icon {
  color: var(--ion-color-medium);
}

.error-state h3,
.empty-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-text-color);
}

.error-state p,
.empty-state p {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
  line-height: 1.4;
}

/* Notifications List */
.notification-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 16px;
  --border-color: var(--ion-border-color);
  --background: var(--ion-item-background);
  margin-bottom: 1px;
}

.notification-item.unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.08);
  border-left: 3px solid var(--ion-color-primary);
}

.notification-item:last-child {
  margin-bottom: 0;
}

.notification-avatar {
  width: 48px;
  height: 48px;
  margin-right: 16px;
  border: 2px solid var(--ion-border-color);
  background: var(--ion-color-step-100);
}

.notification-content {
  flex: 1;
}

.notification-item h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--ion-text-color);
  line-height: 1.3;
}

.preview-text {
  font-size: 0.9rem;
  color: var(--ion-text-color);
  margin-bottom: 8px;
  line-height: 1.4;
  opacity: 0.9;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  margin-top: 8px;
}

.notification-meta ion-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 4px 8px;
  --background: var(--ion-color-step-200);
  --color: var(--ion-text-color);
}

.notification-meta ion-badge.primary {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
}

.date {
  flex: 1;
  color: var(--ion-color-medium);
}

/* Reactions Row */
.reactions-row {
  display: flex;
  gap: 6px;
  margin: 12px 0 8px 0;
  flex-wrap: wrap;
}

.reactions-row ion-chip {
  --background: var(--ion-color-step-100);
  --color: var(--ion-text-color);
  height: 28px;
  margin: 0;
  font-size: 0.8rem;
}

.reactions-row ion-chip:active {
  --background: var(--ion-color-step-200);
}

.reactions-row ion-icon {
  margin-right: 4px;
  font-size: 14px;
  color: var(--ion-color-primary);
}

.reactions-row ion-label {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Comments Count */
.comments-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ion-color-medium);
}

.comments-count ion-icon {
  font-size: 16px;
}

/* Action Buttons */
.notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ion-border-color);
}

.action-button {
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 6px;
  font-size: 0.8rem;
  height: 32px;
}

/* Dark mode specific adjustments */
.dark .notification-item.unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.12);
  border-left-color: var(--ion-color-primary);
}

.dark .reactions-row ion-chip {
  --background: var(--ion-color-step-200);
}

.dark .notification-avatar {
  background: var(--ion-color-step-200);
  border-color: var(--ion-color-step-300);
}

/* Focus states for accessibility */
.notification-item:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: -2px;
}

.reactions-row ion-chip:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Hover effects */
@media (hover: hover) {
  .notification-item:hover {
    --background: var(--ion-color-step-50);
  }
  
  .reactions-row ion-chip:hover {
    --background: var(--ion-color-step-150);
  }
}

/* Animation for new notifications */
@keyframes highlightPulse {
  0% {
    background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  }
  50% {
    background-color: rgba(var(--ion-color-primary-rgb), 0.2);
  }
  100% {
    background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  }
}

.notification-item.new-notification {
  animation: highlightPulse 2s ease-in-out;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .notification-item {
    --padding-start: 12px;
    --padding-end: 12px;
    --inner-padding-end: 12px;
  }
  
  .notification-avatar {
    width: 40px;
    height: 40px;
    margin-right: 12px;
  }
  
  .reactions-row {
    gap: 4px;
  }
  
  .reactions-row ion-chip {
    height: 26px;
    font-size: 0.75rem;
  }
  
  .notification-meta {
    gap: 8px;
    flex-wrap: wrap;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .notification-item {
    border-bottom: 2px solid var(--ion-border-color);
  }
  
  .notification-item.unread {
    border-left-width: 4px;
  }
  
  .reactions-row ion-chip {
    border: 1px solid var(--ion-border-color);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .notification-item.new-notification {
    animation: none;
  }
}

/* Safe area insets */
@supports(padding: max(0px)) {
  .notification-item {
    --padding-start: max(16px, env(safe-area-inset-left));
    --padding-end: max(16px, env(safe-area-inset-right));
  }
}

/* Empty state improvements */
.empty-state .action-button {
  margin-top: 16px;
}

.error-state .retry-button {
  margin-top: 16px;
}

/* Loading animation enhancement */
.loading-container {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
