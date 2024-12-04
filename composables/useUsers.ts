import { ref, reactive } from 'vue'
import { userService } from '~/services/userService'
import type { User, UserFilters, UserState } from '~/pages/admin/users/types'
import {message} from "ant-design-vue";

export const useUsers = () => {
  const userState = reactive<UserState>({
    users: [],
    loading: false,
    filters: {},
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      showSizeChanger: true
    }
  })

  const fetchUsers = async () => {
    try {
      userState.loading = true
      const { data, error } = await userService.searchUsers({
        q: userState.filters.q,
        type: userState.filters.type,
        page: userState.pagination.current,
        pageSize: userState.pagination.pageSize,
        filters: userState.filters
      })

      if (error.value) throw error.value

      userState.users = data.value.items
      userState.pagination.total = data.value.total
    } catch (err) {
      message.error('Lỗi khi tải danh sách người dùng')
      console.error(err)
    } finally {
      userState.loading = false
    }
  }

  const updateUserStatus = async (id: number, status: string) => {
    try {
      const { error } = await userService.updateStatus(id, status)
      if (error.value) throw error.value
      message.success('Cập nhật trạng thái thành công')
      await fetchUsers()
    } catch (err) {
      message.error('Lỗi khi cập nhật trạng thái')
      console.error(err)
    }
  }

  return {
    userState,
    fetchUsers,
    updateUserStatus
  }
}
