import { createRouter, createWebHistory } from "vue-router";
const router = createRouter({
  history: createWebHistory(),
  routes: [
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
router.afterEach(() => {
  setTimeout(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
  }, 0);
});
export default router;
