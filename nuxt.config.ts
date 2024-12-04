export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  plugins: [
    '@/plugins/antd',
    '@/plugins/fetch'
  ],

  imports: {
    dirs: ['stores', 'composables']
  },

  vite: {
    // Các tùy chọn cấu hình cho Vite
  },
  css: [
    '@/assets/css/main.css'
  ],
  devtools: {
    timeline: {
      enabled: false
    }
  },
  devServer: {
    port: 3399
  },
  compatibilityDate: '2024-11-19',
  runtimeConfig: {
    public: {
      apiBase: 'https://gonpay-backend-2.onrender.com'
    }
  },
  router: {
    middleware: ['auth']
  }
})
