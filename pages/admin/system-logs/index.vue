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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
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
    timestamp: '2024-03-21T10:00:00Z', 
    level: 'ERROR',
    service: 'PAYMENT',
    message: 'Lỗi xử lý giao dịch thanh toán',
    details: {
      transaction_id: 'TRX123456',
      error_code: 'INSUFFICIENT_FUNDS',
      amount: 1500000
    },
    ip: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    stack_trace: 'Error: Số dư không đủ\n at ProcessPayment.execute (/src/services/payment.ts:125)'
  },
  {
    id: 2, 
    timestamp: '2024-03-21T09:55:00Z',
    level: 'WARNING',
    service: 'AUTH',
    message: 'Phát hiện nhiều lần đăng nhập thất bại',
    details: {
      user_id: 'USR789',
      attempt_count: 5,
      ip_addresses: ['192.168.1.100', '192.168.1.101']
    },
    ip: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    stack_trace: null
  },
  {
    id: 3,
    timestamp: '2024-03-21T09:50:00Z',
    level: 'INFO',
    service: 'USER',
    message: 'Người dùng cập nhật thông tin cá nhân',
    details: {
      user_id: 'USR456',
      fields_updated: ['phone_number', 'address']
    },
    ip: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    stack_trace: null
  },
  {
    id: 4,
    timestamp: '2024-03-21T09:45:00Z', 
    level: 'ERROR',
    service: 'WALLET',
    message: 'Lỗi kết nối đến ngân hàng liên kết',
    details: {
      bank_code: 'VCB',
      error_code: 'CONNECTION_TIMEOUT'
    },
    ip: '192.168.1.25',
    user_agent: 'System Service',
    stack_trace: 'Error: Không thể kết nối đến cổng thanh toán\n at BankConnection.connect (/src/services/bank.ts:89)'
  },
  {
    id: 5,
    timestamp: '2024-03-21T09:40:00Z',
    level: 'INFO',
    service: 'NOTIFICATION',
    message: 'Gửi thông báo OTP thành công',
    details: {
      notification_id: 'NTF789',
      type: 'SMS',
      recipient: '098*****789'
    },
    ip: '192.168.1.30',
    user_agent: 'Notification Service',
    stack_trace: null
  },
  {
    id: 6,
    timestamp: '2024-03-21T09:35:00Z',
    level: 'WARNING',
    service: 'PAYMENT',
    message: 'Giao dịch vượt hạn mức ngày',
    details: {
      user_id: 'USR123',
      transaction_amount: 50000000,
      daily_limit: 100000000,
      daily_used: 95000000
    },
    ip: '192.168.1.40',
    user_agent: 'Mozilla/5.0 (Linux; Android 11)',
    stack_trace: null
  },
  {
    id: 7,
    timestamp: '2024-03-21T09:30:00Z',
    level: 'ERROR',
    service: 'AUTH',
    message: 'Lỗi xác thực token JWT',
    details: {
      token_id: 'JWT789',
      error: 'TOKEN_EXPIRED'
    },
    ip: '192.168.1.60',
    user_agent: 'PostmanRuntime/7.29.0',
    stack_trace: 'Error: Token hết hạn\n at JWTVerifier.verify (/src/auth/jwt.ts:45)'
  },
  {
    id: 8,
    timestamp: '2024-03-21T09:25:00Z',
    level: 'INFO',
    service: 'USER',
    message: 'Đăng ký người dùng mới thành công',
    details: {
      user_id: 'USR890',
      registration_source: 'MOBILE_APP'
    },
    ip: '192.168.1.70',
    user_agent: 'GonPay Mobile App/1.0.0',
    stack_trace: null
  },
  {
    id: 9,
    timestamp: '2024-03-21T09:20:00Z',
    level: 'DEBUG',
    service: 'WALLET',
    message: 'Kiểm tra số dư ví định kỳ',
    details: {
      wallet_id: 'WAL456',
      balance: 15000000,
      last_transaction: 'TRX789'
    },
    ip: '192.168.1.80',
    user_agent: 'System Scheduler',
    stack_trace: null
  }
]

const additionalLogs = [
  {
    id: 10,
    timestamp: '2024-03-21T09:15:00Z',
    level: 'ERROR',
    service: 'PAYMENT',
    message: 'Giao dịch thanh toán thất bại - Thẻ hết hạn',
    details: {
      transaction_id: 'PAY456789',
      card_info: {
        bank: 'BIDV',
        last_digits: '6789',
        error: 'EXPIRED_CARD'
      },
      amount: 2500000
    },
    ip: '192.168.1.90',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    stack_trace: 'Error: Thẻ đã hết hạn\n at PaymentProcessor.validateCard (/src/services/payment.ts:156)'
  },
  {
    id: 11,
    timestamp: '2024-03-21T09:10:00Z',
    level: 'WARNING',
    service: 'USER',
    message: 'Phát hiện đăng nhập từ thiết bị mới',
    details: {
      user_id: 'USR567',
      device_info: {
        location: 'Hà Nội, Việt Nam',
        device: 'iPhone 13',
        browser: 'Safari'
      }
    },
    ip: '192.168.1.95',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    stack_trace: null
  },
  {
    id: 12,
    timestamp: '2024-03-21T09:05:00Z',
    level: 'INFO',
    service: 'WALLET',
    message: 'Liên kết ví với ngân hàng thành công',
    details: {
      wallet_id: 'WAL789',
      bank_info: {
        bank_code: 'TCB',
        account_number: '19034xxx789',
        holder_name: 'NGUYEN VAN TUAN'
      }
    },
    ip: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Linux; Android 12)',
    stack_trace: null
  },
  {
    id: 13,
    timestamp: '2024-03-21T09:00:00Z',
    level: 'ERROR',
    service: 'NOTIFICATION',
    message: 'Lỗi gửi SMS OTP',
    details: {
      phone: '098xxx6789',
      provider: 'Viettel',
      error_code: 'PROVIDER_ERROR',
      retry_count: 2
    },
    ip: '192.168.1.110',
    user_agent: 'Notification Service',
    stack_trace: 'Error: Không thể kết nối đến nhà mạng\n at SMSProvider.send (/src/services/sms.ts:78)'
  },
  {
    id: 14,
    timestamp: '2024-03-21T08:55:00Z',
    level: 'INFO',
    service: 'AUTH',
    message: 'Thay đổi mật khẩu thành công',
    details: {
      user_id: 'USR234',
      change_method: 'SELF_SERVICE',
      password_strength: 'STRONG'
    },
    ip: '192.168.1.120',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    stack_trace: null
  },
  {
    id: 15,
    timestamp: '2024-03-21T08:50:00Z',
    level: 'WARNING',
    service: 'PAYMENT',
    message: 'Giao dịch đáng ngờ - Số tiền lớn',
    details: {
      transaction_id: 'TRX987654',
      amount: 150000000,
      risk_score: 0.85,
      flags: ['LARGE_AMOUNT', 'NEW_RECIPIENT']
    },
    ip: '192.168.1.130',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    stack_trace: null
  },
  {
    id: 16,
    timestamp: '2024-03-21T08:45:00Z',
    level: 'DEBUG',
    service: 'WALLET',
    message: 'Đồng bộ số dư ví định kỳ',
    details: {
      wallet_count: 1250,
      sync_duration: '45s',
      updated_wallets: 28
    },
    ip: '192.168.1.140',
    user_agent: 'System Scheduler',
    stack_trace: null
  },
  {
    id: 17,
    timestamp: '2024-03-21T08:40:00Z',
    level: 'ERROR',
    service: 'USER',
    message: 'Lỗi xác thực CMND/CCCD',
    details: {
      user_id: 'USR789',
      id_number: '0791xxx789',
      error_type: 'IMAGE_QUALITY',
      verification_provider: 'VNPT eKYC'
    },
    ip: '192.168.1.150',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    stack_trace: 'Error: Ảnh CMND không đạt chất lượng\n at eKYC.verifyID (/src/services/kyc.ts:245)'
  },
  {
    id: 18,
    timestamp: '2024-03-21T08:35:00Z',
    level: 'INFO',
    service: 'NOTIFICATION',
    message: 'Gửi thông báo marketing thành công',
    details: {
      campaign_id: 'CPG123',
      recipients: 1500,
      delivered: 1486,
      failed: 14,
      template: 'TET_2024_PROMO'
    },
    ip: '192.168.1.160',
    user_agent: 'Marketing Service',
    stack_trace: null
  },
  {
    id: 19,
    timestamp: '2024-03-21T08:30:00Z',
    level: 'WARNING',
    service: 'AUTH',
    message: 'Phát hiện tấn công Brute Force',
    details: {
      target_user: 'USR456',
      ip_addresses: ['192.168.1.201', '192.168.1.202', '192.168.1.203'],
      attempt_count: 15,
      time_window: '5 minutes',
      action_taken: 'IP_BLOCKED'
    },
    ip: '192.168.1.170',
    user_agent: 'Security Service',
    stack_trace: null
  }
]

// Thêm vào mảng mockLogs hiện có
mockLogs.push(...additionalLogs)

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

// Thêm hàm cập nhật realtime
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
      case 'Tổng số logs':
        stat.value += Math.floor(Math.random() * 3) * activityMultiplier
        stat.trend = +(Math.random() * 2 + 7).toFixed(1)
        break
      case 'Lỗi hệ thống':
        if (Math.random() > 0.7) {
          stat.value += 1
          stat.trend = +(Math.random() * 5 - 15).toFixed(1)
        }
        break  
      case 'API Calls/phút':
        stat.value += Math.floor(Math.random() * 50 * activityMultiplier)
        stat.trend = +(Math.random() * 4 + 10).toFixed(1)
        break
      case 'Thời gian phản hồi':
        stat.value = Math.floor(200 + Math.random() * 100 * activityMultiplier)
        stat.trend = +(Math.random() * 10 - 5).toFixed(1)
        break
    }
  })

  // Thêm log mới ngẫu nhiên
  if (Math.random() > 0.7) {
    const services = ['AUTH', 'PAYMENT', 'USER', 'WALLET', 'NOTIFICATION']
    const levels = ['ERROR', 'WARNING', 'INFO', 'DEBUG']
    const messages = [
      'Đăng nhập thành công',
      'Cập nhật thông tin người dùng',
      'Gửi OTP xác thực',
      'Kiểm tra số dư ví',
      'Giao dịch chuyển tiền',
      'Liên kết ngân hàng',
      'Xác thực token',
      'Tạo ví mới'
    ]
    
    const newLog = {
      id: logs.value.length + 1,
      timestamp: new Date().toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      details: {
        user_id: `USR${Math.random().toString(36).substr(2, 6)}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      },
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      stack_trace: null
    }
    
    logs.value.unshift(newLog)
    if (logs.value.length > 100) logs.value.pop()
  }
}

// Thêm vào onMounted
onMounted(() => {
  handleRefresh()
  const statsInterval = setInterval(updateRealtimeStats, 1000)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})

definePageMeta({
  layout: 'admin'
})
</script>
