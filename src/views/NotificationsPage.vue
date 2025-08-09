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
      "https://school.klgilc.com/api/notifications",
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
}

.loading-container ion-spinner {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
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
}

.error-state ion-icon,
.empty-state ion-icon {
  margin-bottom: 16px;
}

.error-state h3,
.empty-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-color-dark);
}

.error-state p,
.empty-state p {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

/* Notifications List */
.notification-item {
  --padding-start: 12px;
  --padding-end: 12px;
  --inner-padding-end: 12px;
  --border-color: var(--ion-color-light);
}

.notification-item.unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.05);
}

.notification-avatar {
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.notification-item h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 8px;
  line-height: 1.4;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.notification-meta ion-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 6px;
}

.date {
  flex: 1;
}

.reactions-row {
  display: flex;
  gap: 4px;
  margin: 8px 0;
  flex-wrap: wrap;
}


.reactions-row ion-chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  height: 28px;
}

.reactions-row ion-icon {
  margin-right: 4px;
  font-size: 16px;
}

.reactions-row ion-label {
  font-size: 12px;
  margin-left: 0;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.comments-count {
  display: flex;
  align-items: center;
  gap: 2px;
}

.unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.08);
}
</style>
