<!-- pages/admin/users/roles.vue -->
<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold">Quản lý phân quyền</h2>
        <p class="text-gray-500">Quản lý và phân quyền cho người dùng trong hệ thống</p>
      </div>
      <div class="space-x-4">
        <AButton type="primary" @click="showAddRoleModal = true">
          <template #icon>
            <PlusOutlined />
          </template>
          Thêm vai trò mới
        </AButton>
        <AButton @click="handleBulkOperation">
          <template #icon>
            <SettingOutlined />
          </template>
          Thao tác hàng loạt
        </AButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <ACard v-for="stat in roleStats" :key="stat.title" hoverable>
        <Statistic :title="stat.title" :value="stat.value" :value-style="{ color: stat.color }">
          <template #prefix>
            <component :is="stat.prefix" />
          </template>
          <template #suffix>
            <span class="text-xs" :class="stat.trend > 0 ? 'text-green-500' : 'text-red-500'">
              {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%
            </span>
          </template>
        </Statistic>
      </ACard>
    </div>

    <!-- Role Management Table -->
    <ACard :bordered="false">
      <div class="flex justify-between mb-4">
        <div class="flex space-x-4">
          <AInput v-model:value="searchText" placeholder="Tìm kiếm vai trò/người dùng" style="width: 300px">
            <template #prefix>
              <SearchOutlined />
            </template>
          </AInput>
          <ASelect v-model:value="filterStatus" style="width: 200px" placeholder="Trạng thái">
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="ACTIVE">Đang hoạt động</ASelectOption>
            <ASelectOption value="INACTIVE">Đã vô hiệu</ASelectOption>
          </ASelect>
        </div>
        <div>
          <AButton type="link" @click="refreshTable">
            <template #icon>
              <ReloadOutlined />
            </template>
            Làm mới
          </AButton>
        </div>
      </div>

      <ATable :columns="columns" :data-source="filteredRoles"
        :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }" :loading="loading">
        <!-- Role Name Column -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="flex items-center">
              <Tag :color="record.color">{{ record.name }}</Tag>
              <span class="ml-2">{{ record.description }}</span>
            </div>
          </template>

          <!-- Permissions Column -->
          <template v-else-if="column.key === 'permissions'">
            <div class="space-x-1">
              <Tag v-for="perm in record.permissions" :key="perm" color="blue">
                {{ perm }}
              </Tag>
            </div>
          </template>

          <!-- Users Count Column -->
          <template v-else-if="column.key === 'users'">
            <AButton type="link" @click="showRoleUsers(record)">
              {{ record.usersCount }} người dùng
            </AButton>
          </template>

          <!-- Status Column -->
          <template v-else-if="column.key === 'status'">
            <ABadge :status="record.status === 'ACTIVE' ? 'success' : 'default'" />
            {{ record.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu' }}
          </template>

          <!-- Actions Column -->
          <template v-else-if="column.key === 'actions'">
            <div class="space-x-2">
              <AButton type="link" @click="editRole(record)">
                <template #icon>
                  <EditOutlined />
                </template>
              </AButton>
              <AButton type="link" @click="showPermissions(record)">
                <template #icon>
                  <KeyOutlined />
                </template>
              </AButton>
              <APopconfirm
                :title="'Bạn có chắc muốn ' + (record.status === 'ACTIVE' ? 'vô hiệu hóa' : 'kích hoạt') + ' vai trò này?'"
                @confirm="toggleRoleStatus(record)">
                <AButton type="link" :danger="record.status === 'ACTIVE'">
                  <template #icon>
                    <PoweroffOutlined />
                  </template>
                </AButton>
              </APopconfirm>
            </div>
          </template>
        </template>
      </ATable>
    </ACard>

    <!-- Add/Edit Role Modal -->
    <AModal v-model:open="showAddRoleModal" :title="editingRole ? 'Chỉnh sửa vai trò' : 'Thêm vai trò mới'"
      @ok="handleRoleSubmit">
      <AForm :model="roleForm" layout="vertical">
        <AFormItem label="Tên vai trò" required>
          <AInput v-model:value="roleForm.name" />
        </AFormItem>
        <AFormItem label="Mô tả">
          <ATextarea v-model:value="roleForm.description" />
        </AFormItem>
        <AFormItem label="Quyền hạn" required>
          <ATree v-model:checkedKeys="roleForm.permissions" :tree-data="permissionTree" checkable
            :default-expand-all="true" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Role Users Drawer -->
    <ADrawer v-model:open="showUsersDrawer" title="Người dùng trong vai trò" width="800">
      <ATable :columns="userColumns" :data-source="roleUsers" :pagination="{ pageSize: 5 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <APopconfirm title="Bạn có chắc muốn xóa người dùng khỏi vai trò này?"
              @confirm="removeUserFromRole(record)">
              <AButton type="link" danger>Xóa</AButton>
            </APopconfirm>
          </template>
        </template>
      </ATable>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, h, computed, watch } from 'vue'
import {
  PlusOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  KeyOutlined,
  PoweroffOutlined,
  TeamOutlined, CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import { Modal, message, Statistic, Tag, Button as AButton } from 'ant-design-vue'

// Stats Data
const roleStats = ref([
  {
    title: 'Tổng số vai trò',
    value: 8,
    prefix: TeamOutlined,
    color: '#1890ff',
    trend: 12.5
  },
  {
    title: 'Vai trò hoạt động',
    value: 6,
    prefix: CheckCircleOutlined,
    color: '#52c41a',
    trend: 5.2
  },
  {
    title: 'Phân quyền mới',
    value: 24,
    prefix: KeyOutlined,
    color: '#722ed1',
    trend: 18.2
  },
  {
    title: 'Yêu cầu chờ duyệt',
    value: 3,
    prefix: ClockCircleOutlined,
    color: '#faad14',
    trend: -2.5
  }
])

// Table Configuration
const columns = [
  {
    title: 'Vai trò',
    dataIndex: 'name',
    key: 'name',
    sorter: true
  },
  {
    title: 'Quyền hạn',
    dataIndex: 'permissions',
    key: 'permissions'
  },
  {
    title: 'Người dùng',
    dataIndex: 'users',
    key: 'users',
    sorter: true
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    filters: [
      { text: 'Đang hoạt động', value: 'ACTIVE' },
      { text: 'Đã vô hiệu', value: 'INACTIVE' }
    ]
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 150,
    align: 'center'
  }
]

// Mock Roles Data
const roles = ref([
  {
    id: 1,
    name: 'Admin',
    description: 'Quản trị viên hệ thống',
    permissions: ['Quản lý người dùng', 'Quản lý giao dịch', 'Cấu hình hệ thống'],
    usersCount: 5,
    status: 'ACTIVE',
    color: 'red'
  },
  {
    id: 2,
    name: 'Manager',
    description: 'Quản lý cấp cao',
    permissions: ['Xem báo cáo', 'Quản lý giao dịch'],
    usersCount: 8,
    status: 'ACTIVE',
    color: 'blue'
  },
  {
    id: 3,
    name: 'Support',
    description: 'Nhân viên hỗ trợ',
    permissions: ['Hỗ trợ khách hàng', 'Xem giao dịch'],
    usersCount: 12,
    status: 'ACTIVE',
    color: 'green'
  },
  {
    id: 4,
    name: 'Accountant',
    description: 'Kế toán viên',
    permissions: ['Quản lý tài chính', 'Xem báo cáo'],
    usersCount: 6,
    status: 'ACTIVE',
    color: 'orange'
  },
  {
    id: 5,
    name: 'Auditor',
    description: 'Kiểm toán viên',
    permissions: ['Kiểm tra giao dịch', 'Xem báo cáo'],
    usersCount: 4,
    status: 'ACTIVE',
    color: 'purple'
  },
  {
    id: 6,
    name: 'Marketing',
    description: 'Nhân viên marketing',
    permissions: ['Quản lý chiến dịch', 'Xem thống kê'],
    usersCount: 7,
    status: 'ACTIVE',
    color: 'cyan'
  },
  {
    id: 7,
    name: 'Sales',
    description: 'Nhân viên kinh doanh',
    permissions: ['Quản lý khách hàng', 'Xem báo cáo bán hàng'],
    usersCount: 15,
    status: 'ACTIVE',
    color: 'gold'
  },
  {
    id: 8,
    name: 'Guest',
    description: 'Tài khoản khách',
    permissions: ['Xem thông tin cơ bản'],
    usersCount: 25,
    status: 'INACTIVE',
    color: 'grey'
  },
  {
    id: 9,
    name: 'Developer',
    description: 'Nh phát triển',
    permissions: ['Quản lý API', 'Xem logs hệ thống'],
    usersCount: 3,
    status: 'ACTIVE',
    color: 'geekblue'
  }
])

// Permission Tree Data
const permissionTree = ref([
  {
    title: 'Quản lý người dùng',
    key: 'user-management',
    children: [
      { title: 'Xem danh sách', key: 'user-view' },
      { title: 'Thêm người dùng', key: 'user-create' },
      { title: 'Sửa thông tin', key: 'user-edit' },
      { title: 'Xóa người dùng', key: 'user-delete' }
    ]
  },
  {
    title: 'Quản lý giao dịch',
    key: 'transaction-management',
    children: [
      { title: 'Xem giao dịch', key: 'transaction-view' },
      { title: 'Phê duyệt giao dịch', key: 'transaction-approve' },
      { title: 'Hủy giao dịch', key: 'transaction-cancel' }
    ]
  },
  {
    title: 'Báo cáo & Thống kê',
    key: 'report-management',
    children: [
      { title: 'Xem báo cáo', key: 'report-view' },
      { title: 'Xuất báo cáo', key: 'report-export' },
      { title: 'Phân tích dữ liệu', key: 'report-analyze' }
    ]
  }
])

// State Management
const searchText = ref('')
const filterStatus = ref('')
const selectedKeys = ref<string[]>([])
const loading = ref(false)
const showAddRoleModal = ref(false)
const showUsersDrawer = ref(false)
const editingRole = ref(null)
const roleUsers = ref([])

const roleForm = reactive({
  name: '',
  description: '',
  permissions: []
})

// Methods
const onSelectChange = (keys: string[]) => {
  selectedKeys.value = keys
}

const handleBulkOperation = () => {
  if (selectedKeys.value.length === 0) {
    message.warning('Vui lòng chọn ít nhất một vai trò')
    return
  }

  Modal.confirm({
    title: 'Thao tác hàng loạt',
    content: 'Bạn muốn thực hiện thao tác gì với các vai trò đã chọn?',
    okText: 'Vô hiệu hóa',
    cancelText: 'Hủy',
    async onOk() {
      loading.value = true
      try {
        // Giả lập API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        roles.value = roles.value.map(role => {
          if (selectedKeys.value.includes(role.id)) {
            return { ...role, status: 'INACTIVE' }
          }
          return role
        })
        message.success('Đã cập nhật trạng thái vai trò thành công')
        selectedKeys.value = []
      } catch (error) {
        message.error('Có lỗi xảy ra khi cập nhật vai trò')
      } finally {
        loading.value = false
      }
    }
  })
}

const editRole = (role: any) => {
  editingRole.value = role
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.permissions = role.permissions.map((p: string) => {
    // Map permissions to tree keys
    const found = permissionTree.value.flatMap(group =>
      group.children?.find(child => child.title === p)
    ).filter(Boolean)
    return found[0]?.key || p
  })
  showAddRoleModal.value = true
}

const showPermissions = (role: any) => {
  Modal.info({
    title: `Quyền hạn của vai trò ${role.name}`,
    width: 600,
    content: h('div', { class: 'space-y-4' }, [
      h('p', `Mô tả: ${role.description}`),
      h('div', { class: 'space-y-2' }, [
        h('div', { class: 'font-bold' }, 'Danh sách quyền:'),
        h('div', { class: 'space-x-2' },
          role.permissions.map((perm: string) =>
            h(Tag, { color: 'blue' }, () => perm)
          )
        )
      ])
    ]),
    okText: 'Đóng'
  })
}

const toggleRoleStatus = async (role: any) => {
  loading.value = true
  try {
    // Giả lập API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    const newStatus = role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    roles.value = roles.value.map(r => {
      if (r.id === role.id) {
        return { ...r, status: newStatus }
      }
      return r
    })
    message.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'vô hiệu hóa'} vai trò thành công`)
  } catch (error) {
    message.error('Có lỗi xảy ra khi cập nhật trạng thái vai trò')
  } finally {
    loading.value = false
  }
}

const handleRoleSubmit = async () => {
  if (!roleForm.name || roleForm.permissions.length === 0) {
    message.error('Vui lòng điền đầy đủ thông tin bắt buộc')
    return
  }

  loading.value = true
  try {
    // Giả lập API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (editingRole.value) {
      // Cập nhật vai trò hiện có
      roles.value = roles.value.map(role => {
        if (role.id === editingRole.value.id) {
          return {
            ...role,
            name: roleForm.name,
            description: roleForm.description,
            permissions: roleForm.permissions
          }
        }
        return role
      })
      message.success('Cập nhật vai trò thành công')
    } else {
      // Thêm vai trò mới
      const newRole = {
        id: roles.value.length + 1,
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        usersCount: 0,
        status: 'ACTIVE',
        color: ['red', 'blue', 'green', 'orange', 'purple'][Math.floor(Math.random() * 5)]
      }
      roles.value.push(newRole)
      message.success('Thêm vai trò mới thành công')
    }

    showAddRoleModal.value = false
    editingRole.value = null
    roleForm.name = ''
    roleForm.description = ''
    roleForm.permissions = []
  } catch (error) {
    message.error('Có lỗi xảy ra khi lưu vai trò')
  } finally {
    loading.value = false
  }
}

const showRoleUsers = (role: any) => {
  const users = mockRoleUsers[role.id]
  if (users) {
    // Tạo thêm người dùng nếu số lượng hiện tại chưa đủ
    if (users.length < role.usersCount) {
      const remainingCount = role.usersCount - users.length
      const vietnameseNames = [
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'
      ]
      const middleNames = [
        'Văn', 'Thị', 'Hoàng', 'Đức', 'Minh', 'Thành', 'Quang', 'Hữu', 'Công', 'Thanh', 'Kim', 'Đình'
      ]
      const firstNames = [
        'An', 'Bình', 'Cường', 'Dũng', 'Em', 'Giang', 'Hoa', 'Hùng', 'Linh', 'Mai', 'Nam', 'Phúc', 'Quỳnh', 'Sơn', 'Thảo', 'Uyên'
      ]

      for (let i = users.length + 1; i <= role.usersCount; i++) {
        const lastName = vietnameseNames[Math.floor(Math.random() * vietnameseNames.length)]
        const middleName = middleNames[Math.floor(Math.random() * middleNames.length)]
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const fullName = `${lastName} ${middleName} ${firstName}`
        const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`

        users.push({
          id: role.id * 1000 + i,
          name: fullName,
          email: email,
          lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString('vi-VN'),
          status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE'
        })
      }
    }
    roleUsers.value = users
    showUsersDrawer.value = true
  } else {
    message.warning('Không có dữ liệu người dùng cho vai trò này')
  }
}

const removeUserFromRole = async (user: any) => {
  try {
    // Giả lập API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Cập nhật danh sách người dùng
    roleUsers.value = roleUsers.value.filter(u => u.id !== user.id)

    // Cập nhật số lượng người dùng trong vai trò
    roles.value = roles.value.map(role => {
      if (role.id === editingRole.value?.id) {
        return { ...role, usersCount: role.usersCount - 1 }
      }
      return role
    })

    message.success('Đã xóa người dùng khỏi vai trò')
  } catch (error) {
    message.error('Có lỗi xảy ra khi xóa người dùng')
  }
}

const refreshTable = () => {
  loading.value = true
  // Giả lập API call
  setTimeout(() => {
    // Cập nhật lại dữ liệu ngẫu nhiên
    roles.value = roles.value.map(role => ({
      ...role,
      usersCount: Math.floor(Math.random() * 20) + 1
    }))
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 1000)
}

// Thêm các computed properties để hỗ trợ lọc và tìm kiếm
const filteredRoles = computed(() => {
  return roles.value.filter(role => {
    const matchSearch = !searchText.value ||
      role.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      role.description.toLowerCase().includes(searchText.value.toLowerCase())

    const matchStatus = !filterStatus.value || role.status === filterStatus.value

    return matchSearch && matchStatus
  })
})

// Watch để theo dõi thay đổi của searchText và filterStatus
watch([searchText, filterStatus], () => {
  selectedKeys.value = []
})

// Page Meta
definePageMeta({
  layout: 'admin'
})

// Bổ sung mockRoleUsers cho tất cả các vai trò
const mockRoleUsers = {
  1: [ // Admin users
    { id: 1, name: 'Nguyễn Văn An', email: 'nguyenvanan@example.com', lastLogin: '2024-03-21 09:00', status: 'ACTIVE' },
    { id: 2, name: 'Trần Thị Bình', email: 'tranbinhhr@example.com', lastLogin: '2024-03-21 08:30', status: 'ACTIVE' },
    { id: 3, name: 'Lê Hoàng Cường', email: 'cuongle@example.com', lastLogin: '2024-03-21 07:45', status: 'ACTIVE' },
    { id: 4, name: 'Phạm Minh Đức', email: 'ducpham@example.com', lastLogin: '2024-03-20 17:20', status: 'ACTIVE' },
    { id: 5, name: 'Hoàng Thị Em', email: 'emhoang@example.com', lastLogin: '2024-03-20 16:15', status: 'ACTIVE' }
  ],
  2: [ // Manager users
    { id: 6, name: 'Vũ Thị Hoa', email: 'hoavu@example.com', lastLogin: '2024-03-21 10:00', status: 'ACTIVE' },
    { id: 7, name: 'Đặng Văn Giang', email: 'giangdv@example.com', lastLogin: '2024-03-21 09:45', status: 'ACTIVE' },
    { id: 8, name: 'Bùi Thị Hương', email: 'huongbui@example.com', lastLogin: '2024-03-21 09:30', status: 'ACTIVE' },
    { id: 9, name: 'Ngô Văn Hùng', email: 'hungnv@example.com', lastLogin: '2024-03-21 08:20', status: 'ACTIVE' },
    { id: 10, name: 'Trịnh Kim Liên', email: 'lientk@example.com', lastLogin: '2024-03-20 17:45', status: 'ACTIVE' },
    { id: 11, name: 'Mai Văn Nam', email: 'nammv@example.com', lastLogin: '2024-03-20 16:30', status: 'ACTIVE' },
    { id: 12, name: 'Lý Thị Ngọc', email: 'ngoclt@example.com', lastLogin: '2024-03-20 15:15', status: 'ACTIVE' },
    { id: 13, name: 'Phan Văn Phúc', email: 'phucpv@example.com', lastLogin: '2024-03-20 14:20', status: 'INACTIVE' }
  ],
  3: [ // Support users
    { id: 14, name: 'Đỗ Thị Quỳnh', email: 'quynhdt@example.com', lastLogin: '2024-03-21 08:15', status: 'ACTIVE' },
    { id: 15, name: 'Hồ Văn Sơn', email: 'sonhv@example.com', lastLogin: '2024-03-21 10:30', status: 'ACTIVE' },
    { id: 16, name: 'Lê Thị Thảo', email: 'thaolt@example.com', lastLogin: '2024-03-21 09:45', status: 'ACTIVE' },
    { id: 17, name: 'Nguyễn Văn Tùng', email: 'tungnv@example.com', lastLogin: '2024-03-21 09:00', status: 'ACTIVE' },
    { id: 18, name: 'Trần Thị Uyên', email: 'uyentt@example.com', lastLogin: '2024-03-21 08:30', status: 'ACTIVE' },
    { id: 19, name: 'Phạm Văn Việt', email: 'vietpv@example.com', lastLogin: '2024-03-20 17:15', status: 'ACTIVE' },
    { id: 20, name: 'Hoàng Thị Xuân', email: 'xuanht@example.com', lastLogin: '2024-03-20 16:45', status: 'ACTIVE' },
    { id: 21, name: 'Vũ Văn Yên', email: 'yenvv@example.com', lastLogin: '2024-03-20 15:30', status: 'ACTIVE' },
    { id: 22, name: 'Đặng Thị Ánh', email: 'anhdt@example.com', lastLogin: '2024-03-20 14:15', status: 'ACTIVE' },
    { id: 23, name: 'Bùi Văn Bảo', email: 'baobv@example.com', lastLogin: '2024-03-20 13:45', status: 'ACTIVE' },
    { id: 24, name: 'Ngô Thị Cúc', email: 'cucnt@example.com', lastLogin: '2024-03-20 13:00', status: 'INACTIVE' },
    { id: 25, name: 'Trịnh Văn Dũng', email: 'dungtv@example.com', lastLogin: '2024-03-20 12:30', status: 'INACTIVE' }
  ],
  4: [ // Accountant users
    { id: 26, name: 'Nguyễn Thị Kế', email: 'kent@example.com', lastLogin: '2024-03-21 09:15', status: 'ACTIVE' },
    { id: 27, name: 'Trần Văn Toán', email: 'toantv@example.com', lastLogin: '2024-03-21 08:45', status: 'ACTIVE' },
    { id: 28, name: 'Lê Thị Thu', email: 'thult@example.com', lastLogin: '2024-03-21 08:00', status: 'ACTIVE' },
    { id: 29, name: 'Phạm Đức Tài', email: 'taipd@example.com', lastLogin: '2024-03-20 17:30', status: 'ACTIVE' },
    { id: 30, name: 'Hoàng Văn Quỹ', email: 'quyhv@example.com', lastLogin: '2024-03-20 16:45', status: 'ACTIVE' },
    { id: 31, name: 'Đặng Thị Sổ', email: 'sodt@example.com', lastLogin: '2024-03-20 15:30', status: 'INACTIVE' }
  ],
  5: [ // Auditor users
    { id: 32, name: 'Nguyễn Văn Kiểm', email: 'kiemnv@example.com', lastLogin: '2024-03-21 09:30', status: 'ACTIVE' },
    { id: 33, name: 'Trần Thị Soát', email: 'soattt@example.com', lastLogin: '2024-03-21 08:45', status: 'ACTIVE' },
    { id: 34, name: 'Lê Văn Tra', email: 'tralv@example.com', lastLogin: '2024-03-21 08:15', status: 'ACTIVE' },
    { id: 35, name: 'Phạm Thị Xét', email: 'xetpt@example.com', lastLogin: '2024-03-20 17:00', status: 'INACTIVE' }
  ],
  6: [ // Marketing users
    { id: 36, name: 'Nguyễn Thị Quảng', email: 'quangnt@example.com', lastLogin: '2024-03-21 09:45', status: 'ACTIVE' },
    { id: 37, name: 'Trần Văn Cáo', email: 'caotv@example.com', lastLogin: '2024-03-21 09:00', status: 'ACTIVE' },
    { id: 38, name: 'Lê Thị Bá', email: 'balt@example.com', lastLogin: '2024-03-21 08:30', status: 'ACTIVE' },
    { id: 39, name: 'Phạm Văn Thị', email: 'thipv@example.com', lastLogin: '2024-03-20 17:45', status: 'ACTIVE' },
    { id: 40, name: 'Hoàng Thị Truyền', email: 'truyenht@example.com', lastLogin: '2024-03-20 16:30', status: 'ACTIVE' },
    { id: 41, name: 'Đặng Văn Thông', email: 'thongdv@example.com', lastLogin: '2024-03-20 15:45', status: 'ACTIVE' },
    { id: 42, name: 'Bùi Thị Tiếp', email: 'tiepbt@example.com', lastLogin: '2024-03-20 15:00', status: 'INACTIVE' }
  ],
  7: [ // Sales users
    { id: 43, name: 'Nguyễn Văn Bán', email: 'bannv@example.com', lastLogin: '2024-03-21 10:00', status: 'ACTIVE' },
    { id: 44, name: 'Trần Thị Hàng', email: 'hangtt@example.com', lastLogin: '2024-03-21 09:30', status: 'ACTIVE' },
    { id: 45, name: 'Lê Văn Kính', email: 'kinhlv@example.com', lastLogin: '2024-03-21 09:00', status: 'ACTIVE' },
    { id: 46, name: 'Phạm Thị Doanh', email: 'doanhpt@example.com', lastLogin: '2024-03-21 08:45', status: 'ACTIVE' },
    { id: 47, name: 'Hoàng Văn Thu', email: 'thuhv@example.com', lastLogin: '2024-03-21 08:15', status: 'ACTIVE' },
    { id: 48, name: 'Đặng Thị Lợi', email: 'loidt@example.com', lastLogin: '2024-03-20 17:30', status: 'ACTIVE' },
    { id: 49, name: 'Bùi Văn Nhuận', email: 'nhuanbv@example.com', lastLogin: '2024-03-20 17:00', status: 'ACTIVE' },
    { id: 50, name: 'Ngô Thị Tế', email: 'tent@example.com', lastLogin: '2024-03-20 16:45', status: 'ACTIVE' },
    { id: 51, name: 'Dương Văn Thương', email: 'thuongdv@example.com', lastLogin: '2024-03-20 16:15', status: 'ACTIVE' },
    { id: 52, name: 'Lý Thị Mại', email: 'mailt@example.com', lastLogin: '2024-03-20 15:45', status: 'ACTIVE' },
    { id: 53, name: 'Phan Văn Thành', email: 'thanhpv@example.com', lastLogin: '2024-03-20 15:30', status: 'ACTIVE' },
    { id: 54, name: 'Vũ Thị Công', email: 'congvt@example.com', lastLogin: '2024-03-20 15:00', status: 'ACTIVE' },
    { id: 55, name: 'Võ Văn Lực', email: 'lucvv@example.com', lastLogin: '2024-03-20 14:30', status: 'ACTIVE' },
    { id: 56, name: 'Đỗ Thị Phát', email: 'phatdt@example.com', lastLogin: '2024-03-20 14:00', status: 'INACTIVE' },
    { id: 57, name: 'Hồ Văn Đạt', email: 'dathv@example.com', lastLogin: '2024-03-20 13:30', status: 'INACTIVE' }
  ],
  8: [ // Guest users - thêm 25 người dùng
    { id: 58, name: 'Nguyễn Thị Khách', email: 'khachnt@example.com', lastLogin: '2024-03-21 10:15', status: 'ACTIVE' },
    // Thêm 24 người dùng khách khác với mẫu tương tự
  ],
  9: [ // Developer users
    { id: 83, name: 'Nguyễn Văn Code', email: 'codenv@example.com', lastLogin: '2024-03-21 09:45', status: 'ACTIVE' },
    { id: 84, name: 'Trần Thị Dev', email: 'devtt@example.com', lastLogin: '2024-03-21 09:15', status: 'ACTIVE' },
    { id: 85, name: 'Lê Văn Git', email: 'gitlv@example.com', lastLogin: '2024-03-21 08:45', status: 'ACTIVE' }
  ]
}

// Cập nhật cấu hình cột cho bảng users
const userColumns = [
  {
    title: 'Tên người dùng',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    width: 200
  },
  {
    title: 'Đăng nhập cuối',
    dataIndex: 'lastLogin',
    key: 'lastLogin',
    width: 150
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ text }) => {
      return h(Tag, {
        color: text === 'ACTIVE' ? 'success' : 'default'
      }, () => text === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động')
    }
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 100,
    fixed: 'right',
    customRender: ({ record }) => {
      return h('div', { class: 'space-x-2' }, [
        h(AButton, {
          type: 'link',
          danger: true,
          onClick: () => removeUserFromRole(record)
        }, () => 'Xóa')
      ])
    }
  }
]

// Thêm hàm cập nhật số liệu realtime
const updateRealtimeStats = () => {
  const hour = new Date().getHours()
  let activityMultiplier = 1

  if (hour >= 9 && hour <= 11) activityMultiplier = 1.5
  else if (hour >= 13 && hour <= 16) activityMultiplier = 1.3
  else if (hour >= 22 || hour <= 5) activityMultiplier = 0.3

  roleStats.value = roleStats.value.map(stat => {
    let newValue = stat.value
    let newTrend = stat.trend

    switch (stat.title) {
      case 'Tổng số vai trò':
        if (Math.random() > 0.9) {
          newValue += Math.floor(Math.random() * 2) * activityMultiplier
          newTrend = +(Math.random() * 3 + 10).toFixed(1)
        }
        break
      case 'Vai trò hoạt động':
        if (Math.random() > 0.8) {
          const change = Math.random() > 0.5 ? 1 : -1
          newValue = Math.max(0, newValue + change)
          newTrend = +(Math.random() * 5 + 3).toFixed(1)
        }
        break
      case 'Phân quyền mới':
        if (Math.random() > 0.7) {
          newValue += Math.floor(Math.random() * 3) * activityMultiplier
          newTrend = +(Math.random() * 8 + 15).toFixed(1)
        }
        break
      case 'Yêu cầu chờ duyệt':
        if (Math.random() > 0.85) {
          const change = Math.random() > 0.6 ? 1 : -1
          newValue = Math.max(0, newValue + change)
          newTrend = +(Math.random() * 10 - 5).toFixed(1)
        }
        break
    }

    return {
      ...stat,
      value: newValue,
      trend: newTrend
    }
  })
}

// Thêm vào onMounted
onMounted(() => {
  const statsInterval = setInterval(updateRealtimeStats, 1000)

  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})
</script>

<style scoped>
.ant-statistic-content {
  font-size: 24px;
}
</style>
