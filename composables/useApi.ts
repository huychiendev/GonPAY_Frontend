export const useApi = () => {
  const config = useRuntimeConfig()
  
  const fetchApi = async (endpoint: string, options: any = {}) => {
    try {
      const { data, error } = await useFetch(endpoint, {
        baseURL: config.public.apiBase,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        ...options
      })
      
      return { data, error }
    } catch (err) {
      return {
        data: null,
        error: err
      }
    }
  }

  return {
    fetchApi
  }
} 