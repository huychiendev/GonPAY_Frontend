<!-- pages/admin/transactions/index.vue -->
<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <ACard v-for="stat in stats" :key="stat.title">
        <AStatistic :title="stat.title" :value="stat.value" :prefix="stat.prefix" :suffix="stat.suffix"
          :precision="stat.precision" :value-style="{ color: stat.color }">
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
          <AInput v-model:value="searchText" placeholder="Tìm kiếm theo mã, mô tả, số ví..." class="w-64" allowClear
            @input="handleSearchInput">
            <template #prefix>
              <SearchOutlined />
            </template>
          </AInput>
          <ASelect v-model:value="filterType" placeholder="Loại giao dịch" class="w-32"
            @change="handleFilterTypeChange">
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="DEPOSIT">Nạp tiền</ASelectOption>
            <ASelectOption value="WITHDRAW">Rút tiền</ASelectOption>
            <ASelectOption value="TRANSFER">Chuyển tiền</ASelectOption>
          </ASelect>
          <ASelect v-model:value="filterStatus" placeholder="Trạng thái" class="w-32"
            @change="handleFilterStatusChange">
            <ASelectOption value="">Tất cả</ASelectOption>
            <ASelectOption value="COMPLETED">Thành công</ASelectOption>
            <ASelectOption value="PENDING">Đang xử lý</ASelectOption>
            <ASelectOption value="FAILED">Thất bại</ASelectOption>
          </ASelect>
          <ARangePicker v-model:value="dateRange" class="w-64" :show-time="true" @change="handleDateRangeChange" />
        </div>
        <div class="space-x-2">
          <AButton @click="handleRefresh">
            <template #icon>
              <ReloadOutlined />
            </template>
            Làm mới
          </AButton>
          <AButton type="primary" @click="handleExport">
            <template #icon>
              <DownloadOutlined />
            </template>
            Xuất báo cáo
          </AButton>
          <AButton @click="handleResetFilters">
            <template #icon>
              <ClearOutlined />
            </template>
            Xóa bộ lọc
          </AButton>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <ATable :columns="columns" :data-source="filteredTransactions" :loading="loading" :pagination="pagination"
      @change="handleTableChange">
      <template #emptyText>
        <div class="text-center py-8">
          <InboxOutlined style="font-size: 48px; color: #ccc" />
          <p class="mt-2">
            {{ searchText ?
              'Không tìm thấy giao dịch nào phù hợp với từ khóa tìm kiếm' :
              'Không có giao dịch nào'
            }}
          </p>
        </div>
      </template>
      <!-- Transaction ID -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'transaction_id'">
          <div class="flex items-center">
            <span class="font-mono">{{ record.transaction_id }}</span>
            <ACopyOutlined class="ml-2 cursor-pointer text-gray-400 hover:text-primary"
              @click="copyToClipboard(record.transaction_id)" />
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
              <template #icon>
                <EyeOutlined />
              </template>
            </AButton>
            <ADropdown>
              <template #overlay>
                <AMenu>
                  <AMenuItem key="retry" v-if="record.status === 'FAILED'" @click="handleRetryTransaction(record)">
                    <RedoOutlined /> Thử lại
                  </AMenuItem>
                  <AMenuItem key="cancel" v-if="record.status === 'PENDING'" @click="handleCancelTransaction(record)">
                    <StopOutlined /> Hủy bỏ
                  </AMenuItem>
                  <AMenuItem key="export" @click="handleExportTransaction(record)">
                    <DownloadOutlined /> Xuất PDF
                  </AMenuItem>
                </AMenu>
              </template>
              <AButton type="link" size="small">
                <template #icon>
                  <MoreOutlined />
                </template>
              </AButton>
            </ADropdown>
          </div>
        </template>
      </template>
    </ATable>

    <!-- Transaction Details Modal -->
    <AModal v-model:visible="detailsVisible" title="Chi tiết giao dịch" :footer="null" width="700px">
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

    <ExportModal 
      :visible="modal"
      @update:visible="modal = $event"
      :data="filteredTransactions"
      :columns="exportOptions.columns"
      @success="handleExportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
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
  CopyOutlined,
  ClearOutlined,
  InboxOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { debounce } from 'lodash'
import ExportModal from '~/components/ExportModal.vue'
import { ExportService } from '~/services/exportService'
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
const modal = ref(false)

// Thêm các options cho việc xuất báo cáo
const exportOptions = {
  columns: [
    { key: 'transaction_id', title: 'Mã giao dịch' },
    { key: 'type', title: 'Loại giao dịch' },
    { key: 'amount', title: 'Số tiền' },
    { key: 'status', title: 'Trạng thái' },
    { key: 'source_wallet', title: 'Ví nguồn' },
    { key: 'destination_wallet', title: 'Ví đích' },
    { key: 'created_at', title: 'Thời gian' },
    { key: 'description', title: 'Mô tả' }
  ]
}

// Thm computed property để lọc transactions
const filteredTransactions = computed(() => {
  return transactions.value.filter(transaction => {
    // Tìm kiếm theo nhiều trường
    const searchFields = [
      transaction.transaction_id,
      transaction.description,
      transaction.source_wallet,
      transaction.destination_wallet,
      formatCurrency(transaction.amount)
    ].map(field => (field || '').toLowerCase())

    const searchTerms = searchText.value.toLowerCase().split(' ')
    const matchesSearch = !searchText.value || searchTerms.every(term =>
      searchFields.some(field => field.includes(term))
    )

    // Các điều kiện lọc khác
    const matchesType = !filterType.value || transaction.type === filterType.value
    const matchesStatus = !filterStatus.value || transaction.status === filterStatus.value

    // Lọc theo khoảng thời gian
    let matchesDate = true
    if (dateRange.value && dateRange.value.length === 2) {
      const transactionDate = new Date(transaction.created_at)
      const startDate = new Date(dateRange.value[0])
      const endDate = new Date(dateRange.value[1])
      matchesDate = transactionDate >= startDate && transactionDate <= endDate
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate
  })
})

// Thêm các hàm tiện ích mới
const generateDateLabels = (days) => {
  const labels = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    labels.push(date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }))
  }
  return labels
}

const generateRandomData = (days, min, max) => {
  return Array.from({ length: days }, () =>
    Math.floor(Math.random() * (max - min + 1) + min) * 1000000
  )
}

// Cập nhật computed chartOption
const chartOption = computed(() => {
  // Xác định số ngày dựa trên chartTimeRange
  const days = chartTimeRange.value === '7d' ? 7 :
    chartTimeRange.value === '30d' ? 30 : 90

  // Tạo labels cho trục X
  const xAxisLabels = generateDateLabels(days)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
      formatter: (params) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach(param => {
          result += `${param.seriesName}: ${formatCurrency(param.value)}<br/>`
        })
        return result
      }
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
      data: xAxisLabels,
      axisLabel: {
        rotate: days > 7 ? 45 : 0, // Xoay nhãn nếu có nhiều dữ liệu
        interval: days > 30 ? 'auto' : 0 // Tự động bỏ bớt nhãn nếu quá nhiều
      }
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
        areaStyle: { opacity: 0.3 },
        emphasis: { focus: 'series' },
        data: generateRandomData(days, 10, 100),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Rút tiền',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        emphasis: { focus: 'series' },
        data: generateRandomData(days, 5, 50),
        itemStyle: { color: '#faad14' }
      },
      {
        name: 'Chuyển tiền',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        emphasis: { focus: 'series' },
        data: generateRandomData(days, 15, 80),
        itemStyle: { color: '#1890ff' }
      }
    ]
  }
})

// Thêm watch để cập nhật biểu đồ khi thay đổi khoảng thời gian
watch(chartTimeRange, () => {
  // Có thể thêm loading state nếu cần
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
})

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
  searchText.value = value
  // Reset trang về 1 khi tìm kiếm
  pagination.current = 1
}

const handleFilterTypeChange = (value) => {
  filterType.value = value
}

const handleFilterStatusChange = (value) => {
  filterStatus.value = value
}

const handleDateRangeChange = (dates) => {
  dateRange.value = dates
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const handleExport = () => {
  modal.value = true
}

const handleExportSuccess = () => {
  message.success('Xuất báo cáo thành công')
  modal.value = false
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
  loading.value = true

  // Áp dụng các bộ lọc từ table
  if (filters.type) {
    filterType.value = filters.type[0]
  }
  if (filters.status) {
    filterStatus.value = filters.status[0]
  }

  // Áp dụng sắp xếp
  if (sorter.field) {
    const order = sorter.order === 'ascend' ? 1 : -1
    transactions.value.sort((a, b) => {
      if (sorter.field === 'amount') {
        return (a.amount - b.amount) * order
      }
      if (sorter.field === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order
      }
      return 0
    })
  }

  setTimeout(() => {
    loading.value = false
  }, 500)
}

// Lifecycle
onMounted(() => {
  handleRefresh()

  // Cập nhật số liệu mỗi giây
  const statsInterval = setInterval(updateRealtimeStats, 1000)

  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})
definePageMeta({
  layout: 'admin'
})

const updateRealtimeStats = () => {
  const hour = new Date().getHours()
  let activityMultiplier = 1

  // Điều chỉnh hệ số hoạt động theo giờ
  if (hour >= 9 && hour <= 11) activityMultiplier = 1.5 // Cao điểm sáng
  else if (hour >= 13 && hour <= 16) activityMultiplier = 1.3 // Cao điểm chiều
  else if (hour >= 22 || hour <= 5) activityMultiplier = 0.3 // Đêm khuya

  // Cập nhật stats
  stats.forEach(stat => {
    switch (stat.title) {
      case 'Tổng giao dịch':
        stat.value += Math.floor(Math.random() * 3) * activityMultiplier
        stat.trend = +(Math.random() * 3 + 7).toFixed(1)
        break
      case 'Tổng giá trị':
        stat.value += Math.floor(Math.random() * 50000000 * activityMultiplier)
        stat.trend = +(Math.random() * 5 + 10).toFixed(1)
        break
      case 'Tỷ lệ thành công':
        stat.value = +(Math.random() * 2 + 97).toFixed(1)
        stat.trend = +(Math.random() * 2 - 1).toFixed(1)
        break
      case 'Giao dịch/giờ':
        stat.value = Math.floor(200 + Math.random() * 100 * activityMultiplier)
        stat.trend = +(Math.random() * 8 - 4).toFixed(1)
        break
    }
  })

  // Thêm giao dịch mới ngẫu nhiên
  if (Math.random() > 0.7) {
    const newTransaction = generateRandomTransaction()
    transactions.value.unshift(newTransaction)
    if (transactions.value.length > 100) {
      transactions.value.pop()
    }
  }
}

const generateRandomTransaction = () => {
  const types = ['DEPOSIT', 'WITHDRAW', 'TRANSFER']
  const statuses = ['COMPLETED', 'PENDING', 'FAILED']
  const banks = ['Vietcombank', 'Techcombank', 'MB Bank', 'ACB', 'VPBank', 'BIDV', 'Agribank']
  const users = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường',
    'Phạm Minh Đức', 'Hoàng Thị Em', 'Vũ Đình Phúc',
    'Đặng Thu Hà', 'Bùi Quang Khải', 'Ngô Thị Lan'
  ]

  const type = types[Math.floor(Math.random() * types.length)]
  const status = Math.random() > 0.9 ? 'FAILED' : Math.random() > 0.8 ? 'PENDING' : 'COMPLETED'

  let description = ''
  const amount = Math.floor(Math.random() * 15000000) + 1000000

  switch (type) {
    case 'DEPOSIT':
      description = `Nạp tiền từ ${banks[Math.floor(Math.random() * banks.length)]}`
      break
    case 'WITHDRAW':
      description = `Rút tiền về ${banks[Math.floor(Math.random() * banks.length)]}`
      break
    case 'TRANSFER':
      description = `Chuyển tiền cho ${users[Math.floor(Math.random() * users.length)]}`
      break
  }

  return {
    key: Date.now().toString(),
    transaction_id: 'TRX' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    type,
    amount,
    status,
    source_wallet: 'W' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    destination_wallet: type === 'TRANSFER' ? 'W' + Math.random().toString(36).substr(2, 9).toUpperCase() : null,
    created_at: new Date().toISOString(),
    description,
    timeline: generateTimeline(status)
  }
}

const generateTimeline = (status) => {
  const timeline = [
    { status: 'CREATED', message: 'Tạo giao dịch', timestamp: new Date().toISOString() }
  ]

  if (status !== 'CREATED') {
    timeline.push({
      status: 'PROCESSING',
      message: 'Đang xử lý',
      timestamp: new Date(Date.now() + 1000).toISOString()
    })

    if (status === 'COMPLETED') {
      timeline.push({
        status: 'COMPLETED',
        message: 'Hoàn thành',
        timestamp: new Date(Date.now() + 2000).toISOString()
      })
    } else if (status === 'FAILED') {
      timeline.push({
        status: 'FAILED',
        message: 'Thất bại',
        timestamp: new Date(Date.now() + 2000).toISOString(),
        error_message: 'Lỗi kết nối ến ngân hàng'
      })
    }
  }

  return timeline
}

const handleResetFilters = () => {
  searchText.value = ''
  filterType.value = ''
  filterStatus.value = ''
  dateRange.value = null
}

// Tạo hàm debounced search
const debouncedSearch = debounce((value) => {
  handleSearch(value)
}, 300)

// Sử dụng trong template
const handleSearchInput = (e) => {
  debouncedSearch(e.target.value)
}
</script>

<style scoped>
.ant-timeline {
  max-height: 200px;
  overflow-y: auto;
}
</style>
