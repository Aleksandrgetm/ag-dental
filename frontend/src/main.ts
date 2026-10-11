import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";

import router from "./router";
import vuetify from "./plugins/vuetify";
import i18n from "./i18n";
import { bookingMessages } from "./i18n/booking";
import { authMessages } from "./i18n/auth";
import { adminMessages } from "./i18n/admin";
import { operationMessages } from "./i18n/operations";
import { specialistEditorMessages } from "./i18n/specialistEditor";
import { unifiedDoctorMessages } from "./i18n/unifiedDoctors";
import { simpleMessages } from "./i18n/adminSimple";
import { createdMessages } from "./i18n/created";
import { appointmentMessages } from "./i18n/appointments";
import { mediaMessages } from "./i18n/media";
import { cmsMessages } from "./i18n/cms";
import { useAuthStore } from "./stores/auth";
import { refreshPublished } from "./services/cms/content";
import "./style.css";

const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
if (requestedLanguage === "lv" || requestedLanguage === "ru" || requestedLanguage === "en") i18n.global.locale.value = requestedLanguage;
const app = createApp(App);

app.use(createPinia());
for (const lang of ["lv", "ru", "en"] as const)
  i18n.global.mergeLocaleMessage(lang, {
    auth: authMessages[lang],
    admin: adminMessages[lang],
    cms: cmsMessages[lang],
    media: mediaMessages[lang],
    created: createdMessages[lang],
    simple: simpleMessages[lang],
    doctors: unifiedDoctorMessages[lang],
    specialist: specialistEditorMessages[lang],
    operations: { ...operationMessages[lang], ...appointmentMessages[lang] },
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
