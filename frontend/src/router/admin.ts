import type { RouteRecordRaw } from "vue-router";
import { adminGroups } from "../services/admin/navigation";
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: "/admin",
    component: () => import("../views/admin/AdminGate.vue"),
    meta: {
      requiresAdmin: true,
      adminLayout: true,
      title: "admin.nav.overview",
    },
    children: [
      {
        path: "",
        component: () => import("../views/admin/AdminDashboard.vue"),
      },
      ...adminGroups
        .flatMap((group) => group.items)
        .filter((item) => item !== "overview")
        .map((item) => ({
          path: item,
          component: () => import("../views/admin/AdminPlaceholder.vue"),
          meta: { title: `admin.nav.${item}`, adminSection: item },
        })),
      { path: ":pathMatch(.*)*", redirect: "/admin" },
    ],
  },
];
