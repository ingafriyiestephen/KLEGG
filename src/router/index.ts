import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import TabsPage from "../views/TabsPage.vue";
import LoginPage from "../views/LoginPage.vue";

const routes: Array<RouteRecordRaw> = [
  { path: "/", component: LoginPage },
  {
    path: "/tabs/",
    component: TabsPage,
    children: [
      {
        path: "/home",
        component: () => import("@/views/HomePage.vue"),
      },
      {
        path: "/tutorships",
        component: () => import("@/views/TutorshipPage.vue"),
      },
      {
        path: "/notifications",
        component: () => import("@/views/NotificationsPage.vue"),
      },
      {
        path: "/settings",
        component: () => import("@/views/SettingsPage.vue"),
      },
      {
        path: "/classroom/:id",
        component: () => import("@/views/ClassroomPage.vue"),
      },
      {
        path: "/attendance/:id",
        component: () => import("@/views/AttendancePage.vue"),
      },
      {
        path: "/assignment/:id",
        component: () => import("@/views/AssignmentPage.vue"),
      },
      {
        path: "/materials/:id",
        component: () => import("@/views/MaterialsPage.vue"),
      },
      {
        path: "/assessment/:id",
        component: () => import("@/views/AssessmentPage.vue"),
      },
      {
        path: "/exam/:id",
        component: () => import("@/views/ExamPage.vue"),
      },
      {
        path: "/notifications/:id",
        component: () => import("@/views/NotificationPage.vue"),
      },
      {
        path: "/rate/:id",
        component: () => import("@/views/RatePage.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
