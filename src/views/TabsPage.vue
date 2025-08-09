<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tutorships" href="/tutorships">
          <ion-icon :icon="calendarOutline"></ion-icon>
          <ion-label>Classes</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="notifications" href="/notifications">
          <ion-icon :icon="notificationsOutline"></ion-icon>
          <ion-label>Notifications</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings" href="/settings">
          <ion-icon :icon="settingsOutline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
} from "@ionic/vue";
import {
  homeOutline,
  calendarOutline,
  notificationsOutline,
  settingsOutline,
} from "ionicons/icons";
</script>
