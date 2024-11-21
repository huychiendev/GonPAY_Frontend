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
            <PlusOutlined/>
          </template>
          Thêm vai trò mới
        </AButton>
        <AButton @click="handleBulkOperation">
          <template #icon>
            <SettingOutlined/>
          </template>
          Thao tác hàng loạt
        </AButton>
      </div>
    </div>

    <!-- Stats Cards -->
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

    <!-- Role Management Table -->
    <ACard :bordered="false">
      <div class="flex justify-between mb-4">
        <div class="flex space-x-4">
          <AInput
              v-model:value="searchText"
              placeholder="Tìm kiếm vai trò/người dùng"
              style="width: 300px"
          >
            <template #prefix>
              <SearchOutlined/>
            </template>
          </AInput>
          <ASelect
              v-model:value="filterStatus"
              style="width: 200px"
              placeholder="Trạng thái"
          >
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="ACTIVE">Đang hoạt động</ASelectOption>
            <ASelectOption value="INACTIVE">Đã vô hiệu</ASelectOption>
          </ASelect>
        </div>
        <div>
          <AButton type="link" @click="refreshTable">
            <template #icon>
              <ReloadOutlined/>
            </template>
            Làm mới
          </AButton>
        </div>
      </div>

      <ATable
          :columns="columns"
          :data-source="roles"
          :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
          :loading="loading"
      >
        <!-- Role Name Column -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="flex items-center">
              <ATag :color="record.color">{{ record.name }}</ATag>
              <span class="ml-2">{{ record.description }}</span>
            </div>
          </template>

          <!-- Permissions Column -->
          <template v-else-if="column.key === 'permissions'">
            <div class="space-x-1">
              <ATag v-for="perm in record.permissions" :key="perm" color="blue">
                {{ perm }}
              </ATag>
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
            <ABadge :status="record.status === 'ACTIVE' ? 'success' : 'default'"/>
            {{ record.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu' }}
          </template>

          <!-- Actions Column -->
          <template v-else-if="column.key === 'actions'">
            <div class="space-x-2">
              <AButton type="link" @click="editRole(record)">
                <template #icon>
                  <EditOutlined/>
                </template>
              </AButton>
              <AButton type="link" @click="showPermissions(record)">
                <template #icon>
                  <KeyOutlined/>
                </template>
              </AButton>
              <APopconfirm
                  :title="'Bạn có chắc muốn ' + (record.status === 'ACTIVE' ? 'vô hiệu hóa' : 'kích hoạt') + ' vai trò này?'"
                  @confirm="toggleRoleStatus(record)"
              >
                <AButton type="link" :danger="record.status === 'ACTIVE'">
                  <template #icon>
                    <PoweroffOutlined/>
                  </template>
                </AButton>
              </APopconfirm>
            </div>
          </template>
        </template>
      </ATable>
    </ACard>

    <!-- Add/Edit Role Modal -->
    <AModal
        v-model:visible="showAddRoleModal"
        :title="editingRole ? 'Chỉnh sửa vai trò' : 'Thêm vai trò mới'"
        @ok="handleRoleSubmit"
    >
      <AForm :model="roleForm" layout="vertical">
        <AFormItem label="Tên vai trò" required>
          <AInput v-model:value="roleForm.name"/>
        </AFormItem>
        <AFormItem label="Mô tả">
          <ATextarea v-model:value="roleForm.description"/>
        </AFormItem>
        <AFormItem label="Quyền hạn" required>
          <ATree
              v-model:checkedKeys="roleForm.permissions"
              :tree-data="permissionTree"
              checkable
              :default-expand-all="true"
          />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Role Users Drawer -->
    <ADrawer
        v-model:visible="showUsersDrawer"
        title="Người dùng trong vai trò"
        width="600"
    >
      <ATable :columns="userColumns" :data-source="roleUsers" :pagination="{ pageSize: 5 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <APopconfirm
                title="Bạn có chắc muốn xóa người dùng khỏi vai trò này?"
                @confirm="removeUserFromRole(record)"
            >
              <AButton type="link" danger>Xóa</AButton>
            </APopconfirm>
          </template>
        </template>
      </ATable>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive} from 'vue'
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
      {text: 'Đang hoạt động', value: 'ACTIVE'},
      {text: 'Đã vô hiệu', value: 'INACTIVE'}
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
  }
])

// Permission Tree Data
const permissionTree = ref([
  {
    title: 'Quản lý người dùng',
    key: 'user-management',
    children: [
      {title: 'Xem danh sách', key: 'user-view'},
      {title: 'Thêm người dùng', key: 'user-create'},
      {title: 'Sửa thông tin', key: 'user-edit'},
      {title: 'Xóa người dùng', key: 'user-delete'}
    ]
  },
  {
    title: 'Quản lý giao dịch',
    key: 'transaction-management',
    children: [
      {title: 'Xem giao dịch', key: 'transaction-view'},
      {title: 'Phê duyệt giao dịch', key: 'transaction-approve'},
      {title: 'Hủy giao dịch', key: 'transaction-cancel'}
    ]
  },
  {
    title: 'Báo cáo & Thống kê',
    key: 'report-management',
    children: [
      {title: 'Xem báo cáo', key: 'report-view'},
      {title: 'Xuất báo cáo', key: 'report-export'},
      {title: 'Phân tích dữ liệu', key: 'report-analyze'}
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

const refreshTable = () => {
  loading.value = true
  // Simulate API call
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const handleBulkOperation = () => {
  // Implement bulk operations
}

const editRole = (role: any) => {
  editingRole.value = role
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.permissions = role.permissions
  showAddRoleModal.value = true
}

const showPermissions = (role: any) => {
  // Implement permissions view
}

const toggleRoleStatus = (role: any) => {
  // Implement status toggle
}

const handleRoleSubmit = () => {
  // Implement role submit
  showAddRoleModal.value = false
}

const showRoleUsers = (role: any) => {
  roleUsers.value = [
    {id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', lastLogin: '2024-11-18 10:00'},
    {id: 2, name: 'Trần Thị B', email: 'tranthib@gmail.com', lastLogin: '2024-11-18 09:30'}
  ]
  showUsersDrawer.value = true
}

const removeUserFromRole = (user: any) => {
  // Implement user removal
}

// Page Meta
definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.ant-statistic-content {
  font-size: 24px;
}
</style>
