<!-- pages/admin/transactions/index.vue -->
<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <ACard v-for="stat in stats" :key="stat.title">
        <AStatistic
            :title="stat.title"
            :value="stat.value"
            :prefix="stat.prefix"
            :suffix="stat.suffix"
            :precision="stat.precision"
            :value-style="{ color: stat.color }"
        >
          <template #suffix>
            <span class="text-xs ml-2" :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%
            </span>
          </template>
        </AStatistic>
      </ACard>
    </div>

    <!-- Transaction Chart -->
    <ACard title="Biểu đồ giao dịch" :bordered="false">
      <div class="flex justify-end mb-4 space-x-2">
        <ARadioGroup v-model:value="chartTimeRange" size="small">
          <ARadioButton value="7d">7 ngày</ARadioButton>
          <ARadioButton value="30d">30 ngày</ARadioButton>
          <ARadioButton value="90d">90 ngày</ARadioButton>
        </ARadioGroup>
      </div>
      <div style="height: 300px">
        <VChart class="w-full h-full" :option="chartOption" autoresize />
      </div>
    </ACard>

    <!-- Filters Section -->
    <div class="bg-white p-4 rounded-lg space-y-4">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <div class="flex flex-wrap gap-4 items-center">
          <AInputSearch
              v-model:value="searchText"
              placeholder="Tìm kiếm giao dịch..."
              class="w-64"
              @search="handleSearch"
          />
          <ASelect
              v-model:value="filterType"
              placeholder="Loại giao dịch"
              class="w-40"
          >
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="DEPOSIT">Nạp tiền</ASelectOption>
            <ASelectOption value="WITHDRAW">Rút tiền</ASelectOption>
            <ASelectOption value="TRANSFER">Chuyển tiền</ASelectOption>
          </ASelect>
          <ASelect
              v-model:value="filterStatus"
              placeholder="Trạng thái"
              class="w-40"
          >
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="COMPLETED">Thành công</ASelectOption>
            <ASelectOption value="PENDING">Đang xử lý</ASelectOption>
            <ASelectOption value="FAILED">Thất bại</ASelectOption>
          </ASelect>
          <ARangePicker
              v-model:value="dateRange"
              class="w-64"
              :show-time="true"
          />
        </div>
        <div class="space-x-2">
          <AButton @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            Làm mới
          </AButton>
          <AButton type="primary" @click="handleExport">
            <template #icon><DownloadOutlined /></template>
            Xuất báo cáo
          </AButton>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <ATable
        :columns="columns"
        :data-source="transactions"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
    >
      <!-- Transaction ID -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'transaction_id'">
          <div class="flex items-center">
            <span class="font-mono">{{ record.transaction_id }}</span>
            <ACopyOutlined
                class="ml-2 cursor-pointer text-gray-400 hover:text-primary"
                @click="copyToClipboard(record.transaction_id)"
            />
          </div>
        </template>

        <!-- Type Column -->
        <template v-if="column.key === 'type'">
          <div class="flex items-center">
            <ATag :color="getTransactionTypeColor(record.type)">
              <template #icon>
                <component :is="getTransactionTypeIcon(record.type)" />
              </template>
              {{ getTransactionTypeName(record.type) }}
            </ATag>
          </div>
        </template>

        <!-- Amount Column -->
        <template v-if="column.key === 'amount'">
          <span :class="getAmountColor(record)">
            {{ record.type === 'WITHDRAW' ? '-' : '+' }}
            {{ formatCurrency(record.amount) }}
          </span>
        </template>

        <!-- Status Column -->
        <template v-if="column.key === 'status'">
          <ATag :color="getStatusColor(record.status)">
            {{ getStatusName(record.status) }}
          </ATag>
        </template>

        <!-- Actions Column -->
        <template v-if="column.key === 'actions'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="showTransactionDetails(record)">
              <template #icon><EyeOutlined /></template>
            </AButton>
            <ADropdown>
              <template #overlay>
                <AMenu>
                  <AMenuItem key="retry" v-if="record.status === 'FAILED'"
                             @click="handleRetryTransaction(record)">
                    <RedoOutlined /> Thử lại
                  </AMenuItem>
                  <AMenuItem key="cancel" v-if="record.status === 'PENDING'"
                             @click="handleCancelTransaction(record)">
                    <StopOutlined /> Hủy bỏ
                  </AMenuItem>
                  <AMenuItem key="export" @click="handleExportTransaction(record)">
                    <DownloadOutlined /> Xuất PDF
                  </AMenuItem>
                </AMenu>
              </template>
              <AButton type="link" size="small">
                <template #icon><MoreOutlined /></template>
              </AButton>
            </ADropdown>
          </div>
        </template>
      </template>
    </ATable>

    <!-- Transaction Details Modal -->
    <AModal
        v-model:visible="detailsVisible"
        title="Chi tiết giao dịch"
        :footer="null"
        width="700px"
    >
      <ADescriptions v-if="selectedTransaction" bordered :column="2">
        <ADescriptionsItem label="Mã giao dịch">
          {{ selectedTransaction.transaction_id }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Loại giao dịch">
          <ATag :color="getTransactionTypeColor(selectedTransaction.type)">
            {{ getTransactionTypeName(selectedTransaction.type) }}
          </ATag>
        </ADescriptionsItem>
        <ADescriptionsItem label="Số tiền">
          {{ formatCurrency(selectedTransaction.amount) }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Trạng thái">
          <ATag :color="getStatusColor(selectedTransaction.status)">
            {{ getStatusName(selectedTransaction.status) }}
          </ATag>
        </ADescriptionsItem>
        <ADescriptionsItem label="Ví nguồn">
          {{ selectedTransaction.source_wallet }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Ví đích" v-if="selectedTransaction.type === 'TRANSFER'">
          {{ selectedTransaction.destination_wallet }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Thời gian">
          {{ formatDateTime(selectedTransaction.created_at) }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Mô tả" :span="2">
          {{ selectedTransaction.description }}
        </ADescriptionsItem>
      </ADescriptions>

      <div v-if="selectedTransaction?.status === 'FAILED'" class="mt-4 p-4 bg-red-50 rounded-lg">
        <h4 class="text-red-500 font-medium">Thông tin lỗi</h4>
        <p>{{ selectedTransaction.error_message }}</p>
      </div>

      <div class="mt-4">
        <h4>Dòng thời gian</h4>
        <ATimeline>
          <ATimelineItem v-for="(log, index) in selectedTransaction?.timeline" :key="index">
            {{ log.message }}
            <template #dot>
              <component :is="getTimelineIcon(log.status)" :style="{ color: getTimelineColor(log.status) }" />
            </template>
            <div class="text-xs text-gray-500">{{ formatDateTime(log.timestamp) }}</div>
          </ATimelineItem>
        </ATimeline>
      </div>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import {
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  MoreOutlined,
  RedoOutlined,
  StopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CopyOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Stats data
const stats = reactive([
  {
    title: 'Tổng giao dịch',
    value: 15234,
    prefix: '',
    suffix: '',
    precision: 0,
    color: '#1890ff',
    trend: 8.5
  },
  {
    title: 'Tổng giá trị',
    value: 4325678900,
    prefix: '₫',
    suffix: '',
    precision: 0,
    color: '#52c41a',
    trend: 12.3
  },
  {
    title: 'Tỷ lệ thành công',
    value: 98.5,
    prefix: '',
    suffix: '%',
    precision: 1,
    color: '#722ed1',
    trend: 0.5
  },
  {
    title: 'Giao dịch/giờ',
    value: 245,
    prefix: '',
    suffix: '',
    precision: 0,
    color: '#faad14',
    trend: -2.1
  }
])

const transactions = ref([
  {
    key: '1',
    transaction_id: 'TRX123456789',
    type: 'DEPOSIT',
    amount: 5000000,
    status: 'COMPLETED',
    source_wallet: 'W123456789',
    destination_wallet: null,
    created_at: '2024-11-18T10:00:00Z',
    description: 'Nạp tiền từ Vietcombank',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-18T10:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-18T10:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-18T10:00:02Z' }
    ]
  },
  {
    key: '2',
    transaction_id: 'TRX987654321',
    type: 'WITHDRAW',
    amount: 2000000,
    status: 'PENDING',
    source_wallet: 'W987654321',
    destination_wallet: null,
    created_at: '2024-11-17T09:00:00Z',
    description: 'Rút tiền về tài khoản ngân hàng',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-17T09:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-17T09:00:01Z' }
    ]
  },
  {
    key: '3',
    transaction_id: 'TRX456789123',
    type: 'TRANSFER',
    amount: 3000000,
    status: 'FAILED',
    source_wallet: 'W456789123',
    destination_wallet: 'W654321987',
    created_at: '2024-11-16T08:00:00Z',
    description: 'Chuyển tiền cho Nguyễn Văn B',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-16T08:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-16T08:00:01Z' },
      { status: 'FAILED', message: 'Thất bại', timestamp: '2024-11-16T08:00:02Z' }
    ]
  },
  {
    key: '4',
    transaction_id: 'TRX654321987',
    type: 'DEPOSIT',
    amount: 1000000,
    status: 'COMPLETED',
    source_wallet: 'W654321987',
    destination_wallet: null,
    created_at: '2024-11-15T07:00:00Z',
    description: 'Nạp tiền từ Vietinbank',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-15T07:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-15T07:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-15T07:00:02Z' }
    ]
  },
  {
    key: '5',
    transaction_id: 'TRX321654987',
    type: 'WITHDRAW',
    amount: 4000000,
    status: 'COMPLETED',
    source_wallet: 'W321654987',
    destination_wallet: null,
    created_at: '2024-11-14T06:00:00Z',
    description: 'Rút tiền về tài khoản ngân hàng',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-14T06:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-14T06:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-14T06:00:02Z' }
    ]
  },
  {
    key: '6',
    transaction_id: 'TRX789123456',
    type: 'TRANSFER',
    amount: 2500000,
    status: 'PENDING',
    source_wallet: 'W789123456',
    destination_wallet: 'W123456789',
    created_at: '2024-11-13T05:00:00Z',
    description: 'Chuyển tiền cho Trần Thị C',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-13T05:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-13T05:00:01Z' }
    ]
  },
  {
    key: '7',
    transaction_id: 'TRX321987654',
    type: 'DEPOSIT',
    amount: 3500000,
    status: 'COMPLETED',
    source_wallet: 'W321987654',
    destination_wallet: null,
    created_at: '2024-11-12T04:00:00Z',
    description: 'Nạp tiền từ Agribank',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-12T04:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-12T04:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-12T04:00:02Z' }
    ]
  },
  {
    key: '8',
    transaction_id: 'TRX654987321',
    type: 'WITHDRAW',
    amount: 1500000,
    status: 'FAILED',
    source_wallet: 'W654987321',
    destination_wallet: null,
    created_at: '2024-11-11T03:00:00Z',
    description: 'Rút tiền về tài khoản ngân hàng',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-11T03:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-11T03:00:01Z' },
      { status: 'FAILED', message: 'Thất bại', timestamp: '2024-11-11T03:00:02Z' }
    ]
  },
  {
    key: '9',
    transaction_id: 'TRX987321654',
    type: 'TRANSFER',
    amount: 4500000,
    status: 'COMPLETED',
    source_wallet: 'W987321654',
    destination_wallet: 'W321654987',
    created_at: '2024-11-10T02:00:00Z',
    description: 'Chuyển tiền cho Công ty TNHH ABC',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-10T02:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-10T02:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-10T02:00:02Z' }
    ]
  },
  {
    key: '10',
    transaction_id: 'TRX123789456',
    type: 'DEPOSIT',
    amount: 6000000,
    status: 'COMPLETED',
    source_wallet: 'W123789456',
    destination_wallet: null,
    created_at: '2024-11-09T01:00:00Z',
    description: 'Nạp tiền từ BIDV',
    timeline: [
      { status: 'CREATED', message: 'Tạo giao dịch', timestamp: '2024-11-09T01:00:00Z' },
      { status: 'PROCESSING', message: 'Đang xử lý', timestamp: '2024-11-09T01:00:01Z' },
      { status: 'COMPLETED', message: 'Hoàn thành', timestamp: '2024-11-09T01:00:02Z' }
    ]
  }
])

// Table columns
const columns = [
  {
    title: 'Mã giao dịch',
    dataIndex: 'transaction_id',
    key: 'transaction_id',
    width: 150
  },
  {
    title: 'Loại',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    filters: [
      { text: 'Nạp tiền', value: 'DEPOSIT' },
      { text: 'Rút tiền', value: 'WITHDRAW' },
      { text: 'Chuyển tiền', value: 'TRANSFER' }
    ]
  },
  {
    title: 'Số tiền',
    dataIndex: 'amount',
    key: 'amount',
    sorter: true,
    width: 150
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    filters: [
      { text: 'Thành công', value: 'COMPLETED' },
      { text: 'Đang xử lý', value: 'PENDING' },
      { text: 'Thất bại', value: 'FAILED' }
    ]
  },
  {
    title: 'Ví nguồn',
    dataIndex: 'source_wallet',
    key: 'source_wallet'
  },
  {
    title: 'Thời gian',
    dataIndex: 'created_at',
    key: 'created_at',
    sorter: true
  },
  {
    title: 'Thao tác',
    key: 'actions',
    fixed: 'right',
    width: 100
  }
]

// State
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const dateRange = ref()
const loading = ref(false)
const detailsVisible = ref(false)
const selectedTransaction = ref(null)
const chartTimeRange = ref('7d')

// Chart options
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
  },
  legend: {
    data: ['Nạp tiền', 'Rút tiền', 'Chuyển tiền']
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
    data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value) => `${value / 1000000}M`
    }
  },
  series: [
    {
      name: 'Nạp tiền',
      type: 'line',
      smooth: true,
      stack: 'Total',
      areaStyle: { opacity: 0.3 },
      emphasis: { focus: 'series' },
      data: [12000000, 13200000, 10100000, 13400000, 90000000, 23000000, 21000000]
    },
    {
      name: 'Rút tiền',
      type: 'line',
      smooth: true,
      stack: 'Total',
      areaStyle: { opacity: 0.3 },
      emphasis: { focus: 'series' },
      data: [22000000, 18200000, 19100000, 23400000, 29000000, 33000000, 31000000]
    },
    {
      name: 'Chuyển tiền',
      type: 'line',
      smooth: true,
      stack: 'Total',
      areaStyle: { opacity: 0.3 },
      emphasis: { focus: 'series' },
      data: [15000000, 23200000, 20100000, 15400000, 19000000, 33000000, 41000000]
    }
  ]
}))

// Utility functions
const getTransactionTypeColor = (type) => {
  const colors = {
    DEPOSIT: 'success',
    WITHDRAW: 'warning',
    TRANSFER: 'processing'
  }
  return colors[type] || 'default'
}

const getTransactionTypeIcon = (type) => {
  const icons = {
    DEPOSIT: ArrowDownOutlined,
    WITHDRAW: ArrowUpOutlined,
    TRANSFER: SwapOutlined
  }
  return icons[type] || null
}

const getTransactionTypeName = (type) => {
  const names = {
    DEPOSIT: 'Nạp tiền',
    WITHDRAW: 'Rút tiền',
    TRANSFER: 'Chuyển tiền'
  }
  return names[type] || type
}

const getStatusColor = (status) => {
  const colors = {
    COMPLETED: 'success',
    PENDING: 'processing',
    FAILED: 'error'
  }
  return colors[status] || 'default'
}

const getStatusName = (status) => {
  const names = {
    COMPLETED: 'Thành công',
    PENDING: 'Đang xử lý',
    FAILED: 'Thất bại'
  }
  return names[status] || status
}

const getTimelineIcon = (status) => {
  const icons = {
    CREATED: CheckCircleOutlined,
    PROCESSING: LoadingOutlined,
    COMPLETED: CheckCircleOutlined,
    FAILED: CloseCircleOutlined
  }
  return icons[status] || CheckCircleOutlined
}

const getTimelineColor = (status) => {
  const colors = {
    CREATED: '#1890ff',
    PROCESSING: '#faad14',
    COMPLETED: '#52c41a',
    FAILED: '#ff4d4f'
  }
  return colors[status] || '#1890ff'
}

const getAmountColor = (record) => {
  if (record.type === 'WITHDRAW') return 'text-red-500'
  return 'text-green-500'
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('vi-VN')
}

// Action handlers
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
  message.success('Đã sao chép mã giao dịch')
}

const handleSearch = (value) => {
  console.log('Search:', value)
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const handleExport = () => {
  message.success('Đang xuất báo cáo...')
}

const showTransactionDetails = (record) => {
  selectedTransaction.value = record
  detailsVisible.value = true
}

const handleRetryTransaction = (record) => {
  message.success(`Đang thử lại giao dịch ${record.transaction_id}`)
}

const handleCancelTransaction = (record) => {
  message.success(`Đã hủy giao dịch ${record.transaction_id}`)
}

const handleExportTransaction = (record) => {
  message.success(`Đang xuất giao dịch ${record.transaction_id}`)
}

const handleTableChange = (pagination, filters, sorter) => {
  console.log('Table change:', { pagination, filters, sorter })
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

// Lifecycle
onMounted(() => {
  handleRefresh()
})
definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.ant-timeline {
  max-height: 200px;
  overflow-y: auto;
}
</style>
