export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss'
  ],

  plugins: [
    '@/plugins/antd',
    '@/plugins/fetch'
  ],

  css: [
    '@/assets/css/main.css'
  ],
  devtools: {
    timeline: {
      enabled: true
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
