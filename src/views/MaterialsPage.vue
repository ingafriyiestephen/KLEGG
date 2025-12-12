<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-back-button default-href="/"></ion-back-button>
          </ion-buttons>
          <ion-title>Course Materials</ion-title>
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
            <ion-card class="summary-card">
              <ion-card-content>
                <div class="summary-content">
                  <ion-icon :icon="documentTextOutline" class="summary-icon"></ion-icon>
                  <div>
                    <ion-text class="summary-count">{{ materialsCount }}</ion-text>
                    <ion-text class="summary-label">Materials</ion-text>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
            
            <ion-card class="summary-card">
              <ion-card-content>
                <div class="summary-content">
                  <ion-icon :icon="documentAttachOutline" class="summary-icon"></ion-icon>
                  <div>
                    <ion-text class="summary-count">{{ totalFilesCount }}</ion-text>
                    <ion-text class="summary-label">Files</ion-text>
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
        <div class="empty-state" v-else-if="!hasMaterials && !error">
          <ion-icon :icon="documentTextOutline" color="medium"></ion-icon>
          <ion-text>
            <h3>No Course Materials</h3>
            <p>Your course materials will appear here when uploaded by your teacher</p>
          </ion-text>
          <ion-button fill="clear" @click="$router.back()"
            >Back to Classes</ion-button
          >
        </div>
  
        <!-- Error State -->
        <div class="error-state" v-else-if="error">
          <ion-icon :icon="warningOutline" color="warning"></ion-icon>
          <ion-text>
            <h3>Error Loading Materials</h3>
            <p>Please try again later</p>
          </ion-text>
          <ion-button fill="clear" @click="fetchMaterials">Retry</ion-button>
        </div>
  
        <!-- Materials List -->
        <div v-else>
          <ion-list lines="none">
            <ion-item-sliding
              v-for="(material, index) in materials"
              :key="material.material_id || index"
            >
              <ion-item class="material-item" :detail="false">
                <div
                  slot="start"
                  class="type-indicator"
                  :style="{ backgroundColor: getFileTypeColor(material) }"
                ></div>
  
                <ion-label class="material-content">
                  <div class="material-header">
                    <ion-text class="material-title">{{
                      material.material_name || 'Untitled Material'
                    }}</ion-text>
                    <ion-badge :color="getFileTypeBadgeColor(material)">
                      <ion-icon
                        :icon="getFileTypeIcon(material)"
                        slot="start"
                      ></ion-icon>
                      {{ getFileTypeText(material) }}
                    </ion-badge>
                  </div>
  
                  <div class="material-meta theme-text-eight">
                    <ion-text class="material-date">
                      <ion-icon :icon="documentOutline "></ion-icon>
                      Posted: {{ material.material_description
                        ? formatDate(material.created_at)
                        : 'N/A' }}
                    </ion-text>
                  </div>
  
                  <div class="material-description" v-if="material.material_description">
                    <ion-text class="theme-text-nine">{{ material.material_description }}</ion-text>
                  </div>
  
                  <!-- Files List -->
                  <div class="files-container" v-if="hasFiles(material)">
                    <ion-text class="files-label">Attached Files:</ion-text>
                    <div class="files-list">
                      <div 
                        v-for="(file, fileIndex) in getMaterialFiles(material)" 
                        :key="fileIndex"
                        class="file-item"
                        @click="accessFile(file, isMobile ? 'view' : 'download')"
                      >
                        <ion-icon 
                          :icon="getFileIconForFile(file)" 
                          class="file-icon"
                          :style="{ color: getFileTypeColorForFile(file) }"
                        ></ion-icon>
                        <div class="file-info">
                          <ion-text class="file-name">{{ getFileName(file) }}</ion-text>
                          <ion-text class="file-type">{{ getFileExtension(file).toUpperCase() }}</ion-text>
                        </div>
                        <ion-button 
                          fill="clear" 
                          size="small"
                          class="file-action-btn"
                          @click.stop="accessFile(file, isMobile ? 'view' : 'download')"
                        >
                          <ion-icon 
                            slot="icon-only" 
                            :icon="getActionIconForFile(file)"
                          ></ion-icon>
                        </ion-button>
                      </div>
                    </div>
                  </div>
  
                  <div class="material-footer">
                    <ion-text class="upload-date">
                      <ion-icon :icon="timeOutline"></ion-icon>
                      Uploaded: {{ formatDate(material.created_at) }}
                    </ion-text>
  
                    <!-- Bulk Download Button (if multiple files) -->
                    <ion-button
                      v-if="getMaterialFiles(material).length > 1"
                      fill="clear"
                      size="small"
                      @click="downloadAllFiles(material)"
                    >
                      <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
                      Download All
                    </ion-button>
                  </div>
                </ion-label>
              </ion-item>
  
              <ion-item-options side="end">
                <ion-item-option
                  color="tertiary"
                  @click="shareMaterial(material)"
                >
                  <ion-icon slot="icon-only" :icon="shareOutline"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-list>
        </div>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, computed } from "vue";
  import { onIonViewWillEnter, isPlatform } from "@ionic/vue";
  import { useRoute, useRouter } from "vue-router";
  import { Toast } from "@capacitor/toast";
  import axios from "axios";
  import { updateStatusBar } from '@/utils/statusBar';
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
    IonBadge,
  } from "@ionic/vue";
  import {
    timeOutline,
    warningOutline,
    documentTextOutline,
    calendarOutline,
    downloadOutline,
    shareOutline,
    documentAttachOutline,
    imageOutline,
    videocamOutline,
    musicalNotesOutline,
    archiveOutline,
    openOutline,
    documentOutline,
    folderOutline,
  } from "ionicons/icons";
  
  interface CourseMaterial {
    material_id: number;
    tutorship_id: number;
    material_name: string;
    material_description?: string;
    material_file: string; // Legacy single file field
    material_files: string; // JSON string array of files
    created_at: string;
  }
  
  const token = localStorage.getItem("parisklegg_token") || "";
  
  // Get the stored user data
  const userDataString = localStorage.getItem("parisklegg_user");
  const userData = userDataString ? JSON.parse(userDataString) : null;
  
  // Extract values with fallbacks
  const userId = userData?.user_id || 0;
  
  const route = useRoute();
  const router = useRouter();
  const tutorshipId = Number(route.params.id);
  const tutorshipName = ref<string>("");
  const loading = ref<boolean>(true);
  const error = ref<boolean>(false);
  const hasMaterials = ref<boolean>(false);
  const materials = ref<CourseMaterial[]>([]);
  const materialsCount = ref<number>(0);
  const totalFilesCount = ref<number>(0);
  
  // Server URL for file access
  const SERVER_URL = "https://storage.draugustinaosabutey.com/*/admin/file/download/";
  
  const getFileExtension = (filename: string): string => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };
  
  const getFileName = (filePath: string): string => {
    if (!filePath) return '';
    // Extract filename from path
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };
  
  const getMaterialFiles = (material: CourseMaterial): string[] => {
    try {
      // Check if material_files exists and is not empty
      if (material.material_files && material.material_files.trim()) {
        const files = JSON.parse(material.material_files);
        if (Array.isArray(files) && files.length > 0) {
          return files;
        }
      }
      // Fallback to legacy material_file field
      if (material.material_file && material.material_file.trim()) {
        return [material.material_file];
      }
      return [];
    } catch (error) {
      console.error('Error parsing material_files:', error);
      // Fallback to legacy field
      if (material.material_file && material.material_file.trim()) {
        return [material.material_file];
      }
      return [];
    }
  };
  
  const hasFiles = (material: CourseMaterial): boolean => {
    return getMaterialFiles(material).length > 0;
  };
  
  const getFileTypeForFile = (filename: string): string => {
    const extension = getFileExtension(filename);
    
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
      case 'zip':
      case 'rar':
      case '7z':
        return 'archive';
      default:
        return 'file';
    }
  };
  
  const getFileType = (material: CourseMaterial): string => {
    const files = getMaterialFiles(material);
    if (files.length === 0) return 'file';
    
    // For material type, use the first file's type
    return getFileTypeForFile(files[0]);
  };
  
  const isMobile = computed(() => {
    return isPlatform('ios') || isPlatform('android');
  });
  
  const getFileTypeColorForFile = (filename: string): string => {
    const type = getFileTypeForFile(filename);
    switch (type) {
      case "pdf":
        return "var(--ion-color-danger)";
      case "document":
        return "var(--ion-color-primary)";
      case "presentation":
        return "var(--ion-color-warning)";
      case "spreadsheet":
        return "var(--ion-color-success)";
      case "image":
        return "var(--ion-color-tertiary)";
      case "video":
        return "var(--ion-color-secondary)";
      case "audio":
        return "var(--ion-color-dark)";
      default:
        return "var(--ion-color-medium)";
    }
  };
  
  const getFileTypeColor = (material: CourseMaterial): string => {
    return getFileTypeColorForFile(getMaterialFiles(material)[0] || '');
  };
  
  const getFileTypeBadgeColor = (material: CourseMaterial): string => {
    const type = getFileType(material);
    switch (type) {
      case "pdf":
        return "danger";
      case "document":
        return "primary";
      case "presentation":
        return "warning";
      case "spreadsheet":
        return "success";
      case "image":
        return "tertiary";
      case "video":
        return "secondary";
      case "audio":
        return "dark";
      default:
        return "medium";
    }
  };
  
  const getFileIconForFile = (filename: string) => {
    const type = getFileTypeForFile(filename);
    switch (type) {
      case "pdf":
        return documentAttachOutline;
      case "document":
        return documentOutline;
      case "presentation":
        return documentAttachOutline;
      case "spreadsheet":
        return documentAttachOutline;
      case "image":
        return imageOutline;
      case "video":
        return videocamOutline;
      case "audio":
        return musicalNotesOutline;
      case "archive":
        return archiveOutline;
      default:
        return folderOutline;
    }
  };
  
  const getFileTypeIcon = (material: CourseMaterial) => {
    const files = getMaterialFiles(material);
    if (files.length === 0) return folderOutline;
    return getFileIconForFile(files[0]);
  };
  
  const getFileTypeText = (material: CourseMaterial): string => {
    const type = getFileType(material);
    const files = getMaterialFiles(material);
    
    if (files.length === 0) return "NO FILES";
    
    if (files.length === 1) {
      const extension = getFileExtension(files[0]);
      switch (type) {
        case "pdf":
          return "PDF";
        case "document":
          return "DOC";
        case "presentation":
          return "PPT";
        case "spreadsheet":
          return "XLS";
        case "image":
          return extension.toUpperCase();
        case "video":
          return extension.toUpperCase();
        case "audio":
          return extension.toUpperCase();
        case "archive":
          return extension.toUpperCase();
        default:
          return extension.toUpperCase() || "FILE";
      }
    } else {
      return `${files.length} FILES`;
    }
  };
  
  const getActionIconForFile = (filename: string) => {
    const type = getFileTypeForFile(filename);
    // For images and PDFs, prefer viewing on mobile
    if (isMobile.value && (type === 'image' || type === 'pdf')) {
      return openOutline;
    }
    return downloadOutline;
  };
  
  const getActionTextForFile = (filename: string): string => {
    const type = getFileTypeForFile(filename);
    if (isMobile.value && (type === 'image' || type === 'pdf')) {
      return 'Open';
    }
    return 'Download';
  };
  
  const formatDate = (dateString: string): string => {
    const rawDate = new Date(dateString);
    const date = new Date(rawDate);
  
    const formatted = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date);
  
    return formatted;
  };
  
  const fetchMaterials = async () => {
    try {
      loading.value = true;
      error.value = false;
      materials.value = [];
      materialsCount.value = 0;
      totalFilesCount.value = 0;
  
      // Fetch materials filtered by tutorship_id
      const response = await axios.get(
        "https://klegg-app-whh7m.ondigitalocean.app/api/materials",
        {
          headers: getAuthHeaders(),
          params: {
            tutorship_id: tutorshipId
          },
          timeout: 20000,
        },
      );
      
      console.log("Course Materials response:", response.data);
      
      if (response.data.length > 0) {
        hasMaterials.value = true;
        
        // Get tutorship name from first material or use a default
        tutorshipName.value = response.data[0]?.tutorship_name || "Course Materials";
        
        // Filter materials by tutorship_id (in case API doesn't filter properly)
        const filteredMaterials = response.data.filter(
          (material: CourseMaterial) => material.tutorship_id === tutorshipId
        );
        
        // Sort by creation date (newest first)
        materials.value = filteredMaterials.sort(
          (a: CourseMaterial, b: CourseMaterial) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        );
        
        materialsCount.value = materials.value.length;
        
        // Calculate total number of files across all materials
        totalFilesCount.value = materials.value.reduce((total, material) => {
          return total + getMaterialFiles(material).length;
        }, 0);
        
      } else {
        hasMaterials.value = false;
      }
      
    } catch (err) {
      handleFetchError(err);
      error.value = true;
    } finally {
      loading.value = false;
    }
  };
  
  const accessFile = async (filename: string, action: 'view' | 'download' = 'view') => {
    try {
      const loadingToast = await Toast.show({
        text: action === 'view' ? 'Opening file...' : 'Preparing download...',
        position: 'top'
      });
  
      // Construct the complete URL using the provided pattern
      const fileUrl = `${SERVER_URL}${filename}`;
      
      // Open in new tab for both view and download
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
  
  const downloadAllFiles = async (material: CourseMaterial) => {
    try {
      const files = getMaterialFiles(material);
      if (files.length === 0) return;
  
      await Toast.show({
        text: `Downloading ${files.length} files...`,
        position: 'top'
      });
  
      // Open each file in a new tab (browser will handle downloads)
      files.forEach((file, index) => {
        setTimeout(() => {
          const fileUrl = `${SERVER_URL}${file}`;
          window.open(fileUrl, '_blank');
        }, index * 100); // Stagger the openings slightly
      });
  
    } catch (error) {
      console.error('Error downloading all files:', error);
      await Toast.show({
        text: 'Failed to download files. Please try again.',
        position: 'top',
        duration: 'long'
      });
    }
  };
  
  const shareMaterial = (material: CourseMaterial) => {
    const files = getMaterialFiles(material);
    if (files.length === 0) return;
  
    // If there's only one file, share that file URL
    if (files.length === 1) {
      const fileUrl = `${SERVER_URL}${files[0]}`;
      shareLink(material.material_name, material.material_description || 'Check out this course material', fileUrl);
    } else {
      // For multiple files, create a text with all links
      const fileLinks = files.map(file => `${SERVER_URL}${file}`).join('\n');
      const shareText = `${material.material_name}\n\n${material.material_description || 'Check out these course materials:'}\n\n${fileLinks}`;
      
      // Use Web Share API if available
      if (navigator.share) {
        navigator.share({
          title: material.material_name,
          text: shareText
        })
          .then(() => console.log('Shared successfully'))
          .catch((error) => console.log('Error sharing:', error));
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText)
          .then(() => {
            Toast.show({
              text: 'Links copied to clipboard',
              position: 'top',
              duration: 'short'
            });
          })
          .catch((error) => {
            console.error('Failed to copy links:', error);
          });
      }
    }
  };
  
  const shareLink = (title: string, text: string, url: string) => {
    const shareData = {
      title: title,
      text: text,
      url: url
    };
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(url)
        .then(() => {
          Toast.show({
            text: 'Link copied to clipboard',
            position: 'top',
            duration: 'short'
          });
        })
        .catch((error) => {
          console.error('Failed to copy link:', error);
        });
    }
  };
  
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${token}`,
  });
  
  const handleFetchError = (error: unknown) => {
    console.error("Error fetching materials:", error);
  
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
      text: "Failed to load materials. Please try again later",
      position: "top",
    });
  };
  
  const handleSystemThemeChange = (mediaQuery: MediaQueryListEvent | MediaQueryList) => {
    const isDark = mediaQuery.matches;
    updateStatusBar(isDark);
  };
  
  const initThemeDetection = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    handleSystemThemeChange(prefersDark);
    prefersDark.addEventListener('change', handleSystemThemeChange);
    return prefersDark;
  };
  
  onMounted(() => {
    initThemeDetection();
    fetchMaterials();
  });
  
  onIonViewWillEnter(async () => {
    initThemeDetection();
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
    --background: rgba(var(--ion-color-primary-rgb), 0.1);
  }
  
  .summary-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .summary-icon {
    font-size: 32px;
    color: var(--ion-color-primary);
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
  
  .theme-text-nine {
    opacity: 0.9;
    color: var(--ion-text-color);
  }
  
  .theme-text-eight {
    opacity: 0.9;
    color: var(--ion-text-color);
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
  
  /* Material Items */
  .type-indicator {
    width: 4px;
    height: 100%;
    border-radius: 4px;
    position: absolute;
    left: 0;
  }
  
  .material-item {
    --padding-start: 12px;
    --inner-padding-end: 12px;
    --background: var(--ion-item-background, var(--ion-background-color, #fff));
    margin-bottom: 8px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .material-content {
    margin-left: 12px;
  }
  
  .material-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .material-title {
    font-weight: 600;
    font-size: 1rem;
    flex: 1;
    margin-right: 8px;
  }
  
  .material-meta {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-bottom: 8px;
  }
  
  .material-meta ion-icon {
    margin-right: 4px;
    vertical-align: middle;
  }
  
  .material-description {
    font-size: 0.875rem;
    color: var(--ion-color-medium);
    margin-bottom: 12px;
    line-height: 1.5;
  }
  
  /* Files Container */
  .files-container {
    margin: 12px 0;
    padding: 12px;
    background: var(--ion-color-light);
    border-radius: 8px;
  }
  
  .files-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ion-color-medium);
    margin-bottom: 8px;
  }
  
  .files-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    padding: 8px;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .file-item:hover {
    background: var(--ion-color-light-shade);
  }
  
  .file-icon {
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
  }
  
  .file-info {
    flex: 1;
    min-width: 0;
  }
  
  .file-name {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ion-color-dark);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-type {
    display: block;
    font-size: 0.75rem;
    color: var(--ion-color-medium);
    margin-top: 2px;
  }
  
  .file-action-btn {
    margin-left: 8px;
    --padding-start: 4px;
    --padding-end: 4px;
  }
  
  .material-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid var(--ion-color-light);
  }
  
  .upload-date {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
  }
  
  .upload-date ion-icon {
    margin-right: 4px;
    vertical-align: middle;
  }
  
  /* Responsive adjustments */
  @media (min-width: 768px) {
    .summary-cards {
      gap: 24px;
    }
  
    .material-item {
      margin: 0 auto 12px;
      max-width: 800px;
    }
    
    .file-item {
      padding: 12px;
    }
  }
  </style>