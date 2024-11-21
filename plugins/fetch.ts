export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:created', () => {
    const originalFetch = globalThis.$fetch
    
    globalThis.$fetch = async (request, options = {}) => {
      // Thêm token vào header
      const token = localStorage.getItem('token')
      
      const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }

      return originalFetch(request, {
        ...options,
        headers
      })
    }
  })
}) 