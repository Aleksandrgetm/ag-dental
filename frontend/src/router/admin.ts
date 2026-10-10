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
          path: [
            "services",
            "doctors",
            "pages",
            "news",
            "media",
            "seo",
            "settings",
          ].includes(item)
            ? `${item}/:cmsPath(.*)*`
            : item,
          component: [
            "services",
            "doctors",
            "pages",
            "news",
            "media",
            "seo",
            "settings",
          ].includes(item)
            ? () => import("../views/admin/AdminCmsView.vue")
            : () => import("../views/admin/AdminPlaceholder.vue"),
          meta: { title: `admin.nav.${item}`, adminSection: item },
        })),
      { path: ":pathMatch(.*)*", redirect: "/admin" },
    ],
  },
];
