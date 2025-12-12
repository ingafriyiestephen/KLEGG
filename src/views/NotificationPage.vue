Replace the loading image with a skeleton keep it simple and give me the code ton insert:  <template>
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

            <!-- Single Image Attachment with Skeleton + Click to Open -->
            <div
              v-if="notification.attachment && isImageFile(notification.attachment)"
              class="attachment-container"
            >

              <!-- Skeleton Loader -->
              <div v-if="attachmentLoading" class="image-skeleton"></div>

              <!-- Actual Image -->
              <img
                v-show="!attachmentLoading"
                :src="getFileUrl(notification.attachment)"
                class="attachment-image"
                @load="handleImageLoad"
                @error="handleImageError"
                @click="openImage(notification.attachment)" 
              />
            </div>



            <!-- Non-image Attachment with Loading -->
            <div v-else-if="notification.attachment" class="file-attachment">
              <ion-item 
                button 
                @click="downloadFile(notification.attachment!)"
                :disabled="attachmentLoading"
              >
                <!-- Loading state for file -->
                <div v-if="attachmentLoading" class="file-loading" slot="start">
                  <ion-spinner name="dots" color="primary"></ion-spinner>
                </div>
                <ion-icon v-else :icon="documentOutline" slot="start" color="primary"></ion-icon>
                
                <ion-label>
                  <h3>{{ notification.attachment }}</h3>
                  <p>File Attachment</p>
                </ion-label>
                
                <ion-button 
                  fill="clear" 
                  slot="end" 
                  @click.stop="downloadFile(notification.attachment!)"
                  :disabled="attachmentLoading"
                >
                  <ion-spinner v-if="attachmentLoading" name="dots"></ion-spinner>
                  <ion-icon v-else :icon="downloadOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </div>

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
              <ion-label>Comments ({{ notification.comments_count }})</ion-label>
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

      <!-- Image Viewer Modal -->
      <ion-modal 
        :is-open="!!selectedImage" 
        @didDismiss="selectedImage = null"
        class="image-modal"
      >
        <ion-content>
          <div class="modal-content" v-if="selectedImage">
            <!-- Loading indicator for modal image -->
            <div v-if="modalImageLoading" class="modal-loading">
              <ion-spinner name="crescent" color="light"></ion-spinner>
              <p>Loading image...</p>
            </div>
            
            <img 
              v-show="!modalImageLoading"
              :src="getFileUrl(selectedImage)" 
              :alt="selectedImage"
              class="modal-image"
              @load="handleModalImageLoad"
              @error="handleModalImageError"
            />
            <ion-button 
              fill="clear" 
              color="light" 
              class="close-btn"
              @click="selectedImage = null"
            >
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
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
  IonModal,
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
  closeOutline,
  documentOutline,
  downloadOutline,
} from "ionicons/icons";

const token = localStorage.getItem("parisklegg_token") || "";

// Get the stored user data
const userDataString = localStorage.getItem("parisklegg_user");
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
  attachment: string | null;
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
const currentUserId = ref(0);
const selectedImage = ref<string | null>(null);

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
  if (!dateString) return "Just now";

  const normalized = dateString.replace(/\.\d{6}Z$/, "");
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month} ${day}, ${hours}:${minutes}`;
};


// Add new reactive variables for attachment loading
const attachmentLoading = ref(false);
const modalImageLoading = ref(false);

// File handling methods with loading states
const handleImageLoad = () => {
  attachmentLoading.value = false;
};

const handleModalImageLoad = () => {
  modalImageLoading.value = false;
};

const handleModalImageError = (event: Event) => {
  modalImageLoading.value = false;
  const img = event.target as HTMLImageElement;
  img.style.opacity = '0.5';
  img.alt = 'Failed to load image';
};




// File handling methods
const getFileUrl = (filename: string) => {
  return `https://storage.draugustinaosabutey.com/api/files/${filename}/view`;
};

const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// Update viewFile method to show loading for images
const openImage = (filename: string) => {
  selectedImage.value = filename;
  modalImageLoading.value = true;
};


// Update the existing handleImageError method
const handleImageError = (event: Event) => {
  attachmentLoading.value = false;
  const img = event.target as HTMLImageElement;
  img.style.opacity = '0.5';
  img.alt = 'Failed to load image';
};


const downloadFile = async (filename: string, action: 'view' | 'download' = 'view') => {
  try {
    const loadingToast = await Toast.show({
      text: action === 'view' ? 'Opening file...' : 'Opening file for download...',
      position: 'top'
    });

    // For both view and download, just open the file in a new tab
    // Let the browser handle whether to show or download based on file type
    const fileUrl = `https://storage.draugustinaosabutey.com/api/files/${filename}/view`;
    window.open(fileUrl, '_blank');

    await Toast.show({
      text: 'File opened successfully',
      position: 'top',
      duration: 'short'
    });

  } catch (error) {
    console.error('File access error:', error);
    await Toast.show({
      text: `Failed to open file. Please try again.`,
      position: 'top',
      duration: 'long'
    });
  }
};

// Update loadNotification to reset attachment loading state
const loadNotification = async () => {
  try {
    loading.value = true;
    error.value = false;
    attachmentLoading.value = false; // Reset attachment loading

    const response = await axios.get(
      `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}`,
      {
        headers: getAuthHeaders(),
        timeout: 20000,
      },
    );
    notification.value = response.data;

    console.log("Notification loaded:", response.data);

    // If there's an image attachment, set loading state
    if (notification.value?.attachment && isImageFile(notification.value.attachment)) {
      attachmentLoading.value = true;
    }

    // Mark as read
    if (response.data.is_read === 0) {
      await axios.post(
        `https://klegg-app-whh7m.ondigitalocean.app/api/notifications/${notificationId}/read`,
        {},
        {
          headers: getAuthHeaders(),
          timeout: 10000,
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
        timeout: 10000,
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
        timeout: 10000,
      },
    );

    const newCommentData: Comment = {
      id: response.data.comment.id,
      comment_body: response.data.comment.comment_body,
      created_at: response.data.comment.created_at,
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
      timeout: 10000,
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
        timeout: 10000,
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
        timeout: 10000,
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
        timeout: 10000,
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

  // Generic error for all other cases
  Toast.show({
    text: "Failed to load data. Please try again later",
    position: "top",
  });
};

// Handle system theme changes
const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
  const isDark = mediaQuery.matches;
  updateStatusBar(isDark);
};

// Initialize theme detection
const initThemeDetection = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  handleSystemThemeChange(prefersDark);
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
/* Attachment Loading States */
.attachment-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--ion-color-light);
  border-radius: 12px;
  gap: 12px;
}

.attachment-loading p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.file-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

/* Modal Loading State */
.modal-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.modal-loading p {
  color: white;
  margin: 0;
  font-size: 0.9rem;
}

/* Ensure proper transitions for loading states */
.attachment-image {
  transition: opacity 0.3s ease;
}

.modal-image {
  transition: opacity 0.3s ease;
}

/* Disabled state for file items */
.file-attachment ion-item[disabled] {
  opacity: 0.6;
  pointer-events: none;
}

/* Responsive adjustments for loading states */
@media (max-width: 480px) {
  .attachment-loading {
    height: 150px;
  }
  
  .attachment-loading p {
    font-size: 0.8rem;
  }
}

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

/* Attachment Container */
.attachment-container {
  margin: 16px 0;
}

.image-attachment {
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-light);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-attachment:hover {
  transform: scale(1.02);
}

.attachment-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

.file-attachment {
  margin: 16px 0;
}

.file-attachment ion-item {
  --background: var(--ion-color-light);
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  margin: 8px 0;
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

/* Image Modal */
.image-modal {
  --width: 100%;
  --height: 100%;
}

.modal-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  --background: rgba(255, 255, 255, 0.2);
}

/* Ensure spinner and icons have consistent sizing */
ion-icon {
  width: 16px;
  height: 16px;
  color: var(--ion-color-medium);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .comment-item {
    --padding-start: 8px;
    --padding-end: 8px;
  }
  
  .vote-buttons {
    margin-right: 4px;
    padding: 2px;
  }
  
  .attachment-image {
    max-height: 300px;
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

/* Attachment Loading States */
.attachment-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--ion-color-light);
  border-radius: 12px;
  gap: 12px;
}

.attachment-loading p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.file-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

/* Modal Loading State */
.modal-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.modal-loading p {
  color: white;
  margin: 0;
  font-size: 0.9rem;
}

/* Ensure proper transitions for loading states */
.attachment-image {
  transition: opacity 0.3s ease;
}

.modal-image {
  transition: opacity 0.3s ease;
}

/* Disabled state for file items */
.file-attachment ion-item[disabled] {
  opacity: 0.6;
  pointer-events: none;
}

/* Responsive adjustments for loading states */
@media (max-width: 480px) {
  .attachment-loading {
    height: 150px;
  }
  
  .attachment-loading p {
    font-size: 0.8rem;
  }
}

.skeleton-image {
  width: 100%;
  height: 300px;
  background: var(--ion-color-medium-shade);
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.skeleton-image::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: wave 1.5s infinite;
}

@keyframes wave {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.image-skeleton {
  width: 100%;
  height: 220px;
  border-radius: 10px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
  background-size: 400% 100%;
  animation: skeletonLoading 1.4s ease infinite;
  margin-top: 10px;
}

@keyframes skeletonLoading {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.attachment-image {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
}

.attachment-image {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
  cursor: pointer; /* Makes it feel clickable */
}


</style>