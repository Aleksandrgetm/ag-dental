import { createI18n } from 'vue-i18n'

const messages = {
  lv: {
    common: {
      bookAppointment: 'Pieteikt vizīti',
    },
  },

  ru: {
    common: {
      bookAppointment: 'Записаться на приём',
    },
  },

  en: {
    common: {
      bookAppointment: 'Book an appointment',
    },
  },
}

const i18n = createI18n({
  legacy: false,
  locale: 'lv',
  fallbackLocale: 'lv',
  messages,
})

export default i18n