export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss'
  ],

  plugins: [
    '@/plugins/antd'
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
  compatibilityDate: '2024-11-19'
})
