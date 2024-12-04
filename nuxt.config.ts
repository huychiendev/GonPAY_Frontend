export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss'
  ],

  plugins: [
    '@/plugins/antd',
    '@/plugins/fetch'
  ],
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
      apiBase: 'http://localhost:8080'
    }
  },
  imports: {
    dirs: ['composables/**']
  }
})
