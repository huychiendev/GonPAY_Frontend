<template>
  <div class="dashboard-container">
    <!-- Thống kê tổng quan -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <a-card class="dashboard-stat-card">
        <template #title>
          <span class="flex items-center">
            <UserOutlined class="mr-2" />
            Tổng người dùng
          </span>
        </template>
        <div class="text-2xl font-bold text-blue-600">{{ stats.totalUsers }}</div>
        <div class="text-sm text-gray-500">
          <span class="text-green-500">+{{ stats.newUsers }}</span> trong 7 ngày qua
        </div>
      </a-card>

      <a-card class="dashboard-stat-card">
        <template #title>
          <span class="flex items-center">
            <WalletOutlined class="mr-2" />
            Tổng số ví
          </span>
        </template>
        <div class="text-2xl font-bold text-indigo-600">{{ stats.totalWallets }}</div>
        <div class="text-sm text-gray-500">
          <span class="text-green-500">{{ stats.activeWallets }}</span> ví đang hoạt động
        </div>
      </a-card>

      <a-card class="dashboard-stat-card">
        <template #title>
          <span class="flex items-center">
            <TransactionOutlined class="mr-2" />
            Giao dịch hôm nay
          </span>
        </template>
        <div class="text-2xl font-bold text-emerald-600">{{ formatCurrency(stats.todayTransactions) }}</div>
        <div class="text-sm text-gray-500">
          <span :class="stats.transactionGrowth >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ stats.transactionGrowth >= 0 ? '+' : '' }}{{ stats.transactionGrowth }}%
          </span>
          so với hôm qua
        </div>
      </a-card>

      <a-card class="dashboard-stat-card">
        <template #title>
          <span class="flex items-center">
            <AlertOutlined class="mr-2" />
            Cảnh báo hệ thống
          </span>
        </template>
        <div class="text-2xl font-bold text-orange-600">{{ stats.systemAlerts }}</div>
        <div class="text-sm text-gray-500">
          {{ stats.criticalAlerts }} cảnh báo nghiêm trọng
        </div>
      </a-card>
    </div>

    <!-- Biểu đồ và thông tin chi tiết -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <a-card title="Biểu đồ giao dịch" :loading="loading">
        <template #extra>
          <a-select v-model:value="chartPeriod" style="width: 120px">
            <a-select-option value="day">Hôm nay</a-select-option>
            <a-select-option value="week">Tuần này</a-select-option>
            <a-select-option value="month">Tháng này</a-select-option>
          </a-select>
        </template>
        <div class="h-80">
          <v-chart class="w-full h-full" :option="transactionChartOption" />
        </div>
      </a-card>

      <a-card title="Giao dịch gần đây" :loading="loading">
        <template #extra>
          <a-button type="link" @click="viewAllTransactions">
            Xem tất cả
          </a-button>
        </template>
        <a-table :dataSource="recentTransactions" :columns="transactionColumns" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'amount'">
              <span :class="record.type === 'DEPOSIT' ? 'text-green-500' : 'text-red-500'">
                {{ formatCurrency(record.amount) }}
              </span>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ record.status }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Hoạt động hệ thống -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <a-card title="Hoạt động người dùng" :loading="loading">
        <a-timeline>
          <a-timeline-item v-for="activity in userActivities" :key="activity.id" :color="activity.color">
            <template #dot>
              <component :is="activity.icon" />
            </template>
            <div class="font-medium">{{ activity.title }}</div>
            <div class="text-sm text-gray-500">{{ formatTime(activity.timestamp) }}</div>
          </a-timeline-item>
        </a-timeline>
      </a-card>

      <a-card title="Thông báo hệ thống" :loading="loading">
        <a-list :dataSource="systemNotifications" :pagination="false">
          <template #renderItem="{ item }">
            <a-list-item>
              <div class="flex items-start">
                <component :is="getNotificationIcon(item.type)" class="mt-1 mr-3" />
                <div>
                  <div class="font-medium">{{ item.title }}</div>
                  <div class="text-sm text-gray-500">{{ item.content }}</div>
                  <div class="text-xs text-gray-400">{{ formatTime(item.timestamp) }}</div>
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <a-card title="Tài nguyên hệ thống" :loading="loading">
        <div class="space-y-4">
          <div>
            <div class="flex justify-between mb-2">
              <span>CPU Usage</span>
              <span>{{ systemResources.cpu }}%</span>
            </div>
            <a-progress :percent="systemResources.cpu" :showInfo="false" />
          </div>
          <div>
            <div class="flex justify-between mb-2">
              <span>Memory Usage</span>
              <span>{{ systemResources.memory }}%</span>
            </div>
            <a-progress :percent="systemResources.memory" :showInfo="false" />
          </div>
          <div>
            <div class="flex justify-between mb-2">
              <span>Disk Usage</span>
              <span>{{ systemResources.disk }}%</span>
            </div>
            <a-progress :percent="systemResources.disk" :showInfo="false" />
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserOutlined, WalletOutlined, TransactionOutlined, AlertOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

// Khởi tạo ECharts components
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const router = useRouter()
const loading = ref(false)
const chartPeriod = ref('week')

const recentTransactions = ref([])
const userActivities = ref([
  {
    id: 1,
    color: 'blue',
    icon: 'UserOutlined',
    title: 'User logged in',
    timestamp: '2023-10-01T12:00:00Z'
  },
  // Add more activities as needed
])
const systemNotifications = ref([])
const systemResources = ref({
  cpu: 0,
  memory: 0,
  disk: 0
})


// Dữ liệu thống kê
const stats = ref({
  totalUsers: 0,
  newUsers: 0,
  totalWallets: 0,
  activeWallets: 0,
  todayTransactions: 0,
  transactionGrowth: 0,
  systemAlerts: 0,
  criticalAlerts: 0
})

// Cấu hình biểu đồ giao dịch
const transactionChartOption = ref({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['Giao dịch vào', 'Giao dịch ra']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: []
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: 'Giao dịch vào',
      type: 'line',
      data: []
    },
    {
      name: 'Giao dịch ra',
      type: 'line',
      data: []
    }
  ]
})

// Cột cho bảng giao dịch
const transactionColumns = [
  {
    title: 'Mã GD',
    dataIndex: 'id',
    key: 'id'
  },
  {
    title: 'Loại',
    dataIndex: 'type',
    key: 'type'
  },
  {
    title: 'Số tiền',
    dataIndex: 'amount',
    key: 'amount'
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status'
  }
]

// Các hàm tiện ích
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount)
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('vi-VN')
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    COMPLETED: 'success',
    PENDING: 'processing',
    FAILED: 'error'
  }
  return colors[status] || 'default'
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, any> = {
    SUCCESS: CheckCircleOutlined,
    WARNING: ClockCircleOutlined,
    ERROR: CloseCircleOutlined
  }
  return icons[type] || AlertOutlined
}

// Xử lý sự kiện
const viewAllTransactions = () => {
  router.push('/admin/transactions')
}

// Lấy dữ liệu từ API
const fetchDashboardData = async () => {
  try {
    loading.value = true
    // TODO: Thêm các API call thực tế ở đây
    const response = await fetch('https://gonpay-backend.onrender.com/api/dashboard')
    const data = await response.json()
    // Cập nhật state với dữ liệu từ API
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchDashboardData()
})

// Layout
definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.dashboard-stat-card {
  @apply transition-all duration-300 hover:shadow-lg;
}

.dashboard-stat-card:hover {
  @apply transform -translate-y-1;
}
</style>
