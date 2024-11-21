<template>
  <NuxtErrorBoundary>
    <div class="users-container">
      <div class="mb-4 flex justify-between items-center">
        <AInputSearch v-model:value="filters.search" placeholder="Tìm kiếm người dùng..." style="width: 300px" @search="handleSearch" />
        <AButton type="primary" @click="showCreateModal">
          <template #icon><UserAddOutlined /></template>
          Thêm người dùng
        </AButton>
      </div>
      <ATable :columns="columns" :data-source="users" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <ASpace>
              <AButton type="primary" size="small" @click="showEditModal(record)">
                <template #icon><EditOutlined /></template>
              </AButton>
              <AButton danger size="small" @click="showDeleteConfirm(record)">
                <template #icon><DeleteOutlined /></template>
              </AButton>
            </ASpace>
          </template>
          <template v-if="column.key === 'status'">
            <ATag :color="getStatusColor(record.status)">{{ record.status }}</ATag>
          </template>
        </template>
      </ATable>
      <AModal v-model:visible="modalVisible" :title="modalMode === 'create' ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'" @ok="handleModalOk" @cancel="handleModalCancel" :confirmLoading="modalLoading">
        <AForm ref="formRef" :model="formData" :rules="rules" layout="vertical">
          <AFormItem label="Tên đăng nhập" name="username"><AInput v-model:value="formData.username" /></AFormItem>
          <AFormItem label="Email" name="email"><AInput v-model:value="formData.email" /></AFormItem>
          <AFormItem label="Số điện thoại" name="phone_number"><AInput v-model:value="formData.phone_number" /></AFormItem>
          <AFormItem label="Mật khẩu" name="password" :required="modalMode === 'create'"><AInputPassword v-model:value="formData.password" /></AFormItem>
          <AFormItem label="Vai trò" name="role">
            <ASelect v-model:value="formData.role">
              <ASelectOption value="USER">Người dùng</ASelectOption>
              <ASelectOption value="ADMIN">Quản trị viên</ASelectOption>
            </ASelect>
          </AFormItem>
          <AFormItem label="Trạng thái" name="status">
            <ASelect v-model:value="formData.status">
              <ASelectOption value="ACTIVE">Hoạt động</ASelectOption>
              <ASelectOption value="INACTIVE">Không hoạt động</ASelectOption>
              <ASelectOption value="BLOCKED">Đã khóa</ASelectOption>
            </ASelect>
          </AFormItem>
          <AFormItem label="Ngôn ngữ" name="preferences.language">
            <ASelect v-model:value="formData.preferences.language">
              <ASelectOption value="vi">Tiếng Việt</ASelectOption>
              <ASelectOption value="en">Tiếng Anh</ASelectOption>
            </ASelect>
          </AFormItem>
          <AFormItem name="preferences.notification_enabled">
            <ACheckbox v-model:checked="formData.preferences.notification_enabled">Bật thông báo</ACheckbox>
          </AFormItem>
        </AForm>
      </AModal>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ACard v-for="stat in roleStats" :key="stat.title" hoverable>
          <Statistic
              :title="stat.title"
              :value="stat.value"
              :value-style="{ color: stat.color }"
          >
            <template #prefix>
              <component :is="stat.prefix"/>
            </template>
            <template #suffix>
              <span class="text-xs" :class="stat.trend > 0 ? 'text-green-500' : 'text-red-500'">
                {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%
              </span>
            </template>
          </Statistic>
        </ACard>
      </div>
    </div>
    <template #error="{ error }">
      <div class="error-container">
        <h3>Đã xảy ra lỗi</h3>
        <p>{{ error.message }}</p>
        <AButton @click="handleError">Thử lại</AButton>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { message, Modal, TableColumnType } from 'ant-design-vue'
import { UserAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useApi } from '~/composables/useApi'
import { debounce } from 'lodash'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'

const { fetchApi } = useApi()

interface User {
  id: number
  username: string
  email: string
  phone_number: string
  password?: string
  status: string
  role: string
  preferences: {
    language: string
    notification_enabled: boolean
  }
  created_at: string
  updated_at: string
}

const users = ref<User[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const modalMode = ref('create')
const formData = ref<Partial<User>>({
  username: '',
  email: '',
  phone_number: '',
  password: '',
  role: 'USER',
  status: 'ACTIVE',
  preferences: {
    language: 'vi',
    notification_enabled: false
  }
})

const filters = ref({
  search: '',
  status: '',
  role: ''
})

const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Tổng ${total} mục`
})

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Số điện thoại', dataIndex: 'phone_number', key: 'phone_number' },
  { title: 'Vai trò', dataIndex: 'role', key: 'role' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status' },
  { title: 'Hành động', key: 'action', fixed: 'right', width: 120 }
] as TableColumnType<User>[]

interface ApiResponse {
  items: User[]
  total: number
  page?: number
  pageSize?: number
}

const fetchUsers = async () => {
  try {
    loading.value = true
    const response = await fetchApi('/api/admin/users', {
      method: 'GET',
      query: { page: pagination.value.current, pageSize: pagination.value.pageSize }
    })
    if (!response?.data?.value) throw createError({ statusCode: 500, message: 'Không thể tải dữ liệu người dùng' })
    users.value = response.data.value
    pagination.value.total = response.data.value.length
  } catch (err: any) {
    message.error(err.message || 'Lỗi khi tải danh sách người dùng')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = { ACTIVE: 'success', INACTIVE: 'warning', BLOCKED: 'error' }
  return colors[status] || 'default'
}

const showCreateModal = () => {
  modalMode.value = 'create'
  formData.value = {
    username: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE',
    preferences: { language: 'vi', notification_enabled: false }
  }
  modalVisible.value = true
}

const showEditModal = (record: User) => {
  modalMode.value = 'edit'
  formData.value = { ...record }
  modalVisible.value = true
}

const formRef = ref<FormInstance>()

const handleModalOk = async () => {
  try {
    await formRef.value?.validate()
    const endpoint = modalMode.value === 'create' ? '/api/admin/users' : `/api/admin/users/${formData.value.id}`
    const method = modalMode.value === 'create' ? 'POST' : 'PUT'
    const { error } = await fetchApi(endpoint, { method, body: formData.value })
    if (error.value) throw error.value
    message.success(`${modalMode.value === 'create' ? 'Thêm' : 'Cập nhật'} người dùng thành công`)
    modalVisible.value = false
    await fetchUsers()
  } catch (error) {
    console.error(error)
    message.error('Vui lòng kiểm tra lại thông tin')
  }
}

const handleModalCancel = () => {
  modalVisible.value = false
}

const showDeleteConfirm = (record: User) => {
  Modal.confirm({
    title: 'Xác nhận xóa người dùng',
    content: `Bạn có chắc chắn muốn xóa người dùng ${record.username}?`,
    okText: 'Xác nhận',
    okType: 'danger',
    cancelText: 'Hủy',
    async onOk() {
      try {
        const { error } = await fetchApi(`/api/admin/users/${record.id}`, { method: 'DELETE' })
        if (error.value) throw error.value
        message.success('Xóa người dùng thành công')
        await fetchUsers()
      } catch (error) {
        message.error('Lỗi khi xóa người dùng')
        console.error(error)
      }
    }
  })
}

const toggleUserStatus = async (record: User) => {
  try {
    const newStatus = record.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
    const { error } = await fetchApi(`/api/admin/users/${record.id}/status`, { method: 'PATCH', body: { status: newStatus } })
    if (error.value) throw error.value
    message.success('Cập nhật trạng thái thành công')
    await fetchUsers()
  } catch (error) {
    message.error('Lỗi khi cập nhật trạng thái')
    console.error(error)
  }
}

const handleSearch = debounce((value: string) => {
  pagination.value.current = 1
  fetchUsers()
}, 300)

const handleTableChange = async (pag: TablePaginationConfig) => {
  try {
    pagination.value.current = pag.current || 1
    pagination.value.pageSize = pag.pageSize || 10
    await fetchUsers()
  } catch (err: any) {
    message.error('Lỗi khi thay đổi trang')
    console.error(err)
  }
}

onMounted(() => {
  fetchUsers()
})

definePageMeta({ layout: 'admin' })

const rules = {
  username: [{ required: true, message: 'Vui lòng nhập tên đăng nhập' }],
  email: [{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }],
  phone_number: [{ required: true, message: 'Vui lòng nhập số điện thoại' }],
  password: [{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }]
}

const props = defineProps<{ searchText?: string }>()

const emit = defineEmits<{ (e: 'update:searchText', value: string): void; (e: 'search'): void }>()

watch(users, (newValue) => {
  console.log('Users data changed:', newValue)
}, { deep: true })

const handleError = () => {
  clearError()
  fetchUsers()
}
</script>

<style scoped>
.users-container {
  min-height: 100%;
}
</style>
