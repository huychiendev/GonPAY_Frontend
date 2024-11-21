import type { User, UserFilters } from '~/pages/admin/users/types'

export const userService = {
  async getUsers(params: {
    page?: number
    pageSize?: number
    search?: string
    filters?: UserFilters
  }) {
    const { fetchApi } = useApi()
    return await fetchApi('/api/admin/users', {
      method: 'GET',
      query: params
    })
  },

  async createUser(userData: Partial<User>) {
    const { fetchApi } = useApi()
    return await fetchApi('/api/admin/users', {
      method: 'POST',
      body: userData
    })
  },

  async updateUser(id: number, userData: Partial<User>) {
    const { fetchApi } = useApi()
    return await fetchApi(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: userData
    })
  },

  async deleteUser(id: number) {
    const { fetchApi } = useApi()
    return await fetchApi(`/api/admin/users/${id}`, {
      method: 'DELETE'
    })
  },

  async updateStatus(id: number, status: string) {
    const { fetchApi } = useApi()
    return await fetchApi(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { status }
    })
  }
} 