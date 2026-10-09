import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    guestOnly?: boolean;
    authMode?: "login" | "register" | "forgot" | "reset";
  }
}
const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...(
      [
        ["/login", "login"],
        ["/register", "register"],
        ["/forgot-password", "forgot"],
        ["/reset-password", "reset"],
      ] as const
    ).map(([path, authMode]) => ({
      path,
      component: () => import("../views/AuthView.vue"),
      meta: {
        title: `auth.${authMode}`,
        authMode,
        guestOnly: authMode === "login" || authMode === "register",
      },
    })),
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
      meta: { title: "nav.home" },
    },
    {
      path: "/pakalpojumi",
      component: () => import("../views/ServicesView.vue"),
      meta: { title: "nav.services" },
    },
    {
      path: "/pakalpojumi/:slug",
      component: () => import("../views/ServiceView.vue"),
      meta: { title: "nav.services" },
    },
    {
      path: "/cenas",
      component: () => import("../views/PricesView.vue"),
      meta: { title: "nav.prices" },
    },
    {
      path: "/par-mums",
      component: () => import("../views/AboutView.vue"),
      meta: { title: "nav.about" },
    },
    {
      path: "/jaunumi",
      component: () => import("../views/NewsView.vue"),
      meta: { title: "nav.news" },
    },
    {
      path: "/jaunumi/:slug",
      component: () => import("../views/ArticleView.vue"),
      meta: { title: "nav.news" },
    },
    {
      path: "/pieraksts",
      component: () => import("../views/BookingView.vue"),
      meta: { title: "booking.title" },
    },
    {
      path: "/kontakti",
      component: () => import("../views/ContactView.vue"),
      meta: { title: "nav.contact" },
    },
    {
      path: "/jaunumi/params/post/:id/:slug",
      redirect: (to) => "/jaunumi/" + to.params.slug,
    },
    {
      path: "/privatuma-politika",
      component: () => import("../views/LegalView.vue"),
      meta: { title: "legal.privacyTitle", legal: "privacy" },
    },
    {
      path: "/sikdatnu-politika",
      component: () => import("../views/LegalView.vue"),
      meta: { title: "legal.cookieTitle", legal: "cookies" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("../views/NotFoundView.vue"),
      meta: { title: "ui.notFound" },
    },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 120 };
    return { top: 0 };
  },
});
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth || to.meta.requiresAdmin || to.meta.authMode) {
    await auth.initialize();
    if (to.meta.authMode && (to.hash || to.query.error || to.query.code))
      return { path: to.path, replace: true };
    if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !auth.user)
      return "/login";
    if (to.meta.requiresAdmin) {
      await auth.refreshRole();
      if (auth.role !== "admin") return "/";
    }
    if (to.meta.guestOnly && auth.user) return "/";
  }
});
router.afterEach(() => {
  setTimeout(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
  }, 0);
});
export default router;
