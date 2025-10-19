<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
        </ion-buttons>
        <ion-title> Notification </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Loading State -->
      <div class="loading-container" v-if="loading">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <!-- Error State -->
      <div class="error-state" v-else-if="error">
        <ion-icon :icon="warningOutline" color="danger" size="large"></ion-icon>
        <ion-text>
          <h3>Error Loading Notification</h3>
          <p>Please try again later</p>
        </ion-text>
        <ion-button fill="clear" @click="loadNotification">Retry</ion-button>
      </div>

      <!-- Notification Content -->
      <div v-else-if="notification">
        <ion-card class="notification-card">
          <ion-card-header>
            <ion-card-title class="notification-title">{{ notification.title }}</ion-card-title>
            <ion-card-subtitle>
              {{ formatDate(notification.created_at) }}
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <p class="notification-body">{{ notification.body }}</p>

            <!-- Reactions -->
            <div class="reactions-container">
              <ion-button
                v-for="(count, type) in notification.reaction_counts"
                :key="type"
                fill="clear"
                size="small"
                @click="toggleReaction(type)"
                :color="userReaction === type ? 'primary' : 'medium'"
                :disabled="isReacting"
              >
                <ion-spinner
                  v-if="isReacting && userReaction === type"
                  name="dots"
                  slot="start"
                ></ion-spinner>
                <ion-icon
                  v-else
                  :icon="getReactionIcon(type)"
                  slot="start"
                ></ion-icon>
                {{ count }}
              </ion-button>

              <ion-button
                fill="clear"
                size="small"
                @click="showReactionPicker = true"
                :disabled="isReacting"
              >
                <ion-icon :icon="addOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Comments Section -->
        <div class="comments-section">
          <ion-list>
            <ion-list-header>
              <ion-label
                >Comments ({{ notification.comments_count }})</ion-label
              >
            </ion-list-header>

            <ion-item
              v-for="comment in comments"
              :key="comment.id"
              class="comment-item"
            >
              <ion-avatar slot="start" style="margin-left: 20px">
                <img
                  :src="comment.avatar || '/assets/img/default-avatar.svg'"
                />
              </ion-avatar>

              <ion-label>
                <h3>{{ comment.user_name }}</h3>
                <p>{{ comment.comment_body }}</p>
                <p class="comment-date">{{ formatDate(comment.created_at) }}</p>
              </ion-label>

              <!-- Voting buttons -->
              <div slot="end" class="vote-buttons">
                <ion-button
                  fill="clear"
                  size="small"
                  @click="voteComment(comment.id, 'upvote')"
                  :disabled="isVoting"
                >
                  <ion-icon
                    :icon="thumbsUpOutline"
                    :color="
                      comment.user_vote === 'upvote' ? 'primary' : 'medium'
                    "
                  ></ion-icon>
                  <span class="vote-count">{{ comment.upvotes_count }}</span>
                </ion-button>

                <ion-button
                  fill="clear"
                  size="small"
                  @click="voteComment(comment.id, 'downvote')"
                  :disabled="isVoting"
                >
                  <ion-icon
                    :icon="thumbsDownOutline"
                    :color="
                      comment.user_vote === 'downvote' ? 'danger' : 'medium'
                    "
                  ></ion-icon>
                  <span class="vote-count">{{ comment.downvotes_count }}</span>
                </ion-button>
              </div>
              <ion-button
                v-if="comment.user_id === currentUserId"
                fill="clear"
                color="danger"
                @click="deleteComment(comment.id)"
                :disabled="deletingCommentId === comment.id"
              >
                <ion-spinner
                  v-if="deletingCommentId === comment.id"
                  name="dots"
                  slot="icon-only"
                ></ion-spinner>
                <ion-icon
                  v-else
                  :icon="trashOutline"
                  slot="icon-only"
                ></ion-icon>
              </ion-button>
            </ion-item>

            <ion-infinite-scroll
              @ionInfinite="loadMoreComments"
              threshold="100px"
              :disabled="!hasMoreComments"
            >
              <ion-infinite-scroll-content
                loading-spinner="bubbles"
                loading-text="Loading more comments..."
              ></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          </ion-list>
        </div>

        <!-- Comment Input -->
        <div class="comment-input-container">
          <ion-item>
            <ion-textarea
              v-model="newComment"
              placeholder="Add a comment..."
              auto-grow
            ></ion-textarea>
            <ion-button
              slot="end"
              fill="clear"
              :disabled="!newComment.trim()"
              @click="addComment"
            >
              <ion-spinner
                v-if="isSubmitting"
                slot="start"
                name="dots"
              ></ion-spinner>
              <ion-icon :icon="sendOutline" color="primary"></ion-icon>
            </ion-button>
          </ion-item>
        </div>
      </div>

      <!-- Reaction Picker Popover -->
      <ion-popover
        :is-open="showReactionPicker"
        @didDismiss="showReactionPicker = false"
      >
        <ion-content>
          <ion-grid>
            <ion-row>
              <ion-col
                v-for="type in availableReactions"
                :key="type"
                size="auto"
                @click="addReaction(type)"
              >
                <ion-button fill="clear">
                  <ion-icon
                    :icon="getReactionIcon(type)"
                    size="large"
                  ></ion-icon>
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </ion-popover>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { Toast } from "@capacitor/toast";
import { updateStatusBar } from '@/utils/statusBar';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonBackButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonTextarea,
  IonSpinner,
  IonText,
  IonListHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPopover,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/vue";
import {
  warningOutline,
  heartOutline,
  thumbsUpOutline,
  thumbsDownOutline,
  happyOutline,
  sendOutline,
  addOutline,
  trashOutline,
} from "ionicons/icons";

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user"); // or whatever your key is
const userData = userDataString ? JSON.parse(userDataString) : null;
let global_user_id: number | null = null;

const user = ref<{
  name: string;
  id: number;
  otp: number;
  phone: string;
  image?: string;
  email?: string;
}>({ name: "", id: 0, otp: 0, phone: "" });

interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: number;
  created_at: string;
  reaction_counts: Record<string, number>;
  comments_count: number;
  user_reaction: { reaction_type: string } | null;
}

interface Comment {
  id: number;
  comment_body: string;
  created_at: string;
  user_id: number;
  user_name: string;
  avatar: string | null;
  upvotes_count: number;
  downvotes_count: number;
  user_vote: "upvote" | "downvote" | null;
}

const route = useRoute();
const router = useRouter();
const notificationId = Number(route.params.id);
const loading = ref(true);
const error = ref(false);
const isSubmitting = ref(false);
const isReacting = ref(false);
const isVoting = ref(false);
const notification = ref<Notification | null>(null);
const comments = ref<Comment[]>([]);
const currentPage = ref(1);
const hasMoreComments = ref(true);
const newComment = ref("");
const deletingCommentId = ref<number | null>(null);
const showReactionPicker = ref(false);
const reactionId = ref<number | null>(null);
const currentUserId = ref(0); // You would set this from your auth system

const availableReactions = ["like", "heart", "thumbs-up"];

const userReaction = computed(() => {
  return notification.value?.user_reaction?.reaction_type || null;
});

const getReactionIcon = (type: string) => {
  const icons: Record<string, string> = {
    like: happyOutline,
    heart: heartOutline,
    "thumbs-up": thumbsUpOutline,
  };
  return icons[type] || happyOutline;
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "Just now"; // Fallback if date is missing

  // Remove microseconds and 'Z' if present
  const normalized = dateString.replace(/\.\d{6}Z$/, "");

  // Parse the date
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  // Format as "MMM DD, HH:mm" (e.g., "Aug 24, 18:37")
  const month = date.toLocaleString("en-US", { month: "short" }); // "Aug"
  const day = date.getDate(); // 24
  const hours = String(date.getHours()).padStart(2, "0"); // "18"
  const minutes = String(date.getMinutes()).padStart(2, "0"); // "37"

  return `${month} ${day}, ${hours}:${minutes}`;
};

const loadNotification = async () => {
  try {
    loading.value = true;
    error.value = false;

    const response = await axios.get(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}`,
      {
        headers: getAuthHeaders(),
        timeout: 20000, // 20-second timeout
      },
    );
    notification.value = response.data;

    console.log("Notification loaded:", response.data);

    // Mark as read
    if (response.data.is_read === 0) {
      await axios.post(
        `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/read`,
        {},
        {
          headers: getAuthHeaders(),
          timeout: 10000, // 10-second timeout
        },
      );
    }

    // Load initial comments
    await loadComments();
  } catch (err) {
    console.error("Error loading notification:", err);
    handleFetchError(err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const loadComments = async (page = 1) => {
  try {
    const response = await axios.get(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/comments`,
      {
        params: { page },
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
      },
    );

    if (page === 1) {
      comments.value = response.data.data;
    } else {
      comments.value = [...comments.value, ...response.data.data];
    }

    currentPage.value = page;
    hasMoreComments.value = !!response.data.next_page_url;
  } catch (err) {
    console.error("Error loading comments:", err);
  }
};

const loadMoreComments = async (ev: CustomEvent) => {
  await loadComments(currentPage.value + 1);
  (ev.target as HTMLIonInfiniteScrollElement).complete();
};

const addComment = async () => {
  if (!newComment.value.trim()) return;
  isSubmitting.value = true;

  try {
    const response = await axios.post(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/create_comment`,
      { comment_body: newComment.value },
      {
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
      },
    );

    // Ensure we're using the correct response structure
    const newCommentData: Comment = {
      id: response.data.comment.id,
      comment_body: response.data.comment.comment_body,
      created_at: response.data.comment.created_at, // Make sure this exists
      user_id: response.data.comment.user_id,
      user_name: response.data.comment.user_name,
      avatar: response.data.comment.avatar || null,
      upvotes_count: 0,
      downvotes_count: 0,
      user_vote: null,
    };

    comments.value.unshift(newCommentData);
    newComment.value = "";

    if (notification.value) {
      notification.value.comments_count += 1;
    }
  } catch (err) {
    console.error("Error adding comment:", err);
  } finally {
    isSubmitting.value = false;
  }
};

const deleteComment = async (commentId: number) => {
  deletingCommentId.value = commentId;
  try {
    await axios.delete(`https://klegg-app-whh7m.ondigitalocean.app/api/comments/${commentId}`, {
      headers: getAuthHeaders(),
      timeout: 10000, // 10-second timeout
    });

    comments.value = comments.value.filter((c) => c.id !== commentId);

    if (notification.value) {
      notification.value.comments_count -= 1;
    }
  } catch (err) {
    console.error("Error deleting comment:", err);
  } finally {
    deletingCommentId.value = null;
  }
};

const toggleReaction = async (type: string) => {
  if (userReaction.value === type) {
    await removeReaction();
  } else {
    await addReaction(type);
  }
};

const voteComment = async (
  commentId: number,
  voteType: "upvote" | "downvote",
) => {
  if (isVoting.value) return;

  isVoting.value = true;
  try {
    const commentIndex = comments.value.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) return;

    const comment = comments.value[commentIndex];
    const previousVote = comment.user_vote;

    // Optimistic UI update
    if (previousVote === voteType) {
      // User is removing their vote
      comment.user_vote = null;
      if (voteType === "upvote") comment.upvotes_count--;
      if (voteType === "downvote") comment.downvotes_count--;
    } else {
      // User is changing their vote
      if (previousVote === "upvote") comment.upvotes_count--;
      if (previousVote === "downvote") comment.downvotes_count--;

      comment.user_vote = voteType;
      if (voteType === "upvote") comment.upvotes_count++;
      if (voteType === "downvote") comment.downvotes_count++;
    }

    // API call
    const response = await axios.post(
      `https://klegg-app-whh7m.ondigitalocean.app/api/comments/${commentId}/vote`,
      { vote_type: voteType },
      {
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
      },
    );

    // Update with actual data from server
    comments.value[commentIndex] = {
      ...comments.value[commentIndex],
      upvotes_count: response.data.upvotes_count,
      downvotes_count: response.data.downvotes_count,
      user_vote: response.data.user_vote,
    };
  } catch (err) {
    console.error("Error voting on comment:", err);
    // Revert optimistic update on error
    loadComments(currentPage.value);
  } finally {
    isVoting.value = false;
  }
};

const addReaction = async (type: string) => {
  isReacting.value = true;
  showReactionPicker.value = false;
  try {
    const response = await axios.post(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/reactions`,
      {
        reaction_type: type,
      },
      {
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
      },
    );

    if (notification.value) {
      notification.value.reaction_counts = response.data.reaction_counts;
      notification.value.user_reaction = { reaction_type: type };
      reactionId.value = response.data.reaction_id;
      console.log("Reaction added:", reactionId.value);
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
  } finally {
    isReacting.value = false;
  }
};

const removeReaction = async () => {
  isReacting.value = true;
  try {
    const response = await axios.delete(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/delete_reaction`,
      {
        headers: getAuthHeaders(),
        timeout: 10000, // 10-second timeout
      },
    );

    if (notification.value) {
      notification.value.reaction_counts = response.data.reaction_counts;
      reactionId.value = 0;
      notification.value.user_reaction = null;
    }
  } catch (err) {
    console.error("Error removing reaction:", err);
  } finally {
    isReacting.value = false;
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
  loadNotification();

  const userData = localStorage.getItem("parisklegg_user");
  if (userData) {
    const parsedUserData = JSON.parse(userData);
    if (parsedUserData) {
      user.value.name = parsedUserData.fullname;
      user.value.id = parsedUserData.user_id;
      user.value.email = parsedUserData.username;
      global_user_id = parsedUserData.user_id;
    }
  }

  // Set current user ID from your auth system
  currentUserId.value = global_user_id
    ? Number(global_user_id)
    : 0;


});

onIonViewWillEnter(async () => {
  initThemeDetection();
});


</script>

<style scoped>
/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  margin: 20px 0;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: 20px;
}

.error-state ion-icon {
  margin-bottom: 16px;
  color: var(--ion-color-medium);
}

.error-state h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-text-color);
}

.error-state p {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

/* Notification Card */
.notification-card {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  border-bottom: 1px solid var(--ion-border-color);
  background: var(--ion-card-background);
}

.notification-title {
  color: var(--ion-text-color);
  white-space: pre-line;
}

.notification-body {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ion-text-color);
  white-space: pre-line;
}

/* Reactions */
.reactions-container {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-border-color);
}

.reaction-button {
  --color: var(--ion-color-medium);
  --background: var(--ion-item-background);
  --background-hover: var(--ion-color-light-shade);
  --background-activated: var(--ion-color-light-tint);
}

/* Comments Section */
.comments-section {
  margin-top: 16px;
  background: var(--ion-background-color);
}

.comment-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: var(--ion-item-background);
  border-bottom: 1px solid var(--ion-border-color);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-item ion-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
}

.comment-item h3 {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ion-text-color);
}

.comment-item p {
  font-size: 0.9rem;
  color: var(--ion-text-color);
  margin: 4px 0;
  opacity: 0.9;
}

.comment-date {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
}

/* Comment Input */
.comment-input-container {
  position: sticky;
  bottom: 0;
  background: var(--ion-background-color);
  padding: 8px;
  border-top: 1px solid var(--ion-border-color);
}

.comment-input-container ion-textarea {
  background: var(--ion-color-step-100);
  border-radius: 20px;
  --padding-start: 12px;
  --padding-end: 12px;
  font-size: 0.9rem;
  --color: var(--ion-text-color);
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 0.6;
}

/* Reaction Picker */
ion-popover {
  --background: var(--ion-card-background);
  --color: var(--ion-text-color);
}

ion-popover ion-content {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --background: var(--ion-card-background);
}

.reaction-picker-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.reaction-picker-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --background: var(--ion-item-background);
  --color: var(--ion-text-color);
  --border-radius: 16px;
  font-size: 1.2rem;
}

/* Vote Buttons */
.vote-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 8px;
  background: var(--ion-item-background);
  border-radius: 20px;
  padding: 4px;
}

.vote-button {
  --color: var(--ion-color-medium);
  --background: transparent;
  --background-hover: var(--ion-color-light-shade);
  --background-activated: var(--ion-color-light-tint);
}

.vote-button.active {
  --color: var(--ion-color-primary);
}

.vote-count {
  font-size: 0.8em;
  margin: 4px 0;
  color: var(--ion-text-color);
  font-weight: 500;
}

/* Ensure spinner and icons have consistent sizing */
ion-icon {
  width: 16px;
  height: 16px;
  color: var(--ion-color-medium);
}

/* Status indicators */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ion-color-success);
  margin-right: 8px;
}

.status-indicator.offline {
  background: var(--ion-color-medium);
}

/* Badge styling */
.notification-badge {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
  font-size: 0.7rem;
  font-weight: 600;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 40vh;
  padding: 20px;
  color: var(--ion-color-medium);
}

.empty-state ion-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .comment-item {
    --padding-start: 8px;
    --padding-end: 8px;
  }
  
  .vote-buttons {
    margin-right: 4px;
    padding: 2px;
  }
}

/* Focus states for accessibility */
.comment-input-container ion-textarea:focus-within {
  background: var(--ion-color-step-200);
  outline: 2px solid var(--ion-color-primary-tint);
}

.reaction-button:focus,
.vote-button:focus {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Animation for new items */
.notification-card.new-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
