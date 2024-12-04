interface ApiError {
  status: number
  message: string
}

interface ApiResponse<T> {
  data: Ref<T | null>
  error: Ref<ApiError | null>
}

export const useApi = () => {
  const config = useRuntimeConfig()
  
  const fetchApi = async <T>(url: string, options?: any): Promise<ApiResponse<T>> => {
    try {
      const { data, error } = await useFetch(url, {
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