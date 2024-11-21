<!-- pages/admin/dashboard.vue -->
<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ACard hoverable>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-gray-400">Tổng người dùng</p>
            <h3 class="text-2xl font-bold">{{ stats.totalUsers }}</h3>
            <p class="text-xs text-green-500">
              <span class="flex items-center">
                <ArrowUpRightIcon class="h-3 w-3 mr-1" />
                +{{ stats.userGrowth }}% so với tuần trước
              </span>
            </p>
          </div>
          <div class="bg-purple-100 p-3 rounded-full">
            <UserOutlined class="text-2xl text-purple-600" />
          </div>
        </div>
      </ACard>

      <ACard hoverable>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-gray-400">Tổng số ví</p>
            <h3 class="text-2xl font-bold">{{ stats.totalWallets }}</h3>
            <p class="text-xs text-green-500">
              <span class="flex items-center">
                <ArrowUpRightIcon class="h-3 w-3 mr-1" />
                +{{ stats.walletGrowth }}% so với tuần trước
              </span>
            </p>
          </div>
          <div class="bg-blue-100 p-3 rounded-full">
            <WalletOutlined class="text-2xl text-blue-600" />
          </div>
        </div>
      </ACard>

      <ACard hoverable>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-gray-400">Giao dịch hôm nay</p>
            <h3 class="text-2xl font-bold">{{ formatCurrency(stats.todayTransactions) }}</h3>
            <p class="text-xs text-red-500">
              <span class="flex items-center">
                <ArrowDownRightIcon class="h-3 w-3 mr-1" />
                {{ stats.transactionChange }}% so với hôm qua
              </span>
            </p>
          </div>
          <div class="bg-green-100 p-3 rounded-full">
            <TransactionOutlined class="text-2xl text-green-600" />
          </div>
        </div>
      </ACard>

      <ACard hoverable>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-gray-400">Cảnh báo hệ thống</p>
            <h3 class="text-2xl font-bold">{{ stats.alerts }}</h3>
            <p class="text-xs text-orange-500">{{ stats.highPriorityAlerts }} cảnh báo nghiêm trọng</p>
          </div>
          <div class="bg-red-100 p-3 rounded-full">
            <AlertOutlined class="text-2xl text-red-600" />
          </div>
        </div>
      </ACard>
    </div>

    <!-- Transaction Chart -->
    <ACard title="Biểu đồ giao dịch" :bordered="false">
      <template #extra>
        <ASelect v-model:value="timeRange" style="width: 120px">
          <ASelectOption value="today">Hôm nay</ASelectOption>
          <ASelectOption value="week">Tuần này</ASelectOption>
          <ASelectOption value="month">Tháng này</ASelectOption>
        </ASelect>
      </template>
      <div style="height: 350px">
        <VChart :option="chartOption" autoresize />
      </div>
    </ACard>

    <!-- Recent Transactions & System Status -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ACard title="Giao dịch gần đây" :bordered="false">
        <ATable :columns="transactionColumns" :data-source="recentTransactions" :pagination="false" />
      </ACard>

      <ACard title="Trạng thái hệ thống" :bordered="false">
        <div class="space-y-4">
          <div v-for="status in systemStatus" :key="status.name" class="flex justify-between items-center">
            <span>{{ status.name }}</span>
            <div class="flex items-center">
              <AProgress :percent="status.value" :status="status.status" :show-info="false" style="width: 150px" />
              <span class="ml-2">{{ status.value }}%</span>
            </div>
          </div>
        </div>
      </ACard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { UserOutlined, WalletOutlined, TransactionOutlined, AlertOutlined } from '@ant-design/icons-vue'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

// Mock data
const stats = ref({
  totalUsers: 15847,
  userGrowth: 12.5,
  totalWallets: 12435,
  walletGrowth: 8.3,
  todayTransactions: 458900000,
  transactionChange: -2.4,
  alerts: 5,
  highPriorityAlerts: 2
})

const timeRange = ref('today')

const transactionData = [
  { date: '00:00', inflow: 2400, outflow: 1398 },
  { date: '03:00', inflow: 1398, outflow: 3570 },
  { date: '06:00', inflow: 9800, outflow: 2908 },
  { date: '09:00', inflow: 3908, outflow: 4800 },
  { date: '12:00', inflow: 4800, outflow: 3800 },
  { date: '15:00', inflow: 3800, outflow: 4300 },
  { date: '18:00', inflow: 4300, outflow: 2300 },
  { date: '21:00', inflow: 5300, outflow: 3300 },
]

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const time = params[0].name
      const inflow = params[0].value
      const outflow = params[1].value
      return `${time}<br/>Tiền vào: ${formatCurrency(inflow)}<br/>Tiền ra: ${formatCurrency(outflow)}`
    }
  },
  legend: {
    data: ['Tiền vào', 'Tiền ra']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: transactionData.map(item => item.date)
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: 'Tiền vào',
      type: 'line',
      smooth: true,
      data: transactionData.map(item => item.inflow),
      itemStyle: {
        color: '#10B981'
      }
    },
    {
      name: 'Tiền ra',
      type: 'line',
      smooth: true,
      data: transactionData.map(item => item.outflow),
      itemStyle: {
        color: '#EF4444'
      }
    }
  ]
}))

const transactionColumns = [
  { title: 'Mã GD', dataIndex: 'id', key: 'id' },
  { title: 'Người dùng', dataIndex: 'user', key: 'user' },
  { title: 'Loại', dataIndex: 'type', key: 'type' },
  { title: 'Số tiền', dataIndex: 'amount', key: 'amount' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status' }
]

const recentTransactions = [
  { id: 'TRX001', user: 'Nguyễn Văn A', type: 'Chuyển khoản', amount: '2,500,000 ₫', status: 'Thành công' },
  { id: 'TRX002', user: 'Trần Thị B', type: 'Nạp tiền', amount: '5,000,000 ₫', status: 'Đang xử lý' },
  { id: 'TRX003', user: 'Lê Văn C', type: 'Rút tiền', amount: '1,000,000 ₫', status: 'Thành công' },
  { id: 'TRX004', user: 'Phạm Thị D', type: 'Chuyển khoản', amount: '3,000,000 ₫', status: 'Thất bại' }
]

const systemStatus = [
  { name: 'CPU Usage', value: 65, status: 'normal' },
  { name: 'Memory Usage', value: 78, status: 'active' },
  { name: 'Storage', value: 45, status: 'normal' },
  { name: 'Network', value: 92, status: 'exception' }
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

definePageMeta({
  layout: 'admin'
})
</script>
