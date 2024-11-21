<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Nhật ký hệ thống</h1>
        <p class="text-gray-500">Theo dõi và phân tích hoạt động hệ thống</p>
      </div>
      <div class="space-x-3">
        <AButton @click="handleRefresh"><template #icon><ReloadOutlined /></template>Làm mới</AButton>
        <AButton @click="handleExport"><template #icon><DownloadOutlined /></template>Xuất báo cáo</AButton>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <ACard v-for="stat in stats" :key="stat.title">
        <AStatistic :title="stat.title" :value="stat.value" :precision="stat.precision" :valueStyle="{ color: stat.color }">
          <template #prefix><component :is="stat.icon" /></template>
          <template #suffix>
            <span :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">{{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%</span>
          </template>
        </AStatistic>
      </ACard>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-wrap gap-4">
        <AInputSearch v-model:value="filters.search" placeholder="Tìm kiếm logs..." style="width: 250px" @search="handleSearch" />
        <ASelect v-model:value="filters.level" style="width: 120px" placeholder="Mức độ">
          <ASelectOption value="ERROR">Error</ASelectOption>
          <ASelectOption value="WARNING">Warning</ASelectOption>
          <ASelectOption value="INFO">Info</ASelectOption>
          <ASelectOption value="DEBUG">Debug</ASelectOption>
        </ASelect>
        <ASelect v-model:value="filters.service" style="width: 150px" placeholder="Dịch vụ">
          <ASelectOption v-for="service in services" :key="service.value" :value="service.value">{{ service.label }}</ASelectOption>
        </ASelect>
        <ARangePicker v-model:value="filters.dateRange" :show-time="true" style="width: 380px" />
      </div>
    </div>

    <ATable :columns="columns" :dataSource="filteredLogs" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'level'">
          <ATag :color="getLogLevelColor(record.level)">{{ record.level }}</ATag>
        </template>
        <template v-if="column.key === 'message'">
          <div class="flex items-start">
            <div :class="getLogLevelIconClass(record.level)" class="p-2 rounded mr-2">
              <component :is="getLogLevelIcon(record.level)" />
            </div>
            <div>
              <div class="font-medium">{{ record.message }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ record.service }} | {{ record.ip }} | {{ record.user_agent }}</div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'actions'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="showDetails(record)">
              <template #icon><EyeOutlined /></template>
            </AButton>
            <AButton type="link" size="small" @click="handleCopy(record)">
              <template #icon><CopyOutlined /></template>
            </AButton>
          </div>
        </template>
      </template>
    </ATable>

    <ADrawer v-model:visible="detailsVisible" title="Chi tiết log" width="600">
      <template v-if="selectedLog">
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium mb-2">Thông tin chung</h3>
            <ADescriptions bordered>
              <ADescriptionsItem label="ID">{{ selectedLog.id }}</ADescriptionsItem>
              <ADescriptionsItem label="Thời gian">{{ formatDateTime(selectedLog.timestamp) }}</ADescriptionsItem>
              <ADescriptionsItem label="Mức độ">
                <ATag :color="getLogLevelColor(selectedLog.level)">{{ selectedLog.level }}</ATag>
              </ADescriptionsItem>
              <ADescriptionsItem label="Dịch vụ">{{ selectedLog.service }}</ADescriptionsItem>
              <ADescriptionsItem label="IP">{{ selectedLog.ip }}</ADescriptionsItem>
              <ADescriptionsItem label="User Agent">{{ selectedLog.user_agent }}</ADescriptionsItem>
            </ADescriptions>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-2">Chi tiết</h3>
            <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre class="text-sm">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-2">Stack Trace</h3>
            <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre class="text-sm">{{ selectedLog.stack_trace }}</pre>
            </div>
          </div>
        </div>
      </template>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, DownloadOutlined, EyeOutlined, CopyOutlined,
  ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined, BugOutlined,
  MonitorOutlined, AlertOutlined, ApiOutlined, ThunderboltOutlined
} from '@ant-design/icons-vue'

const stats = [
  {
    title: 'Tổng số logs',
    value: 12458,
    precision: 0,
    color: '#1890ff',
    trend: 8.5,
    icon: MonitorOutlined
  },
  {
    title: 'Lỗi hệ thống',
    value: 23,
    precision: 0,
    color: '#ff4d4f',
    trend: -15.2,
    icon: AlertOutlined
  },
  {
    title: 'API Calls/phút',
    value: 1856,
    precision: 0,
    color: '#52c41a',
    trend: 12.3,
    icon: ApiOutlined
  },
  {
    title: 'Thời gian phản hồi',
    value: 235,
    precision: 0,
    color: '#722ed1',
    trend: -5.7,
    icon: ThunderboltOutlined,
    suffix: 'ms'
  }
]

const services = [
  { value: 'AUTH', label: 'Authentication' },
  { value: 'PAYMENT', label: 'Payment Service' },
  { value: 'USER', label: 'User Service' },
  { value: 'WALLET', label: 'Wallet Service' },
  { value: 'NOTIFICATION', label: 'Notification' }
]

const mockLogs = [
  {
    id: 1,
    timestamp: '2024-11-21T10:00:00Z',
    level: 'ERROR',
    service: 'PAYMENT',
    message: 'Failed to process payment transaction',
    details: {
      transaction_id: 'TRX123456',
      error_code: 'INSUFFICIENT_FUNDS',
      amount: 1000000
    },
    ip: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    stack_trace: 'Error: Insufficient funds\n at ProcessPayment.execute (/src/services/payment.ts:125)\n at async Transaction.process (/src/models/transaction.ts:89)'
  },
  {
    id: 2,
    timestamp: '2024-11-21T09:55:00Z',
    level: 'WARNING',
    service: 'AUTH',
    message: 'Multiple failed login attempts detected',
    details: {
      user_id: 'USR789',
      attempt_count: 5,
      ip_addresses: ['192.168.1.100', '192.168.1.101']
    },
    ip: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    stack_trace: null
  }
]

const loading = ref(false)
const detailsVisible = ref(false)
const selectedLog = ref(null)
const logs = ref(mockLogs)

const filters = reactive({
  search: '',
  level: undefined,
  service: undefined,
  dateRange: undefined
})

const columns = [
  { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp', width: 180, sorter: true },
  { title: 'Mức độ', dataIndex: 'level', key: 'level', width: 100 },
  { title: 'Thông tin', dataIndex: 'message', key: 'message' },
  { title: 'Thao tác', key: 'actions', width: 100, fixed: 'right' }
]

const getLogLevelColor = (level: string) => {
  const colors = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'processing',
    DEBUG: 'default'
  }
  return colors[level] || 'default'
}

const getLogLevelIcon = (level: string) => {
  const icons = {
    ERROR: ExclamationCircleOutlined,
    WARNING: WarningOutlined,
    INFO: InfoCircleOutlined,
    DEBUG: BugOutlined
  }
  return icons[level] || InfoCircleOutlined
}

const getLogLevelIconClass = (level: string) => {
  const classes = {
    ERROR: 'bg-red-100 text-red-600',
    WARNING: 'bg-yellow-100 text-yellow-600',
    INFO: 'bg-blue-100 text-blue-600',
    DEBUG: 'bg-gray-100 text-gray-600'
  }
  return classes[level] || 'bg-gray-100 text-gray-600'
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('vi-VN')
}

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
  message.success('Đang xuất báo cáo')
}

const showDetails = (record: any) => {
  selectedLog.value = record
  detailsVisible.value = true
}

const handleCopy = (record: any) => {
  navigator.clipboard.writeText(JSON.stringify(record, null, 2))
  message.success('Đã sao chép thông tin log')
}

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const matchesSearch = !filters.search ||
        log.message.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.service.toLowerCase().includes(filters.search.toLowerCase())
    const matchesLevel = !filters.level || log.level === filters.level
    const matchesService = !filters.service || log.service === filters.service

    if (filters.dateRange) {
      const [start, end] = filters.dateRange
      const logDate = new Date(log.timestamp)
      return matchesSearch && matchesLevel && matchesService &&
          logDate >= start && logDate <= end
    }

    return matchesSearch && matchesLevel && matchesService
  })
})

onMounted(() => {
  handleRefresh()
})

definePageMeta({
  layout: 'admin'
})
</script>
