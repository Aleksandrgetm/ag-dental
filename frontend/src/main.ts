import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";

import router from "./router";
import vuetify from "./plugins/vuetify";
import i18n from "./i18n";
import { bookingMessages } from "./i18n/booking";
import { authMessages } from "./i18n/auth";
import { adminMessages } from "./i18n/admin";
import { cmsMessages } from "./i18n/cms";
import { useAuthStore } from "./stores/auth";
import { refreshPublished } from "./services/cms/content";
import "./style.css";

const app = createApp(App);

app.use(createPinia());
for (const lang of ["lv", "ru", "en"] as const)
  i18n.global.mergeLocaleMessage(lang, {
    auth: authMessages[lang],
    admin: adminMessages[lang],
    cms: cmsMessages[lang],
    booking: bookingMessages[lang],
  });
void useAuthStore().initialize();
app.use(router);
app.use(vuetify);
app.use(i18n);

app.mount("#app");
// Optional content revalidation never blocks application bootstrap.
void refreshPublished();
router.afterEach(() => {
  void refreshPublished();
});
window.addEventListener("focus", () => {
  void refreshPublished();
});
