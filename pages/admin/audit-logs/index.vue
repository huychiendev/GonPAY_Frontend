<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Nhật ký hoạt động</h1>
        <p class="text-gray-500">Theo dõi và kiểm tra hoạt động của người dùng trong hệ thống</p>
      </div>
      <div class="space-x-3">
        <AButton @click="handleRefresh">
          <template #icon>
            <ReloadOutlined/>
          </template>
          Làm mới
        </AButton>
        <AButton type="primary" @click="handleExport">
          <template #icon>
            <DownloadOutlined/>
          </template>
          Xuất báo cáo
        </AButton>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <ACard v-for="stat in stats" :key="stat.title">
        <AStatistic :title="stat.title" :value="stat.value" :valueStyle="{ color: stat.color }">
          <template #prefix>
            <component :is="stat.icon"/>
          </template>
          <div class="text-xs mt-1" :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}% so với hôm qua
          </div>
        </AStatistic>
      </ACard>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-wrap gap-4">
        <AInputSearch v-model:value="filters.search" placeholder="Tìm kiếm theo người dùng, hành động..." style="width: 250px" @search="handleSearch"/>
        <ASelect v-model:value="filters.action" style="width: 160px" placeholder="Loại hành động">
          <ASelectOption v-for="action in actionTypes" :key="action.value" :value="action.value">{{ action.label }}</ASelectOption>
        </ASelect>
        <ASelect v-model:value="filters.module" style="width: 150px" placeholder="Module">
          <ASelectOption v-for="module in modules" :key="module.value" :value="module.value">{{ module.label }}</ASelectOption>
        </ASelect>
        <ASelect v-model:value="filters.status" style="width: 120px" placeholder="Trạng thái">
          <ASelectOption value="SUCCESS">Thành công</ASelectOption>
          <ASelectOption value="FAILED">Thất bại</ASelectOption>
        </ASelect>
        <ARangePicker v-model:value="filters.dateRange" :show-time="true" style="width: 380px"/>
      </div>
    </div>

    <ATable :columns="columns" :dataSource="filteredLogs" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user'">
          <div class="flex items-center">
            <AAvatar :style="{ backgroundColor: getAvatarColor(record.user_name) }" class="mr-2">
              {{ getInitials(record.user_name) }}
            </AAvatar>
            <div>
              <div class="font-medium">{{ record.user_name }}</div>
              <div class="text-xs text-gray-500">{{ record.user_email }}</div>
            </div>
          </div>
        </template>

        <template v-if="column.key === 'action'">
          <div class="flex items-center">
            <div :class="getActionTypeClass(record.action)" class="p-2 rounded mr-2">
              <component :is="getActionTypeIcon(record.action)"/>
            </div>
            <div>
              <div>{{ getActionLabel(record.action) }}</div>
              <div class="text-xs text-gray-500">{{ record.module }}</div>
            </div>
          </div>
        </template>

        <template v-if="column.key === 'status'">
          <ATag :color="record.status === 'SUCCESS' ? 'success' : 'error'">
            {{ record.status === 'SUCCESS' ? 'Thành công' : 'Thất bại' }}
          </ATag>
        </template>

        <template v-if="column.key === 'operations'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="showDetails(record)">
              <template #icon>
                <EyeOutlined/>
              </template>
            </AButton>
            <AButton type="link" size="small" @click="handleCopy(record)">
              <template #icon>
                <CopyOutlined/>
              </template>
            </AButton>
          </div>
        </template>
      </template>
    </ATable>

    <ADrawer v-model:visible="detailsVisible" title="Chi tiết hoạt động" width="700">
      <template v-if="selectedLog">
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium mb-3">Thông tin chung</h3>
            <ADescriptions bordered :column="2">
              <ADescriptionsItem label="ID">{{ selectedLog.id }}</ADescriptionsItem>
              <ADescriptionsItem label="Thời gian">{{ formatDateTime(selectedLog.timestamp) }}</ADescriptionsItem>
              <ADescriptionsItem label="Người dùng">{{ selectedLog.user_name }}</ADescriptionsItem>
              <ADescriptionsItem label="Email">{{ selectedLog.user_email }}</ADescriptionsItem>
              <ADescriptionsItem label="Module">{{ selectedLog.module }}</ADescriptionsItem>
              <ADescriptionsItem label="Hành động">{{ getActionLabel(selectedLog.action) }}</ADescriptionsItem>
              <ADescriptionsItem label="IP">{{ selectedLog.ip_address }}</ADescriptionsItem>
              <ADescriptionsItem label="Thiết bị">{{ selectedLog.user_agent }}</ADescriptionsItem>
            </ADescriptions>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-3">Thay đổi dữ liệu</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="font-medium mb-2">Trước</h4>
                <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <pre class="text-sm">{{ JSON.stringify(selectedLog.old_data, null, 2) }}</pre>
                </div>
              </div>
              <div>
                <h4 class="font-medium mb-2">Sau</h4>
                <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <pre class="text-sm">{{ JSON.stringify(selectedLog.new_data, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedLog.status === 'FAILED'">
            <h3 class="text-lg font-medium mb-3">Chi tiết lỗi</h3>
            <div class="bg-red-50 p-4 rounded-lg">
              <div class="text-red-600 font-medium mb-2">{{ selectedLog.error?.message }}</div>
              <pre class="text-sm text-red-500">{{ selectedLog.error?.stack }}</pre>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-3">Metadata</h3>
            <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre class="text-sm">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </template>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed} from 'vue'
import {message} from 'ant-design-vue'
import {
  ReloadOutlined, DownloadOutlined, EyeOutlined, CopyOutlined,
  UserOutlined, EditOutlined, DeleteOutlined, LoginOutlined,
  TeamOutlined, SecurityScanOutlined, TransactionOutlined, SettingOutlined
} from '@ant-design/icons-vue'

// Stats data
const stats = [
  {
    title: 'Tổng hoạt động',
    value: 8547,
    color: '#1890ff',
    trend: 12.5,
    icon: TeamOutlined
  },
  {
    title: 'Đăng nhập/đăng ký',
    value: 245,
    color: '#52c41a',
    trend: 8.3,
    icon: LoginOutlined
  },
  {
    title: 'Giao dịch',
    value: 1234,
    color: '#722ed1',
    trend: -2.4,
    icon: TransactionOutlined
  },
  {
    title: 'Lỗi/Thất bại',
    value: 23,
    color: '#ff4d4f',
    trend: -15.7,
    icon: SecurityScanOutlined
  }
]

// Constants
const actionTypes = [
  {value: 'LOGIN', label: 'Đăng nhập'},
  {value: 'LOGOUT', label: 'Đăng xuất'},
  {value: 'CREATE', label: 'Tạo mới'},
  {value: 'UPDATE', label: 'Cập nhật'},
  {value: 'DELETE', label: 'Xóa'},
  {value: 'TRANSFER', label: 'Chuyển tiền'},
  {value: 'WITHDRAW', label: 'Rút tiền'},
  {value: 'SETTINGS', label: 'Thay đổi cài đặt'}
]

const modules = [
  {value: 'AUTH', label: 'Xác thực'},
  {value: 'USER', label: 'Người dùng'},
  {value: 'WALLET', label: 'Ví'},
  {value: 'TRANSACTION', label: 'Giao dịch'},
  {value: 'SETTINGS', label: 'Cài đặt'}
]

// Mock data
const mockLogs = [
  {
    id: 1,
    timestamp: '2024-11-21T10:15:00Z',
    user_name: 'Nguyễn Văn A',
    user_email: 'nguyenvana@example.com',
    action: 'TRANSFER',
    module: 'WALLET',
    status: 'SUCCESS',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_data: {balance: 1000000},
    new_data: {balance: 900000},
    metadata: {
      transaction_id: 'TRX123456',
      amount: 100000,
      recipient: 'Trần Thị B'
    }
  },
  {
    id: 2,
    timestamp: '2024-11-21T10:10:00Z',
    user_name: 'Admin',
    user_email: 'admin@example.com',
    action: 'UPDATE',
    module: 'USER',
    status: 'SUCCESS',
    ip_address: '192.168.1.2',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    old_data: {status: 'ACTIVE'},
    new_data: {status: 'BLOCKED'},
    metadata: {
      reason: 'Suspicious activity detected',
      affected_user: 'user123'
    }
  }
]

// State
const loading = ref(false)
const detailsVisible = ref(false)
const selectedLog = ref(null)
const logs = ref(mockLogs)

const filters = reactive({
  search: '',
  action: undefined,
  module: undefined,
  status: undefined,
  dateRange: undefined
})

// Table columns
const columns = [
  {title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp', width: 180, sorter: true},
  {title: 'Người dùng', key: 'user', width: 220},
  {title: 'Hành động', key: 'action'},
  {title: 'Trạng thái', key: 'status', width: 120},
  {title: 'Thao tác', key: 'operations', width: 100, fixed: 'right'}
]

// Utility functions
const getAvatarColor = (name: string) => {
  const colors = ['#1890ff', '#52c41a', '#722ed1', '#faad14', '#13c2c2', '#eb2f96']
  return colors[name.length % colors.length]
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const getActionTypeClass = (action: string) => {
  const classes = {
    LOGIN: 'bg-blue-100 text-blue-600',
    LOGOUT: 'bg-gray-100 text-gray-600',
    CREATE: 'bg-green-100 text-green-600',
    UPDATE: 'bg-orange-100 text-orange-600',
    DELETE: 'bg-red-100 text-red-600',
    TRANSFER: 'bg-purple-100 text-purple-600',
    WITHDRAW: 'bg-yellow-100 text-yellow-600',
    SETTINGS: 'bg-cyan-100 text-cyan-600'
  }
  return classes[action] || 'bg-gray-100 text-gray-600'
}

const getActionTypeIcon = (action: string) => {
  const icons = {
    LOGIN: LoginOutlined,
    LOGOUT: LoginOutlined,
    CREATE: UserOutlined,
    UPDATE: EditOutlined,
    DELETE: DeleteOutlined,
    TRANSFER: TransactionOutlined,
    WITHDRAW: TransactionOutlined,
    SETTINGS: SettingOutlined
  }
  return icons[action] || UserOutlined
}

const getActionLabel = (action: string) => {
  return actionTypes.find(t => t.value === action)?.label || action
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('vi-VN')
}

// Event handlers
const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 500)
}

const handleExport = () => {
  const format = 'XLSX'
  message.loading(`Đang xuất báo cáo định dạng ${format}...`)

  setTimeout(() => {
    message.success(`Đã xuất báo cáo ${format} thành công`)
    // Mock download file
    const link = document.createElement('a')
    link.href = '#'
    link.download = `audit-logs-${new Date().toISOString()}.xlsx`
    link.click()
  }, 1500)
}

const showDetails = (record: any) => {
  selectedLog.value = record
  detailsVisible.value = true
}

const handleCopy = async (record: any) => {
  try {
    const content = JSON.stringify(record, null, 2)
    await navigator.clipboard.writeText(content)
    message.success('Đã sao chép thông tin hoạt động')
  } catch (err) {
    message.error('Không thể sao chép vào clipboard')
  }
}

// Custom export format handlers
const exportAsCSV = () => {
  const headers = ['Thời gian', 'Người dùng', 'Hành động', 'Module', 'Trạng thái']
  const rows = filteredLogs.value.map(log => [
    formatDateTime(log.timestamp),
    log.user_name,
    getActionLabel(log.action),
    log.module,
    log.status
  ])

  // Mock CSV creation and download
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], {type: 'text/csv'})
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `audit-logs-${new Date().toISOString()}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}

const exportAsPDF = () => {
  message.info('Đang chuẩn bị tạo PDF...')
  setTimeout(() => {
    message.success('Đã xuất PDF thành công')
  }, 1500)
}

// Computed properties
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const searchTerm = filters.search.toLowerCase()
    const matchesSearch = !filters.search ||
        log.user_name.toLowerCase().includes(searchTerm) ||
        log.user_email.toLowerCase().includes(searchTerm) ||
        getActionLabel(log.action).toLowerCase().includes(searchTerm)

    const matchesAction = !filters.action || log.action === filters.action
    const matchesModule = !filters.module || log.module === filters.module
    const matchesStatus = !filters.status || log.status === filters.status

    if (filters.dateRange) {
      const [start, end] = filters.dateRange
      const logDate = new Date(log.timestamp)
      const isInRange = logDate >= start && logDate <= end
      return matchesSearch && matchesAction && matchesModule && matchesStatus && isInRange
    }

    return matchesSearch && matchesAction && matchesModule && matchesStatus
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// Analytics for dashboard
const analyticsData = computed(() => {
  const totalLogs = logs.value.length
  const successCount = logs.value.filter(log => log.status === 'SUCCESS').length
  const failureCount = totalLogs - successCount

  return {
    totalLogs,
    successRate: ((successCount / totalLogs) * 100).toFixed(1),
    actionBreakdown: actionTypes.map(type => ({
      action: type.label,
      count: logs.value.filter(log => log.action === type.value).length
    })),
    moduleBreakdown: modules.map(mod => ({
      module: mod.label,
      count: logs.value.filter(log => log.module === mod.value).length
    }))
  }
})

// Realtime updates simulation
let updateInterval: NodeJS.Timer

onMounted(() => {
  handleRefresh()

  // Simulate realtime updates
  updateInterval = setInterval(() => {
    const newLog = {
      id: logs.value.length + 1,
      timestamp: new Date().toISOString(),
      user_name: 'System',
      user_email: 'system@example.com',
      action: 'UPDATE',
      module: 'SYSTEM',
      status: 'SUCCESS',
      ip_address: '127.0.0.1',
      user_agent: 'System/1.0',
      metadata: {
        type: 'SCHEDULED_TASK',
        details: 'Routine system check'
      }
    }
    logs.value = [newLog, ...logs.value]
  }, 30000) // Add new log every 30 seconds
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

// Error handling
const handleError = (error: Error) => {
  message.error(`Lỗi: ${error.message}`)
  console.error('Audit Log Error:', error)
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'r':
          event.preventDefault()
          handleRefresh()
          break
        case 'e':
          event.preventDefault()
          handleExport()
          break
      }
    }
  }

  window.addEventListener('keydown', handleKeyPress)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
  })
})
definePageMeta({
  layout: 'admin'
})
</script>
