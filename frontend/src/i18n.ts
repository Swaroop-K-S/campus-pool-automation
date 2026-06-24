import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "admin_overview": "Admin Overview",
      "live_data_mongodb": "Live data from MongoDB",
      "system": "System",
      "online": "Online",
      "checking": "Checking...",
      "mongodb_atlas_fastapi_vite": "MongoDB Atlas • FastAPI • Vite",
      "system_settings_coming_soon": "System Settings (Coming Soon)",
      "s": "S",
      "sapthagiri_nps": "Sapthagiri NPS",
      "university": "University",
      "sapthagiri_nps_university": "Sapthagiri NPS University",
      "gateway_of": "A Gateway of",
      "opportu": "Opportu",
      "nities": "nities",
      "campuspool_desc": "CampusPool — the intelligent placement automation system powering Sapthagiri's recruitment drives.",
      "welcome_back": "Welcome Back",
      "signin_desc": "Sign in to the CampusPool Admin Portal",
      "email_address": "Email Address",
      "password": "Password",
      "forgot_password": "Forgot password?",
      "or_continue_with": "or continue with"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
