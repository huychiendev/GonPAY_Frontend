<!-- pages/admin/wallets/index.vue -->
<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <ACard v-for="stat in stats" :key="stat.title">
        <AStatistic
            :title="stat.title"
            :value="stat.value"
            :precision="stat.precision"
            :prefix="stat.prefix"
            :suffix="stat.suffix"
            :value-style="{ color: stat.color }"
        />
        <template #extra>
          <small :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}% so với tháng trước
          </small>
        </template>
      </ACard>
    </div>

    <!-- Chart Section -->
    <ACard title="Biểu đồ số dư ví" :bordered="false">
      <div style="height: 300px">
        <VChart class="w-full h-full" :option="chartOption" autoresize />
      </div>
    </ACard>

    <!-- Filters and Actions -->
    <div class="flex justify-between items-center flex-wrap gap-4">
      <div class="flex items-center space-x-4">
        <AInputSearch
            v-model:value="searchText"
            placeholder="Tìm kiếm ví..."
            class="w-64"
            @search="handleSearch"
        />
        <ASelect
            v-model:value="filterStatus"
            placeholder="Trạng thái"
            class="w-32"
        >
          <ASelectOption value="">Tất cả</ASelectOption>
          <ASelectOption value="ACTIVE">Hoạt động</ASelectOption>
          <ASelectOption value="INACTIVE">Đã khóa</ASelectOption>
        </ASelect>
        <ADatePicker
            v-model:value="filterDate"
            placeholder="Ngày tạo"
            class="w-48"
        />
      </div>
      <div class="space-x-2">
        <AButton type="primary" @click="handleCreateWallet">
          <template #icon><PlusOutlined /></template>
          Tạo ví mới
        </AButton>
        <AButton @click="handleRefresh">
          <template #icon><ReloadOutlined /></template>
          Làm mới
        </AButton>
      </div>
    </div>

    <!-- Data Table -->
    <ATable
        :columns="columns"
        :data-source="wallets"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
    >
      <!-- Wallet Number Column -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'wallet_number'">
          <div class="flex items-center">
            <WalletOutlined class="mr-2 text-primary" />
            <span>{{ record.wallet_number }}</span>
          </div>
        </template>

        <!-- Balance Column -->
        <template v-if="column.key === 'balance'">
          <span :class="record.balance >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ formatCurrency(record.balance) }}
          </span>
        </template>

        <!-- Status Column -->
        <template v-if="column.key === 'status'">
          <ATag :color="record.status === 'ACTIVE' ? 'success' : 'error'">
            {{ record.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}
          </ATag>
        </template>

        <!-- Actions Column -->
        <template v-if="column.key === 'actions'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="handleViewDetails(record)">
              <template #icon><EyeOutlined /></template>
            </AButton>
            <AButton
                type="link"
                size="small"
                :danger="record.status === 'ACTIVE'"
                @click="handleToggleStatus(record)"
            >
              <template #icon>
                <LockOutlined v-if="record.status === 'ACTIVE'" />
                <UnlockOutlined v-else />
              </template>
            </AButton>
            <ADropdown>
              <template #overlay>
                <AMenu>
                  <AMenuItem key="transfer" @click="handleTransfer(record)">
                    <template #icon><SwapOutlined /></template>
                    Chuyển tiền
                  </AMenuItem>
                  <AMenuItem key="history" @click="handleViewHistory(record)">
                    <template #icon><HistoryOutlined /></template>
                    Lịch sử giao dịch
                  </AMenuItem>
                  <AMenuItem key="export" @click="handleExport(record)">
                    <template #icon><DownloadOutlined /></template>
                    Xuất báo cáo
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

    <!-- Details Modal -->
    <AModal
        v-model:visible="detailsVisible"
        title="Chi tiết ví"
        :footer="null"
        width="700px"
    >
      <ADescriptions bordered :column="2">
        <ADescriptionsItem label="Số ví">
          {{ selectedWallet?.wallet_number }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Số dư">
          {{ formatCurrency(selectedWallet?.balance) }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Trạng thái">
          <ATag :color="selectedWallet?.status === 'ACTIVE' ? 'success' : 'error'">
            {{ selectedWallet?.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}
          </ATag>
        </ADescriptionsItem>
        <ADescriptionsItem label="Ngày tạo">
          {{ formatDate(selectedWallet?.created_at) }}
        </ADescriptionsItem>
        <ADescriptionsItem label="Giao dịch gần đây" :span="2">
          {{ selectedWallet?.last_transaction }}
        </ADescriptionsItem>
      </ADescriptions>

      <div class="mt-4">
        <h4>Biểu đồ giao dịch 7 ngày gần đây</h4>
        <div style="height: 200px">
          <VChart class="w-full h-full" :option="transactionChartOption" autoresize />
        </div>
      </div>
    </AModal>

    <!-- Create Wallet Modal -->
    <AModal
        v-model:visible="createWalletVisible"
        title="Tạo ví mới"
        @ok="handleCreateWalletSubmit"
        :confirmLoading="submitting"
    >
      <AForm :model="walletForm" layout="vertical">
        <AFormItem label="Chủ ví" required>
          <ASelect
              v-model:value="walletForm.owner_id"
              placeholder="Chọn chủ ví"
              show-search
              :options="userOptions"
          />
        </AFormItem>
        
        <AFormItem label="Loại ví" required>
          <ASelect v-model:value="walletForm.type">
            <ASelectOption value="PERSONAL">Cá nhân</ASelectOption>
            <ASelectOption value="BUSINESS">Doanh nghiệp</ASelectOption>
            <ASelectOption value="SAVING">Tiết kiệm</ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem label="Hạn mức giao dịch">
          <div class="space-y-2">
            <div class="flex items-center gap-4">
              <span class="w-24">Hàng ngày:</span>
              <AInputNumber 
                  v-model:value="walletForm.limits.daily"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                  class="w-full"
                  addon-after="VND"
              />
            </div>
            <div class="flex items-center gap-4">
              <span class="w-24">Hàng tháng:</span>
              <AInputNumber
                  v-model:value="walletForm.limits.monthly" 
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
                  class="w-full"
                  addon-after="VND"
              />
            </div>
          </div>
        </AFormItem>

        <AFormItem label="Ghi chú">
          <ATextarea v-model:value="walletForm.note" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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
  WalletOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  SwapOutlined,
  HistoryOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'

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
    title: 'Tổng số ví',
    value: 1234,
    precision: 0,
    prefix: '',
    suffix: '',
    color: '#1890ff',
    trend: 12.3,
    chartData: [30, 40, 35, 50, 49, 60, 70, 91, 125]
  },
  {
    title: 'Tổng số dư',
    value: 123456789000,
    precision: 0,
    prefix: '₫',
    suffix: '',
    color: '#52c41a',
    trend: 8.5,
    chartData: [50, 60, 55, 70, 69, 80, 90, 111, 145]
  },
  {
    title: 'Ví hoạt động',
    value: 89.2,
    precision: 1,
    prefix: '',
    suffix: '%',
    color: '#722ed1',
    trend: -2.1
  },
  {
    title: 'Giao dịch hôm nay',
    value: 456,
    precision: 0,
    prefix: '',
    suffix: '',
    color: '#faad14',
    trend: 15.7
  }
])

// Mock data for wallets
const wallets = ref([
  {
    key: '1',
    wallet_number: 'W123456789',
    balance: 5000000,
    status: 'ACTIVE',
    created_at: '2024-03-18T10:00:00Z',
    owner: 'Nguyễn Văn A',
    type: 'PERSONAL',
    transaction_count: 15,
    last_transaction: '2024-03-18T15:00:00Z',
    currency: 'VND',
    limits: {
      daily: 100000000,
      monthly: 1000000000
    }
  },
  {
    key: '2', 
    wallet_number: 'W987654321',
    balance: 10000000,
    status: 'ACTIVE', 
    created_at: '2024-03-17T09:00:00Z',
    owner: 'Công ty TNHH ABC',
    type: 'BUSINESS',
    transaction_count: 25,
    last_transaction: '2024-03-18T14:30:00Z',
    currency: 'VND',
    limits: {
      daily: 500000000,
      monthly: 5000000000
    }
  },
  {
    key: '3',
    wallet_number: 'W456789123',
    balance: 2000000,
    status: 'INACTIVE',
    created_at: '2024-03-16T11:00:00Z', 
    owner: 'Trần Thị B',
    type: 'PERSONAL',
    transaction_count: 8,
    last_transaction: '2024-03-17T09:15:00Z',
    currency: 'VND',
    limits: {
      daily: 50000000,
      monthly: 500000000
    }
  },
  // Thêm 7 ví nữa với dữ liệu tương tự...
])

// Table columns
const columns = [
  {
    title: 'Số ví',
    dataIndex: 'wallet_number',
    key: 'wallet_number',
    sorter: true
  },
  {
    title: 'Số dư',
    dataIndex: 'balance',
    key: 'balance',
    sorter: true
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    filters: [
      { text: 'Hoạt động', value: 'ACTIVE' },
      { text: 'Đã khóa', value: 'INACTIVE' }
    ]
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'created_at',
    key: 'created_at',
    sorter: true
  },
  {
    title: 'Thao tác',
    key: 'actions',
    fixed: 'right',
    width: 120
  }
]

// State
const searchText = ref('')
const filterStatus = ref('')
const filterDate = ref()
const loading = ref(false)
const detailsVisible = ref(false)
const selectedWallet = ref(null)
const createWalletVisible = ref(false)
const submitting = ref(false)
const walletForm = reactive({
  owner_id: undefined,
  type: 'PERSONAL',
  limits: {
    daily: 100000000,
    monthly: 1000000000
  },
  note: ''
})
const userOptions = [
  { value: 1, label: 'Nguyễn Văn A' },
  { value: 2, label: 'Trần Thị B' },
  { value: 3, label: 'Công ty TNHH ABC' }
]

// Chart options
const chartOption = reactive({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [150, 230, 224, 218, 135, 147, 260],
    type: 'line',
    smooth: true
  }]
})

const transactionChartOption = reactive({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  },
  yAxis: {
    type: 'value'
  },
  series: [{
    data: [10, 15, 8, 12, 9, 11, 13],
    type: 'bar'
  }]
})

// Thêm các biến state
const showTransferModal = ref(false)
const showHistoryDrawer = ref(false)
const transactionHistory = ref([])

// Methods
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN')
}

const handleSearch = (value) => {
  console.log('Search:', value)
}

const handleCreateWallet = () => {
  createWalletVisible.value = true
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const handleViewDetails = (record) => {
  selectedWallet.value = record
  detailsVisible.value = true
}

const handleToggleStatus = (record) => {
  console.log('Toggle status:', record)
}

const handleTransfer = async (wallet) => {
  showTransferModal.value = true
  selectedWallet.value = wallet
}

const handleViewHistory = async (wallet) => {
  showHistoryDrawer.value = true
  selectedWallet.value = wallet
  
  // Mock data lịch sử giao dịch
  transactionHistory.value = [
    {
      id: 'TRX001',
      type: 'TRANSFER',
      amount: 1000000,
      status: 'SUCCESS', 
      created_at: '2024-03-18T15:00:00Z',
      description: 'Chuyển tiền cho Nguyễn Văn B',
      from_wallet: wallet.wallet_number,
      to_wallet: 'W987654321'
    },
    {
      id: 'TRX002', 
      type: 'RECEIVE',
      amount: 2000000,
      status: 'SUCCESS',
      created_at: '2024-03-17T10:30:00Z', 
      description: 'Nhận tiền từ Trần Thị C',
      from_wallet: 'W456789123',
      to_wallet: wallet.wallet_number
    },
    {
      id: 'TRX003',
      type: 'WITHDRAW',
      amount: 500000,
      status: 'PENDING',
      created_at: '2024-03-16T09:15:00Z',
      description: 'Rút tiền về tài khoản ngân hàng',
      from_wallet: wallet.wallet_number,
      to_bank: 'Vietcombank'
    }
  ]
}

const handleExport = async (wallet) => {
  try {
    message.loading('Đang xuất báo cáo...')
    // Mock xuất file Excel/PDF
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('Đã xuất báo cáo thành công')
    
    // Tạo mock data để tải về
    const data = {
      wallet_info: wallet,
      transactions: transactionHistory.value,
      generated_at: new Date().toISOString()
    }
    
    // Tải file xuống
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wallet-report-${wallet.wallet_number}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    
  } catch (error) {
    message.error('Không thể xuất báo cáo')
    console.error(error)
  }
}

const handleLockWallet = async (wallet) => {
  try {
    // Gọi API khóa ví
    await lockWallet(wallet.id)
    message.success('Đã khóa ví thành công')
    await fetchWallets() // Refresh danh sách
  } catch (error) {
    message.error('Không thể khóa ví')
  }
}

const handleTableChange = (pagination, filters, sorter) => {
  console.log('Table change:', { pagination, filters, sorter })
}

const handleCreateWalletSubmit = async () => {
  submitting.value = true
  try {
    // Gọi API tạo ví mới
    await createWallet(walletForm)
    createWalletVisible.value = false
    message.success('Đã tạo ví mới thành công')
    await fetchWallets() // Refresh danh sách
  } catch (error) {
    message.error('Không thể tạo ví mới')
  } finally {
    submitting.value = false
  }
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
.ant-statistic-content {
  font-size: 20px;
}
</style>
