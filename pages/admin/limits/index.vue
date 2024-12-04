<template>
  <div class="p-6">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Hạn mức giao dịch</h1>
        <p class="text-gray-500">Quản lý hạn mức giao dịch cho người dùng và hệ thống</p>
      </div>
      <div class="space-x-3">
        <AButton @click="handleSystemLimits">
          <template #icon><SettingOutlined /></template>
          Cấu hình hệ thống
        </AButton>
        <AButton type="primary" @click="showAddModal = true">
          <template #icon><PlusOutlined /></template>
          Thêm hạn mức mới
        </AButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <ACard v-for="stat in stats" :key="stat.title" hoverable>
        <AStatistic
            :title="stat.title"
            :value="stat.value"
            :precision="stat.precision"
            :valueStyle="{ color: stat.color }"
        >
          <template #prefix>
            <component :is="stat.icon" />
          </template>
          <template #suffix>
            <small :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ stat.trend >= 0 ? '+' : ''}}{{ stat.trend }}%
            </small>
          </template>
        </AStatistic>
      </ACard>
    </div>

    <!-- Filters Section -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex justify-between gap-4">
        <div class="flex gap-4 flex-1">
          <AInputSearch v-model:value="searchText" placeholder="Tìm kiếm theo tên, email..." class="max-w-xs" @search="handleSearch" />
          <ASelect v-model:value="filters.type" placeholder="Loại giao dịch" class="w-40">
            <ASelectOption v-for="type in transactionTypes" :key="type.value" :value="type.value">{{ type.label }}</ASelectOption>
          </ASelect>
          <ASelect v-model:value="filters.status" placeholder="Trạng thái" class="w-40">
            <ASelectOption value="ACTIVE">Đang áp dụng</ASelectOption>
            <ASelectOption value="INACTIVE">Tạm dừng</ASelectOption>
          </ASelect>
        </div>
        <div class="flex gap-2">
          <AButton @click="handleRefresh"><template #icon><ReloadOutlined /></template></AButton>
          <AButton @click="handleExport"><template #icon><DownloadOutlined /></template>Xuất báo cáo</AButton>
        </div>
      </div>
    </div>

    <!-- Limits Table -->
    <ATable :columns="columns" :dataSource="filteredLimits" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user'">
          <div class="flex items-center">
            <AAvatar :src="record.user.avatar" class="mr-2" />
            <div>
              <div class="font-medium">{{ record.user.name }}</div>
              <div class="text-xs text-gray-500">{{ record.user.email }}</div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'daily_limit'">
          {{ formatCurrency(record.daily_limit) }}
          <AProgressLine
              :percent="(record.daily_used / record.daily_limit) * 100"
              :strokeColor="getProgressColor(record.daily_used, record.daily_limit)"
              class="w-24 ml-2"
          />
        </template>
        <template v-if="column.key === 'monthly_limit'">
          {{ formatCurrency(record.monthly_limit) }}
          <AProgressLine
              :percent="(record.monthly_used / record.monthly_limit) * 100"
              :strokeColor="getProgressColor(record.monthly_used, record.monthly_limit)"
              class="w-24 ml-2"
          />
        </template>
        <template v-if="column.key === 'status'">
          <ATag :color="record.status === 'ACTIVE' ? 'success' : 'error'">
            {{ record.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm dừng' }}
          </ATag>
        </template>
        <template v-if="column.key === 'action'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="handleEdit(record)">
              <template #icon><EditOutlined /></template>
            </AButton>
            <AButton type="link" size="small" @click="handleHistory(record)">
              <template #icon><HistoryOutlined /></template>
            </AButton>
            <AButton
                type="link"
                size="small"
                :danger="record.status === 'ACTIVE'"
                @click="handleToggleStatus(record)"
            >
              <template #icon><PoweroffOutlined /></template>
            </AButton>
          </div>
        </template>
      </template>
    </ATable>

    <!-- Add/Edit Modal -->
    <AModal
        v-model:visible="showAddModal"
        :title="editingLimit ? 'Chỉnh sửa hạn mức' : 'Thêm hạn mức mới'"
        @ok="handleSubmit"
    >
      <AForm :model="formState" layout="vertical">
        <AFormItem label="Người dùng" required>
          <ASelect
              v-model:value="formState.user_id"
              placeholder="Chọn người dùng"
              :options="userOptions"
              show-search
              :filter-option="filterOption"
          />
        </AFormItem>
        <AFormItem label="Loại giao dịch" required>
          <ASelect v-model:value="formState.transaction_type">
            <ASelectOption v-for="type in transactionTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </ASelectOption>
          </ASelect>
        </AFormItem>
        <div class="flex gap-4">
          <AFormItem label="Hạn mức ngày" class="flex-1" required>
            <AInputNumber
                v-model:value="formState.daily_limit"
                class="w-full"
                :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                :min="0"
                :step="1000000"
            />
          </AFormItem>
          <AFormItem label="Hạn mức tháng" class="flex-1" required>
            <AInputNumber
                v-model:value="formState.monthly_limit"
                class="w-full"
                :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                :min="0"
                :step="1000000"
            />
          </AFormItem>
        </div>
        <AFormItem label="Ghi chú">
          <ATextarea v-model:value="formState.note" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- History Drawer -->
    <ADrawer
        v-model:visible="showHistoryDrawer"
        title="Lịch sử thay đổi hạn mức"
        width="600"
    >
      <ATimeline>
        <ATimelineItem v-for="item in selectedHistory" :key="item.id">
          <template #dot>
            <component :is="getHistoryIcon(item.action)" :style="{color: getHistoryColor(item.action)}" />
          </template>
          <div class="flex justify-between">
            <div>
              <div class="font-medium">{{ item.action_text }}</div>
              <div class="text-sm text-gray-500">{{ item.detail }}</div>
            </div>
            <div class="text-xs text-gray-400">{{ formatDateTime(item.created_at) }}</div>
          </div>
        </ATimelineItem>
      </ATimeline>
    </ADrawer>

    <!-- System Limits Modal -->
    <AModal
        v-model:visible="showSystemModal"
        title="Cấu hình hạn mức hệ thống"
        width="800"
    >
      <ATable :columns="systemLimitColumns" :dataSource="systemLimits" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'limit'">
            <AInputNumber
                v-model:value="record.limit"
                :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                :min="0"
                :step="1000000"
            />
          </template>
        </template>
      </ATable>
      <template #footer>
        <AButton type="primary" @click="handleSaveSystemLimits">Lưu thay đổi</AButton>
      </template>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import {
  SettingOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined,
  EditOutlined, HistoryOutlined, PoweroffOutlined,
  TransactionOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

// Mock Data
const generateAvatar = (seed: string) => {
  // Các style có thể dùng: 'adventurer', 'avataaars', 'bottts', 'initials', 'micah'
  const style = 'avataaars' 
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

const mockLimits = [
  {
    id: 1,
    user: {
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      avatar: generateAvatar('Nguyễn Văn A')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 50000000,
    daily_used: 20000000,
    monthly_limit: 1000000000,
    monthly_used: 350000000,
    status: 'ACTIVE',
    created_at: '2024-03-20'
  },
  {
    id: 2, 
    user: {
      name: 'Trần Thị B',
      email: 'tranthib@gmail.com', 
      avatar: generateAvatar('Trần Thị B')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 20000000,
    daily_used: 18000000,
    monthly_limit: 500000000,
    monthly_used: 200000000,
    status: 'ACTIVE',
    created_at: '2024-03-19'
  },
  {
    id: 3,
    user: {
      name: 'Công ty TNHH Phát Đạt',
      email: 'info@phatdat.com',
      avatar: generateAvatar('Công ty TNHH Phát Đạt')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 200000000,
    daily_used: 150000000,
    monthly_limit: 5000000000,
    monthly_used: 2500000000,
    status: 'ACTIVE',
    created_at: '2024-03-18'
  },
  {
    id: 4,
    user: {
      name: 'Lê Thị Hương',
      email: 'lehuong@gmail.com',
      avatar: generateAvatar('Lê Thị Hương')
    },
    transaction_type: 'DEPOSIT',
    daily_limit: 100000000,
    daily_used: 25000000,
    monthly_limit: 2000000000,
    monthly_used: 800000000,
    status: 'INACTIVE',
    created_at: '2024-03-17'
  },
  {
    id: 5,
    user: {
      name: 'Phạm Văn Minh',
      email: 'pvanminh@gmail.com',
      avatar: generateAvatar('Phạm Văn Minh')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 30000000,
    daily_used: 28000000,
    monthly_limit: 800000000,
    monthly_used: 600000000,
    status: 'ACTIVE',
    created_at: '2024-03-16'
  },
  {
    id: 6,
    user: {
      name: 'Công ty CP Thương mại Sài Gòn',
      email: 'contact@saigontrade.com',
      avatar: generateAvatar('Công ty CP Thương mại Sài Gòn')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 500000000,
    daily_used: 320000000,
    monthly_limit: 10000000000,
    monthly_used: 7000000000,
    status: 'ACTIVE',
    created_at: '2024-03-15'
  },
  {
    id: 7,
    user: {
      name: 'Đặng Thị Mai',
      email: 'dangmai@gmail.com',
      avatar: generateAvatar('Đặng Thị Mai')
    },
    transaction_type: 'DEPOSIT',
    daily_limit: 50000000,
    daily_used: 10000000,
    monthly_limit: 1000000000,
    monthly_used: 300000000,
    status: 'ACTIVE',
    created_at: '2024-03-14'
  },
  {
    id: 8,
    user: {
      name: 'Hoàng Văn Thành',
      email: 'hvthanh@gmail.com',
      avatar: generateAvatar('Hoàng Văn Thành')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 25000000,
    daily_used: 20000000,
    monthly_limit: 600000000,
    monthly_used: 450000000,
    status: 'INACTIVE',
    created_at: '2024-03-13'
  },
  {
    id: 9,
    user: {
      name: 'Nguyễn Thị Lan Anh',
      email: 'lananh@gmail.com',
      avatar: generateAvatar('Nguyễn Thị Lan Anh')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 100000000,
    daily_used: 80000000,
    monthly_limit: 2000000000,
    monthly_used: 1500000000,
    status: 'ACTIVE',
    created_at: '2024-03-12'
  },
  {
    id: 10,
    user: {
      name: 'Công ty TNHH Thương mại Điện máy ABC',
      email: 'contact@abcelectro.com.vn',
      avatar: generateAvatar('Công ty TNHH Thương mại Điện máy ABC')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 1000000000,
    daily_used: 750000000,
    monthly_limit: 20000000000,
    monthly_used: 15000000000,
    status: 'ACTIVE',
    created_at: '2024-03-11'
  },
  {
    id: 11,
    user: {
      name: 'Siêu thị Bách hóa VinMart',
      email: 'operations@vinmart.vn',
      avatar: generateAvatar('Siêu thị Bách hóa VinMart')
    },
    transaction_type: 'DEPOSIT',
    daily_limit: 2000000000,
    daily_used: 1200000000,
    monthly_limit: 50000000000,
    monthly_used: 35000000000,
    status: 'ACTIVE',
    created_at: '2024-03-10'
  },
  {
    id: 12,
    user: {
      name: 'Nhà hàng Phở 24',
      email: 'info@pho24.com.vn',
      avatar: generateAvatar('Nhà hàng Phở 24')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 50000000,
    daily_used: 35000000,
    monthly_limit: 1500000000,
    monthly_used: 900000000,
    status: 'ACTIVE',
    created_at: '2024-03-09'
  },
  {
    id: 13,
    user: {
      name: 'Công ty Du lịch Vietravel',
      email: 'booking@vietravel.com.vn',
      avatar: generateAvatar('Công ty Du lịch Vietravel')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 500000000,
    daily_used: 350000000,
    monthly_limit: 10000000000,
    monthly_used: 7000000000,
    status: 'ACTIVE',
    created_at: '2024-03-08'
  },
  {
    id: 14,
    user: {
      name: 'Trường THPT Lê Hồng Phong',
      email: 'thptlehongphong@edu.vn',
      avatar: generateAvatar('Trường THPT Lê Hồng Phong')
    },
    transaction_type: 'DEPOSIT',
    daily_limit: 200000000,
    daily_used: 50000000,
    monthly_limit: 5000000000,
    monthly_used: 2000000000,
    status: 'ACTIVE',
    created_at: '2024-03-07'
  },
  {
    id: 15,
    user: {
      name: 'Bệnh viện Đa khoa Trung ương',
      email: 'info@centralhosp.vn',
      avatar: generateAvatar('Bệnh viện Đa khoa Trung ương')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 1000000000,
    daily_used: 800000000,
    monthly_limit: 30000000000,
    monthly_used: 20000000000,
    status: 'ACTIVE',
    created_at: '2024-03-06'
  },
  {
    id: 16,
    user: {
      name: 'Công ty Xây dựng Hoàng Gia',
      email: 'contact@hoanggia.com.vn',
      avatar: generateAvatar('Công ty Xây dựng Hoàng Gia')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 300000000,
    daily_used: 250000000,
    monthly_limit: 8000000000,
    monthly_used: 6000000000,
    status: 'INACTIVE',
    created_at: '2024-03-05'
  },
  {
    id: 17,
    user: {
      name: 'Cửa hàng Nội thất TADA',
      email: 'sales@tadafurniture.vn',
      avatar: generateAvatar('Cửa hàng Nội thất TADA')
    },
    transaction_type: 'TRANSFER',
    daily_limit: 150000000,
    daily_used: 100000000,
    monthly_limit: 3000000000,
    monthly_used: 2000000000,
    status: 'ACTIVE',
    created_at: '2024-03-04'
  },
  {
    id: 18,
    user: {
      name: 'Công ty TNHH Logistics Sao Việt',
      email: 'ops@saovietlogistics.com',
      avatar: generateAvatar('Công ty TNHH Logistics Sao Việt')
    },
    transaction_type: 'DEPOSIT',
    daily_limit: 800000000,
    daily_used: 600000000,
    monthly_limit: 15000000000,
    monthly_used: 10000000000,
    status: 'ACTIVE',
    created_at: '2024-03-03'
  },
  {
    id: 19,
    user: {
      name: 'Nhà thuốc Long Châu',
      email: 'pharmacy@longchau.vn',
      avatar: generateAvatar('Nhà thuốc Long Châu')
    },
    transaction_type: 'WITHDRAW',
    daily_limit: 100000000,
    daily_used: 80000000,
    monthly_limit: 2500000000,
    monthly_used: 1800000000,
    status: 'ACTIVE',
    created_at: '2024-03-02'
  }
]

// Stats Data
const stats = [
  {
    title: 'Tổng hạn mức',
    value: 15,
    precision: 0,
    color: '#1890ff',
    trend: 5.2,
    icon: TransactionOutlined
  },
  {
    title: 'Cảnh báo vượt hạn mức',
    value: 3,
    precision: 0,
    color: '#faad14',
    trend: -2.1,
    icon: WarningOutlined
  },
  {
    title: 'Tỷ lệ tuân thủ',
    value: 92.5,
    precision: 1,
    color: '#52c41a',
    trend: 1.5,
    icon: CheckCircleOutlined
  },
  {
    title: 'Đang chờ duyệt',
    value: 5,
    precision: 0,
    color: '#722ed1',
    trend: 0,
    icon: ClockCircleOutlined
  }
]

// State
const loading = ref(false)
const searchText = ref('')
const showAddModal = ref(false)
const showHistoryDrawer = ref(false)
const showSystemModal = ref(false)
const limits = ref(mockLimits)
const editingLimit = ref(null)
const selectedHistory = ref([])

const filters = reactive({
  type: undefined,
  status: undefined
})

const formState = reactive({
  user_id: undefined,
  transaction_type: undefined,
  daily_limit: 0,
  monthly_limit: 0,
  note: ''
})

// Constants
const transactionTypes = [
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'WITHDRAW', label: 'Rút tiền' },
  { value: 'DEPOSIT', label: 'Nạp tiền' }
]

const columns = [
  { title: 'Người dùng', key: 'user', width: 250 },
  { title: 'Loại GD', dataIndex: 'transaction_type', key: 'transaction_type' },
  { title: 'Hạn mức ngày', key: 'daily_limit' },
  { title: 'Hạn mức tháng', key: 'monthly_limit' },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: 'Thao tác', key: 'action', width: 120 }
]

// Methods
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('vi-VN')
}

const getProgressColor = (used: number, limit: number) => {
  const percentage = (used / limit) * 100
  if (percentage >= 90) return '#ff4d4f'
  if (percentage >= 70) return '#faad14'
  return '#52c41a'
}

const handleSearch = () => {
  // Implement search
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 500)
}

const handleExport = () => {
  message.success('Đang xuất báo cáo')
}
const handleEdit = (record: any) => {
  editingLimit.value = record
  formState.user_id = record.user.id
  formState.transaction_type = record.transaction_type
  formState.daily_limit = record.daily_limit
  formState.monthly_limit = record.monthly_limit
  formState.note = record.note
  showAddModal.value = true
}

const handleHistory = (record: any) => {
  selectedHistory.value = [
    {
      id: 1,
      action: 'CREATE',
      action_text: 'Tạo hạn mức',
      detail: 'Tạo mới hạn mức chuyển khoản',
      created_at: '2024-11-20T10:00:00Z'
    },
    {
      id: 2,
      action: 'UPDATE',
      action_text: 'Cập nhật hạn mức ngày',
      detail: 'Thay đổi từ 30.000.000₫ thành 50.000.000₫',
      created_at: '2024-11-20T11:30:00Z'
    },
    {
      id: 3,
      action: 'PAUSE',
      action_text: 'Tạm dừng hạn mức',
      detail: 'Tạm dừng do yêu cầu từ người dùng',
      created_at: '2024-11-21T09:15:00Z'
    },
    {
      id: 4,
      action: 'RESUME',
      action_text: 'Kích hoạt lại hạn mức',
      detail: 'Kích hoạt lại sau khi xác minh',
      created_at: '2024-11-21T14:20:00Z'
    }
  ]
  showHistoryDrawer.value = true
}

const handleToggleStatus = (record: any) => {
  const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  limits.value = limits.value.map(limit =>
      limit.id === record.id ? { ...limit, status: newStatus } : limit
  )
  message.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} hạn mức`)
}

const handleSubmit = () => {
  if (!formState.user_id || !formState.transaction_type || !formState.daily_limit || !formState.monthly_limit) {
    message.error('Vui lòng điền đầy đủ thông tin')
    return
  }

  if (formState.monthly_limit < formState.daily_limit) {
    message.error('Hạn mức tháng phải lớn hơn hạn mức ngày')
    return
  }

  if (editingLimit.value) {
    limits.value = limits.value.map(limit =>
        limit.id === editingLimit.value.id
            ? {
              ...limit,
              transaction_type: formState.transaction_type,
              daily_limit: formState.daily_limit,
              monthly_limit: formState.monthly_limit
            }
            : limit
    )
    message.success('Cập nhật hạn mức thành công')
  } else {
    const newLimit = {
      id: limits.value.length + 1,
      user: userOptions.find(user => user.value === formState.user_id),
      transaction_type: formState.transaction_type,
      daily_limit: formState.daily_limit,
      daily_used: 0,
      monthly_limit: formState.monthly_limit,
      monthly_used: 0,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    }
    limits.value.unshift(newLimit)
    message.success('Thêm hạn mức mới thành công')
  }

  showAddModal.value = false
  resetForm()
}

const resetForm = () => {
  formState.user_id = undefined
  formState.transaction_type = undefined
  formState.daily_limit = 0
  formState.monthly_limit = 0
  formState.note = ''
  editingLimit.value = null
}

const handleSystemLimits = () => {
  showSystemModal.value = true
}

const handleSaveSystemLimits = () => {
  message.success('Đã lưu cấu hình hạn mức hệ thống')
  showSystemModal.value = false
}

// Utility functions
const getHistoryIcon = (action: string) => {
  const icons = {
    CREATE: PlusOutlined,
    UPDATE: EditOutlined,
    PAUSE: PoweroffOutlined,
    RESUME: CheckCircleOutlined
  }
  return icons[action] || CheckCircleOutlined
}

const getHistoryColor = (action: string) => {
  const colors = {
    CREATE: '#52c41a',
    UPDATE: '#1890ff',
    PAUSE: '#ff4d4f',
    RESUME: '#52c41a'
  }
  return colors[action] || '#1890ff'
}

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// Mock user options
const userOptions = [
  { value: 1, label: 'Nguyễn Văn A' },
  { value: 2, label: 'Trần Thị B' },
  { value: 3, label: 'Lê Văn C' },
  { value: 4, label: 'Phạm Thị D' }
]

// System limits configuration
const systemLimits = ref([
  {
    key: 'TRANSFER_BASIC',
    name: 'Chuyển khoản - Tài khoản thường',
    daily: 50000000,
    monthly: 1000000000
  },
  {
    key: 'TRANSFER_PREMIUM',
    name: 'Chuyển khoản - Tài khoản Premium',
    daily: 200000000,
    monthly: 5000000000
  },
  {
    key: 'WITHDRAW_BASIC',
    name: 'Rút tiền - Tài khoản thường',
    daily: 20000000,
    monthly: 500000000
  },
  {
    key: 'WITHDRAW_PREMIUM',
    name: 'Rút tiền - Tài khoản Premium',
    daily: 100000000,
    monthly: 2000000000
  }
])

const systemLimitColumns = [
  { title: 'Loại hạn mức', dataIndex: 'name', key: 'name' },
  { title: 'Hạn mức ngày', key: 'daily' },
  { title: 'Hạn mức tháng', key: 'monthly' }
]

// Computed
const filteredLimits = computed(() => {
  return limits.value.filter(limit => {
    const matchesSearch = !searchText.value ||
        limit.user.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        limit.user.email.toLowerCase().includes(searchText.value.toLowerCase())
    const matchesType = !filters.type || limit.transaction_type === filters.type
    const matchesStatus = !filters.status || limit.status === filters.status
    return matchesSearch && matchesType && matchesStatus
  })
})

// Thêm hàm cập nhật số liệu realtime
const updateRealtimeStats = () => {
  const hour = new Date().getHours()
  let activityMultiplier = 1

  // Điều chỉnh hệ số hoạt động theo giờ
  if (hour >= 9 && hour <= 11) activityMultiplier = 1.5 // Cao điểm sáng
  else if (hour >= 13 && hour <= 16) activityMultiplier = 1.3 // Cao điểm chiều
  else if (hour >= 22 || hour <= 5) activityMultiplier = 0.3 // Đêm khuya

  // Cập nhật số liệu thống kê
  stats.forEach(stat => {
    switch(stat.title) {
      case 'Tổng hạn mức':
        if (Math.random() > 0.7) { // 30% cơ hội tăng
          stat.value += Math.floor(Math.random() * 2) * activityMultiplier
          stat.trend = +(Math.random() * 2 + 4).toFixed(1)
        }
        break
      case 'Cảnh báo vượt hạn mức':
        if (Math.random() > 0.8) { // 20% cơ hội thay đổi
          const change = Math.random() > 0.5 ? 1 : -1
          stat.value = Math.max(0, stat.value + change)
          stat.trend = +(Math.random() * 4 - 2).toFixed(1)
        }
        break
      case 'Tỷ lệ tuân thủ':
        stat.value = +(92 + Math.random() * 3).toFixed(1) // Dao động 92-95%
        stat.trend = +(Math.random() * 3).toFixed(1)
        break
      case 'Đang chờ duyệt':
        if (Math.random() > 0.8) { // 20% cơ hội thay đổi
          const change = Math.random() > 0.6 ? 1 : -1
          stat.value = Math.max(0, stat.value + change)
        }
        break
    }
  })

  // Cập nhật số liệu sử dụng hạn mức
  limits.value.forEach(limit => {
    if (limit.status === 'ACTIVE') {
      // Tăng số tiền đã sử dụng theo thời gian thực
      const dailyIncrease = Math.floor(Math.random() * 1000000 * activityMultiplier)
      const monthlyIncrease = dailyIncrease

      limit.daily_used = Math.min(limit.daily_limit, limit.daily_used + dailyIncrease)
      limit.monthly_used = Math.min(limit.monthly_limit, limit.monthly_used + monthlyIncrease)
    }
  })
}

// Lifecycle
onMounted(() => {
  // Cập nhật số liệu mỗi giây
  const statsInterval = setInterval(updateRealtimeStats, 1000)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})

definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.ant-progress-line {
  margin-bottom: 0 !important;
}

.ant-timeline {
  max-height: 400px;
  overflow-y: auto;
}
</style>
