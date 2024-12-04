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
        <div class="flex items-center gap-4">
          <ASelect v-model:value="timeRange" style="width: 120px">
            <ASelectOption value="live">Trực tiếp</ASelectOption>
            <ASelectOption value="today">Hôm nay</ASelectOption>
            <ASelectOption value="week">Tuần này</ASelectOption>
            <ASelectOption value="month">Tháng này</ASelectOption>
          </ASelect>

          <ASelect
            v-if="timeRange === 'today'"
            v-model:value="hourRange"
            style="width: 120px"
          >
            <ASelectOption value="1h">1 giờ gần đây</ASelectOption>
            <ASelectOption value="3h">3 giờ gần đây</ASelectOption>
            <ASelectOption value="6h">6 giờ gần đây</ASelectOption>
            <ASelectOption value="12h">12 giờ gần đây</ASelectOption>
            <ASelectOption value="24h">24 giờ</ASelectOption>
          </ASelect>

          <ASelect
            v-if="timeRange === 'month'"
            v-model:value="selectedMonth"
            style="width: 120px"
            placeholder="Chọn tháng"
          >
            <ASelectOption v-for="m in 12" :key="m" :value="m">
              Tháng {{ m }}
            </ASelectOption>
          </ASelect>

          <ASelect
            v-model:value="selectedYear"
            style="width: 120px"
            placeholder="Chọn năm"
          >
            <ASelectOption v-for="year in yearOptions" :key="year" :value="year">
              Năm {{ year }}
            </ASelectOption>
          </ASelect>
        </div>
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
        <div class="space-y-6">
          <div v-for="status in systemStatus" :key="status.name" class="relative">
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium">{{ status.name }}</span>
              <span :class="getStatusColor(status.value)">{{ status.value }}%</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="getStatusBarColor(status.value)"
                :style="{ width: `${status.value}%` }"
              ></div>
            </div>
            <div class="mt-1 text-xs text-gray-500 flex justify-between">
              <span>{{ status.detail }}</span>
              <span>{{ status.updated }}</span>
            </div>
          </div>
        </div>
      </ACard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { UserOutlined, WalletOutlined, TransactionOutlined, AlertOutlined } from '@ant-design/icons-vue'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, PieChart, BarChart])

// Mock data
const stats = ref({
  totalUsers: 10635,
  userGrowth: 12.5,
  totalWallets: 12435,
  walletGrowth: 8.3,
  todayTransactions: 458900000,
  transactionChange: -2.4,
  alerts: 5,
  highPriorityAlerts: 2,
  lastUpdate: new Date()
})

const timeRange = ref('today')
const hourRange = ref('24h')
const isLiveMode = ref(false)
const liveInterval = ref<NodeJS.Timer | null>(null)
const timeMultiplier = 1.2;
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({length: 5}, (_, i) => currentYear - i)
})

const getMonthData = (month: number, year: number) => {
  // Lấy số ngày trong tháng
  const daysInMonth = new Date(year, month, 0).getDate()

  return Array.from({length: daysInMonth}, (_, i) => {
    const day = i + 1
    return {
      date: `${day}/${month}`,
      inflow: Math.floor(Math.random() * 80000000) + 20000000, // Random từ 20M-100M
      outflow: Math.floor(Math.random() * 60000000) + 10000000 // Random từ 10M-70M
    }
  })
}

const transactionDataByRange = computed(() => ({
  live: [],
  today: getHourRangeData(parseInt(hourRange.value)),
  week: [
    { date: 'T2', inflow: 15400000, outflow: 12398000 },
    { date: 'T3', inflow: 18398000, outflow: 13570000 },
    { date: 'T4', inflow: 19800000, outflow: 15908000 },
    { date: 'T5', inflow: 23908000, outflow: 14800000 },
    { date: 'T6', inflow: 24800000, outflow: 17800000 },
    { date: 'T7', inflow: 28800000, outflow: 19300000 },
    { date: 'CN', inflow: 25300000, outflow: 18300000 }
  ],
  month: getMonthData(selectedMonth.value, selectedYear.value)
}))

const getLiveData = () => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  // Tăng giá trị cơ sở và biên độ dao động
  const baseInflow = 100000000 // 100M
  const baseOutflow = 70000000 // 70M
  
  // Tăng biên độ dao động lên ±70%
  const randomFactor = () => 1 + (Math.random() - 0.5) * 1.4
  
  // Thêm nhiễu ngẫu nhiên
  const noise = () => Math.random() * 20000000 // Thêm nhiễu ±20M
  
  const inflow = Math.round((baseInflow * randomFactor() + noise()) * timeMultiplier)
  const outflow = Math.round((baseOutflow * randomFactor() + noise()) * timeMultiplier)
  
  return {
    date: time,
    inflow: Math.max(inflow, 30000000), // Giá trị tối thiểu 30M
    outflow: Math.max(outflow, 20000000) // Giá trị tối thiểu 20M
  }
}

const getHourRangeData = (hours: number) => {
  const now = new Date()
  const data = []

  // Tạo mẫu cơ bản cho biến động trong ngày
  const basePattern = {
    morning: { // 6h-11h
      inflow: { base: 50000000, variance: 20000000 },
      outflow: { base: 35000000, variance: 15000000 }
    },
    noon: { // 11h-14h
      inflow: { base: 80000000, variance: 25000000 },
      outflow: { base: 60000000, variance: 20000000 }
    },
    afternoon: { // 14h-17h
      inflow: { base: 65000000, variance: 22000000 },
      outflow: { base: 45000000, variance: 18000000 }
    },
    evening: { // 17h-22h
      inflow: { base: 40000000, variance: 15000000 },
      outflow: { base: 30000000, variance: 12000000 }
    },
    night: { // 22h-6h
      inflow: { base: 15000000, variance: 8000000 },
      outflow: { base: 10000000, variance: 5000000 }
    }
  }

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hour = time.getHours()

    let pattern
    if (hour >= 6 && hour < 11) pattern = basePattern.morning
    else if (hour >= 11 && hour < 14) pattern = basePattern.noon
    else if (hour >= 14 && hour < 17) pattern = basePattern.afternoon
    else if (hour >= 17 && hour < 22) pattern = basePattern.evening
    else pattern = basePattern.night

    // Thêm nhiễu ngẫu nhiên có kiểm soát
    const getRandomVariance = (variance: number) => {
      return (Math.random() - 0.5) * 2 * variance
    }

    // Tạo xu hướng tăng/giảm nhẹ
    const trendFactor = 1 + (Math.sin(i / 6) * 0.1) // Tạo dao động sin nhẹ ±10%

    const inflow = Math.round((pattern.inflow.base + getRandomVariance(pattern.inflow.variance)) * trendFactor)
    const outflow = Math.round((pattern.outflow.base + getRandomVariance(pattern.outflow.variance)) * trendFactor)

    data.push({
      date: `${time.getHours().toString().padStart(2, '0')}:00`,
      inflow: Math.max(inflow, 5000000), // Đảm bảo giá trị tối thiểu
      outflow: Math.max(outflow, 3000000)
    })
  }
  return data
}

watch([timeRange, hourRange], () => {
  if (timeRange.value === 'live') {
    // Clear interval cũ nếu có
    if (liveInterval.value) {
      clearInterval(liveInterval.value)
    }
    
    // Khởi tạo lại dữ liệu
    isLiveMode.value = true
    const liveData: any[] = []
    
    // Khởi tạo 30 điểm dữ liệu ban đầu với giá trị thực
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      liveData.push(getLiveData())
    }
    
    transactionDataByRange.value.live = liveData
    
    // Cập nhật mỗi 3 giây
    liveInterval.value = setInterval(() => {
      const newData = getLiveData()
      liveData.push(newData)
      liveData.shift() // Xóa điểm dữ liệu cũ nhất
      transactionDataByRange.value.live = [...liveData] 
    }, 3000)
  } else {
    if (isLiveMode.value) {
      clearInterval(liveInterval.value!)
      isLiveMode.value = false
    }
  }
}, { immediate: true })

const chartOption = computed(() => {
  const currentData = transactionDataByRange.value[timeRange.value]

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const time = params[0].name
        const inflow = params[0].value
        const outflow = params[1].value
        return `${time}<br/>` +
               `Tiền vào: ${formatCurrency(inflow)}<br/>` +
               `Tiền ra: ${formatCurrency(outflow)}`
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
      data: currentData.map(item => item.date),
      axisLabel: {
        rotate: timeRange.value === 'month' ? 45 : 0,
        formatter: (value: string) => {
          if (timeRange.value === 'live') {
            return value.split(':')[0] + ':' + value.split(':')[1]
          }
          return value
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000000) {
            return `${value / 1000000}M`
          } else if (value >= 1000) {
            return `${value / 1000}K`
          }
          return value
        }
      }
    },
    series: [
      {
        name: 'Tiền vào',
        type: 'line',
        smooth: true,
        data: currentData.map(item => item.inflow),
        itemStyle: { color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(16, 185, 129, 0.2)'
            }, {
              offset: 1,
              color: 'rgba(16, 185, 129, 0)'
            }]
          }
        }
      },
      {
        name: 'Tiền ra',
        type: 'line',
        smooth: true,
        data: currentData.map(item => item.outflow),
        itemStyle: { color: '#EF4444' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(239, 68, 68, 0.2)'
            }, {
              offset: 1,
              color: 'rgba(239, 68, 68, 0)'
            }]
          }
        }
      }
    ]
  }
})

const transactionColumns = [
  { title: 'Mã GD', dataIndex: 'id', key: 'id' },
  { title: 'Người dùng', dataIndex: 'user', key: 'user' },
  { title: 'Loại', dataIndex: 'type', key: 'type' },
  { title: 'Số tiền', dataIndex: 'amount', key: 'amount' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status' }
]

const recentTransactions = ref([
  {
    id: 'TRX001',
    user: 'Nguyễn Thị Hương',
    type: 'Nạp tiền',
    amount: '5.000.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX002',
    user: 'Trần Văn Nam',
    type: 'Chuyển khoản',
    amount: '2.500.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX003',
    user: 'Phạm Minh Đức',
    type: 'Rút tiền',
    amount: '3.000.000 ₫',
    status: 'Đang xử lý'
  },
  {
    id: 'TRX004',
    user: 'Lê Thị Thanh',
    type: 'Nạp tiền',
    amount: '10.000.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX005',
    user: 'Hoàng Văn Thắng',
    type: 'Chuyển khoản',
    amount: '1.500.000 ₫',
    status: 'Thất bại'
  },
  {
    id: 'TRX006',
    user: 'Vũ Thị Mai',
    type: 'Rút tiền',
    amount: '4.000.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX007',
    user: 'Đặng Văn Tùng',
    type: 'Nạp tiền',
    amount: '20.000.000 ₫',
    status: 'Đang xử lý'
  },
  {
    id: 'TRX008',
    user: 'Bùi Thị Hà',
    type: 'Chuyển khoản',
    amount: '8.500.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX009',
    user: 'Ngô Văn Dũng',
    type: 'Rút tiền',
    amount: '15.000.000 ₫',
    status: 'Thành công'
  },
  {
    id: 'TRX010',
    user: 'Phan Thị Ngọc',
    type: 'Chuyển khoản',
    amount: '6.000.000 ₫',
    status: 'Thành công'
  }
])

const systemStatus = ref([
  {
    name: 'CPU Usage',
    value: 39,
    status: 'normal',
    detail: '4/8 Cores active',
    updated: 'Vừa xong'
  },
  {
    name: 'Memory Usage',
    value: 55,
    status: 'warning',
    detail: '12.5/16 GB used',
    updated: 'Vừa xong'
  },
  {
    name: 'Storage',
    value: 25,
    status: 'normal',
    detail: '234/512 GB used',
    updated: 'Vừa xong'
  },
  {
    name: 'Network',
    value: 39,
    status: 'critical',
    detail: '892 Mb/s',
    updated: 'Vừa xong'
  }
])

const getStatusColor = (value: number) => {
  if (value >= 90) return 'text-red-500'
  if (value >= 75) return 'text-orange-500'
  if (value >= 60) return 'text-yellow-500'
  return 'text-green-500'
}

const getStatusBarColor = (value: number) => {
  if (value >= 90) return 'bg-gradient-to-r from-red-500 to-red-400'
  if (value >= 75) return 'bg-gradient-to-r from-orange-500 to-orange-400'
  if (value >= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-400'
  return 'bg-gradient-to-r from-green-500 to-green-400'
}

const updateSystemStatus = () => {
  systemStatus.value = systemStatus.value.map(status => {
    // Tạo biến động ngẫu nhiên từ -5 đến +5
    const variation = Math.floor(Math.random() * 11) - 5
    let newValue = status.value + variation

    // Giới hạn giá trị từ 0 đến 100
    newValue = Math.max(0, Math.min(100, newValue))

    // Cập nhật chi tiết dựa trên loại
    let detail = status.detail
    if (status.name === 'CPU Usage') {
      detail = `${Math.ceil(newValue/25)}/8 Cores active`
    } else if (status.name === 'Memory Usage') {
      detail = `${(newValue * 0.16).toFixed(1)}/16 GB used`
    } else if (status.name === 'Network') {
      detail = `${Math.floor(newValue * 10)} Mb/s`
    }

    return {
      ...status,
      value: newValue,
      detail,
      updated: 'Vừa xong'
    }
  })
}

let transactionInterval: NodeJS.Timer | null = null

onMounted(() => {
  // Khởi tạo chế độ live khi component được mount
  if (timeRange.value === 'live') {
    isLiveMode.value = true
    const liveData: any[] = []
    
    // Khởi tạo 30 điểm dữ liệu ban đầu
    for (let i = 29; i >= 0; i--) {
      liveData.push(getLiveData())
    }
    
    transactionDataByRange.value.live = liveData
    
    // Cập nhật mỗi 3 giây
    liveInterval.value = setInterval(() => {
      const newData = getLiveData()
      liveData.push(newData)
      liveData.shift()
      transactionDataByRange.value.live = [...liveData]
    }, 3000)
  }

  // Các interval khác...
  setInterval(updateSystemStatus, 800)
  
  // Thêm interval cho giao dịch gần đây
  transactionInterval = setInterval(updateRecentTransactions, 300)
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const transactionTypeData = computed(() => ({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: 'Loại giao dịch',
      type: 'pie',
      radius: '70%',
      data: [
        { value: 45, name: 'Nạp tiền' },
        { value: 30, name: 'Rút tiền' },
        { value: 20, name: 'Chuyển khoản' },
        { value: 5, name: 'Thanh toán' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

const newUsersChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    axisTick: { alignWithLabel: true }
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    name: 'Người dùng mới',
    type: 'bar',
    barWidth: '60%',
    data: [120, 180, 150, 200, 250, 180, 140],
    itemStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ]
      }
    }
  }]
}))

definePageMeta({
  layout: 'admin'
})

const updateStats = () => {
  // Tính thời gian trong ngày để điều chỉnh tốc độ biến động
  const hour = new Date().getHours()
  let activityMultiplier = 1

  // Điều chỉnh hệ số hoạt động theo giờ
  if (hour >= 9 && hour <= 11) activityMultiplier = 1.5 // Cao điểm sáng
  else if (hour >= 13 && hour <= 16) activityMultiplier = 1.3 // Cao điểm chiều
  else if (hour >= 22 || hour <= 5) activityMultiplier = 0.3 // Đêm khuya
  
  // Tạo biến động cho số người dùng (tăng chậm và ổn định)
  const userChange = Math.floor(Math.random() * 3) * activityMultiplier
  if (Math.random() > 0.7) { // 30% cơ hội tăng
    stats.value.totalUsers = Math.floor(stats.value.totalUsers + userChange)
  }

  // Biến động số ví (tương quan với số user)
  if (Math.random() > 0.8) { // 20% cơ hội tăng
    stats.value.totalWallets = Math.floor(stats.value.totalWallets + Math.floor(userChange * 0.8))
  }

  // Biến động giao dịch (thay đổi nhanh hơn)
  const transactionChange = Math.floor(Math.random() * 5000000 * activityMultiplier)
  stats.value.todayTransactions += transactionChange

  // Cập nhật phần trăm tăng trưởng
  const timeDiff = (new Date() - stats.value.lastUpdate) / 1000 // số giây
  if (timeDiff > 60) { // Cập nhật sau mỗi phút
    stats.value.userGrowth = +(((userChange * 60) / stats.value.totalUsers) * 100).toFixed(1)
    stats.value.walletGrowth = +(((Math.floor(userChange * 0.8) * 60) / stats.value.totalWallets) * 100).toFixed(1)
    stats.value.transactionChange = +(((transactionChange * 60) / stats.value.todayTransactions) * 100).toFixed(1)
    stats.value.lastUpdate = new Date()
  }

  // Cập nhật cảnh báo hệ thống
  if (Math.random() > 0.995) { // 0.5% cơ hội có cảnh báo mới
    stats.value.alerts += 1
    if (Math.random() > 0.7) { // 30% là cảnh báo nghiêm trọng
      stats.value.highPriorityAlerts += 1
    }
  }
}

onMounted(() => {
  // Reset giao dịch hàng ngày vào lúc 0h
  const resetDaily = () => {
    const now = new Date()
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      stats.value.todayTransactions = 0
      stats.value.transactionChange = 0
    }
  }

  // Cập nhật mỗi giây
  setInterval(updateStats, 1000)
  
  // Kiểm tra reset hàng ngày mỗi phút
  setInterval(resetDaily, 60000)
})

onUnmounted(() => {
  // Dọn dẹp intervals khi component bị hủy
  clearInterval(updateStats)
  clearInterval(resetDaily)
  
  // Dọn dẹp interval
  if (transactionInterval) {
    clearInterval(transactionInterval)
  }
})

const generateRandomTransaction = () => {
  const types = ['Chuyển khoản', 'Nạp tiền', 'Rút tiền', 'Thanh toán']
  const statuses = ['Thành công', 'Đang xử lý', 'Thất bại'] 
  
  // Danh sách ngân hàng phổ biến
  const banks = ['Vietcombank', 'Techcombank', 'MB Bank', 'ACB', 'VPBank', 'BIDV', 'Agribank']
  
  // Danh sách tên thực tế
  const users = [
    'Nguyễn Thị Ánh', 'Trần Văn Bình', 'Lê Hoàng Cường', 
    'Phạm Thị Diễm', 'Hoàng Văn Em', 'Vũ Thị Phương',
    'Đặng Minh Quân', 'Bùi Thị Hương', 'Phan Văn Khoa',
    'Ngô Thị Lan', 'Đỗ Văn Mạnh', 'Lý Thị Ngọc'
  ]

  // Phân bố xác suất cho các loại giao dịch
  const typeRandom = Math.random()
  let type
  if (typeRandom < 0.4) type = types[0] // 40% Chuyển khoản
  else if (typeRandom < 0.7) type = types[1] // 30% Nạp tiền
  else if (typeRandom < 0.9) type = types[2] // 20% Rút tiền
  else type = types[3] // 10% Thanh toán

  // Phân bố xác suất cho trạng thái
  const statusRandom = Math.random()
  let status
  if (statusRandom < 0.85) status = statuses[0] // 85% Thành công
  else if (statusRandom < 0.95) status = statuses[1] // 10% Đang xử lý
  else status = statuses[2] // 5% Thất bại

  // Tạo số tiền ngẫu nhiên theo loại giao dịch
  let amount
  switch (type) {
    case 'Chuyển khoản':
      amount = Math.floor(Math.random() * 9000000) + 1000000 // 1-10M
      break
    case 'Nạp tiền':
      amount = Math.floor(Math.random() * 19000000) + 1000000 // 1-20M
      break
    case 'Rút tiền':
      amount = Math.floor(Math.random() * 14000000) + 1000000 // 1-15M
      break
    case 'Thanh toán':
      amount = Math.floor(Math.random() * 4000000) + 100000 // 100k-4M
      break
    default:
      amount = Math.floor(Math.random() * 9000000) + 1000000
  }

  // Tạo mô tả giao dịch
  let description = ''
  const randomBank = banks[Math.floor(Math.random() * banks.length)]
  const randomUser = users[Math.floor(Math.random() * users.length)]
  
  switch (type) {
    case 'Chuyển khoản':
      description = `Chuyển tiền cho ${randomUser}`
      break
    case 'Nạp tiền':
      description = `Nạp tiền từ ${randomBank}`
      break
    case 'Rút tiền':
      description = `Rút tiền về ${randomBank}`
      break
    case 'Thanh toán':
      description = `Thanh toán dịch vụ/hóa đơn`
      break
  }

  return {
    id: 'TRX' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    user: randomUser,
    type,
    amount: formatCurrency(amount),
    status,
    description
  }
}

const updateRecentTransactions = () => {
  // Tạo xác suất 30% sẽ có giao dịch mới
  if (Math.random() < 0.3) {
    const newTransaction = generateRandomTransaction()
    recentTransactions.value.unshift(newTransaction)
    recentTransactions.value = recentTransactions.value.slice(0, 4) // Giữ chỉ 4 giao dịch gần nhất
  }
}
</script>
