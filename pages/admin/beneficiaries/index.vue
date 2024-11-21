<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Người thụ hưởng</h1>
        <p class="text-gray-500">Quản lý danh sách người thụ hưởng trong hệ thống</p>
      </div>
      <div class="space-x-3">
        <AButton @click="handleImport">
          <template #icon><ImportOutlined /></template>
          Nhập danh sách
        </AButton>
        <AButton type="primary" @click="showAddModal = true">
          <template #icon><PlusOutlined /></template>
          Thêm người thụ hưởng
        </AButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <ACard v-for="stat in stats" :key="stat.title" hoverable>
        <AStatistic
            :title="stat.title"
            :value="stat.value"
            :valueStyle="{ color: stat.color }"
        >
          <template #prefix><component :is="stat.icon" /></template>
          <template #suffix>
            <small :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%
            </small>
          </template>
        </AStatistic>
      </ACard>
    </div>

    <!-- Filters Section -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex justify-between gap-4">
        <div class="flex gap-4 flex-1">
          <AInputSearch
              v-model:value="searchText"
              placeholder="Tìm kiếm theo tên, số tài khoản..."
              class="max-w-xs"
              @search="handleSearch"
          />
          <ASelect v-model:value="filters.type" placeholder="Loại tài khoản" class="w-40">
            <ASelectOption value="BANK_ACCOUNT">Tài khoản ngân hàng</ASelectOption>
            <ASelectOption value="WALLET">Ví điện tử</ASelectOption>
            <ASelectOption value="CARD">Thẻ ngân hàng</ASelectOption>
          </ASelect>
          <ASelect v-model:value="filters.bank" placeholder="Ngân hàng" class="w-48">
            <ASelectOption v-for="bank in bankOptions" :key="bank.code" :value="bank.code">
              {{ bank.name }}
            </ASelectOption>
          </ASelect>
          <ASelect v-model:value="filters.status" placeholder="Trạng thái" class="w-40">
            <ASelectOption value="ACTIVE">Hoạt động</ASelectOption>
            <ASelectOption value="INACTIVE">Tạm khóa</ASelectOption>
          </ASelect>
        </div>
        <div class="flex gap-2">
          <AButton @click="handleRefresh"><template #icon><ReloadOutlined /></template></AButton>
          <AButton @click="handleExport"><template #icon><DownloadOutlined /></template>Excel</AButton>
        </div>
      </div>
    </div>

    <!-- Beneficiaries Table -->
    <ATable :columns="columns" :dataSource="filteredBeneficiaries" :loading="loading" bordered>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'beneficiary_info'">
          <div class="flex items-center">
            <AAvatar
                :style="{ backgroundColor: getAvatarColor(record.beneficiary_name) }"
                class="mr-2"
            >
              {{ getInitials(record.beneficiary_name) }}
            </AAvatar>
            <div>
              <div class="font-medium">{{ record.beneficiary_name }}</div>
              <div class="text-xs text-gray-500">{{ record.account_identifier }}</div>
            </div>
          </div>
        </template>

        <template v-if="column.key === 'account_type'">
          <ATag :color="getAccountTypeColor(record.account_type)">
            {{ getAccountTypeName(record.account_type) }}
          </ATag>
        </template>

        <template v-if="column.key === 'bank_info'">
          <div class="flex items-center">
            <img
                :src="`/api/placeholder/24/24`"
                :alt="record.bank_name"
                class="mr-2 w-6 h-6 rounded"
            />
            {{ record.bank_name }}
          </div>
        </template>

        <template v-if="column.key === 'transaction_count'">
          <div class="text-center">
            <div>{{ record.transaction_count }}</div>
            <small class="text-gray-500">{{ formatCurrency(record.total_amount) }}</small>
          </div>
        </template>

        <template v-if="column.key === 'status'">
          <ATag :color="record.status === 'ACTIVE' ? 'success' : 'error'">
            {{ record.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa' }}
          </ATag>
        </template>

        <template v-if="column.key === 'action'">
          <div class="space-x-2">
            <AButton type="link" size="small" @click="handleEdit(record)">
              <template #icon><EditOutlined /></template>
            </AButton>
            <AButton type="link" size="small" @click="handleViewTransactions(record)">
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
            <ADropdown>
              <template #overlay>
                <AMenu>
                  <AMenuItem key="quick_transfer" @click="handleQuickTransfer(record)">
                    <SwapOutlined />Chuyển nhanh
                  </AMenuItem>
                  <AMenuItem key="verify" @click="handleVerify(record)">
                    <SafetyCertificateOutlined />Xác thực
                  </AMenuItem>
                  <AMenuItem key="delete" danger @click="handleDelete(record)">
                    <DeleteOutlined />Xóa
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

    <!-- Add/Edit Modal -->
    <AModal
        v-model:visible="showAddModal"
        :title="editingBeneficiary ? 'Chỉnh sửa người thụ hưởng' : 'Thêm người thụ hưởng'"
        @ok="handleSubmit"
        :confirmLoading="submitting"
    >
      <AForm :model="formState" layout="vertical">
        <AFormItem
            label="Tên người thụ hưởng"
            required
            :rules="[{ required: true, message: 'Vui lòng nhập tên người thụ hưởng' }]"
        >
          <AInput v-model:value="formState.beneficiary_name" />
        </AFormItem>

        <AFormItem
            label="Loại tài khoản"
            required
            :rules="[{ required: true, message: 'Vui lòng chọn loại tài khoản' }]"
        >
          <ASelect v-model:value="formState.account_type" @change="handleAccountTypeChange">
            <ASelectOption value="BANK_ACCOUNT">Tài khoản ngân hàng</ASelectOption>
            <ASelectOption value="WALLET">Ví điện tử</ASelectOption>
            <ASelectOption value="CARD">Thẻ ngân hàng</ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem
            v-if="formState.account_type !== 'WALLET'"
            label="Ngân hàng"
            required
            :rules="[{ required: true, message: 'Vui lòng chọn ngân hàng' }]"
        >
          <ASelect
              v-model:value="formState.bank_code"
              :options="bankOptions"
              show-search
              :filter-option="filterOption"
          />
        </AFormItem>

        <AFormItem
            label="Số tài khoản/Số ví"
            required
            :rules="[
            { required: true, message: 'Vui lòng nhập số tài khoản' },
            { validator: validateAccountNumber }
          ]"
        >
          <AInput v-model:value="formState.account_identifier" />
        </AFormItem>

        <AFormItem label="Ghi chú">
          <ATextarea v-model:value="formState.note" />
        </AFormItem>

        <AFormItem name="reminder_enabled">
          <ACheckbox v-model:checked="formState.reminder_enabled">
            Nhắc nhở định kỳ khi chuyển khoản
          </ACheckbox>
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Transaction History Drawer -->
    <ADrawer
        v-model:visible="showHistoryDrawer"
        title="Lịch sử giao dịch"
        width="720"
    >
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">
            Giao dịch với {{ selectedBeneficiary?.beneficiary_name }}
          </h3>
          <ARadioGroup v-model:value="historyTimeRange" size="small">
            <ARadioButton value="7">7 ngày</ARadioButton>
            <ARadioButton value="30">30 ngày</ARadioButton>
            <ARadioButton value="90">90 ngày</ARadioButton>
          </ARadioGroup>
        </div>

        <!-- Transaction Chart -->
        <div style="height: 200px">
          <VChart :option="transactionChartOption" autoresize />
        </div>

        <!-- Transaction List -->
        <AList :dataSource="transactionHistory" class="mt-4">
          <template #renderItem="{ item }">
            <AListItem>
              <div class="flex justify-between items-center w-full">
                <div class="flex items-center">
                  <div :class="getTransactionTypeClass(item.type)" class="p-2 rounded mr-3">
                    <component :is="getTransactionTypeIcon(item.type)" />
                  </div>
                  <div>
                    <div class="font-medium">{{ item.description }}</div>
                    <div class="text-xs text-gray-500">{{ formatDateTime(item.created_at) }}</div>
                  </div>
                </div>
                <div :class="item.type === 'SEND' ? 'text-red-500' : 'text-green-500'">
                  {{ item.type === 'SEND' ? '-' : '+' }}{{ formatCurrency(item.amount) }}
                </div>
              </div>
            </AListItem>
          </template>
        </AList>
      </div>
    </ADrawer>

    <!-- Import Modal -->
    <AModal
        v-model:visible="showImportModal"
        title="Nhập danh sách người thụ hưởng"
        @ok="handleImportSubmit"
        :confirmLoading="importing"
    >
      <div class="space-y-4">
        <div class="border-2 border-dashed p-6 text-center rounded-lg">
          <UploadOutlined class="text-2xl mb-2" />
          <p>Kéo thả file hoặc click để tải lên</p>
          <p class="text-xs text-gray-500">Hỗ trợ file .xlsx, .xls</p>
        </div>
        <div class="text-gray-500 text-sm">
          <p>Lưu ý:</p>
          <ul class="list-disc list-inside">
            <li>File mẫu có thể tải <a href="#" class="text-blue-500">tại đây</a></li>
            <li>Số lượng tối đa 1000 người thụ hưởng/lần nhập</li>
            <li>Dung lượng file tối đa 5MB</li>
          </ul>
        </div>
      </div>
    </AModal>

    <!-- Quick Transfer Modal -->
    <AModal
        v-model:visible="showQuickTransferModal"
        title="Chuyển tiền nhanh"
        @ok="handleQuickTransferSubmit"
        :confirmLoading="transferring"
    >
      <AForm layout="vertical">
        <AFormItem label="Số tiền" required>
          <AInputNumber
              v-model:value="quickTransferAmount"
              class="w-full"
              :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              :min="0"
              :step="100000"
          />
        </AFormItem>
        <AFormItem label="Lời nhắn">
          <AInput v-model:value="quickTransferNote" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import {
  PlusOutlined,
  ImportOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  PoweroffOutlined,
  MoreOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  UploadOutlined,
  TeamOutlined,
  BankOutlined,
  TransactionOutlined,
  UserSwitchOutlined
} from '@ant-design/icons-vue'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Stats data
const stats = [
  {
    title: 'Tổng người thụ hưởng',
    value: 1234,
    color: '#1890ff',
    trend: 12.5,
    icon: TeamOutlined
  },
  {
    title: 'Số tài khoản ngân hàng',
    value: 856,
    color: '#52c41a',
    trend: 8.2,
    icon: BankOutlined
  },
  {
    title: 'Giao dịch tháng này',
    value: 452,
    color: '#722ed1',
    trend: 15.7,
    icon: TransactionOutlined
  },
  {
    title: 'Đang chờ xác thực',
    value: 23,
    color: '#faad14',
    trend: -2.4,
    icon: UserSwitchOutlined
  }
]

// Mock data
const mockBeneficiaries = [
  {
    id: 1,
    beneficiary_name: 'Nguyễn Văn A',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '1234567890',
    status: 'ACTIVE',
    transaction_count: 25,
    total_amount: 50000000,
    last_transaction: '2024-11-20T10:00:00Z',
    created_at: '2024-11-01T00:00:00Z'
  },
  {
    id: 2,
    beneficiary_name: 'Trần Thị B',
    account_type: 'WALLET',
    bank_code: 'MOMO',
    bank_name: 'Ví MoMo',
    account_identifier: '0912345678',
    status: 'ACTIVE',
    transaction_count: 15,
    total_amount: 25000000,
    last_transaction: '2024-11-19T15:30:00Z',
    created_at: '2024-11-02T00:00:00Z'
  }
]

// State
const loading = ref(false)
const searchText = ref('')
const beneficiaries = ref(mockBeneficiaries)
const showAddModal = ref(false)
const showHistoryDrawer = ref(false)
const showImportModal = ref(false)
const showQuickTransferModal = ref(false)
const submitting = ref(false)
const importing = ref(false)
const transferring = ref(false)
const editingBeneficiary = ref(null)
const selectedBeneficiary = ref(null)
const historyTimeRange = ref('7')
const quickTransferAmount = ref(0)
const quickTransferNote = ref('')

const filters = reactive({
  type: undefined,
  bank: undefined,
  status: undefined
})

const formState = reactive({
  beneficiary_name: '',
  account_type: undefined,
  bank_code: undefined,
  account_identifier: '',
  note: '',
  reminder_enabled: false
})

// Bank options
const bankOptions = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'MOMO', name: 'Ví MoMo' },
  { code: 'ZALO', name: 'ZaloPay' }
]

// Table columns
const columns = [
  { title: 'Người thụ hưởng', key: 'beneficiary_info', width: 250 },
  { title: 'Loại tài khoản', key: 'account_type', width: 150 },
  { title: 'Ngân hàng', key: 'bank_info', width: 200 },
  { title: 'Giao dịch', key: 'transaction_count', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: 'Thao tác', key: 'action', width: 150, fixed: 'right' }
]

// Transaction history mock data
const transactionHistory = ref([
  {
    id: 1,
    type: 'SEND',
    amount: 5000000,
    description: 'Chuyển tiền - Thanh toán hóa đơn',
    created_at: '2024-11-20T10:00:00Z'
  },
  {
    id: 2,
    type: 'RECEIVE',
    amount: 3000000,
    description: 'Nhận tiền hoàn trả',
    created_at: '2024-11-19T15:30:00Z'
  }
])

// Chart options
const transactionChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const data = params[0]
      return `${data.axisValue}<br/>${data.seriesName}: ${formatCurrency(data.value)}`
    }
  },
  xAxis: {
    type: 'category',
    data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value) => formatCurrency(value)
    }
  },
  series: [{
    name: 'Số tiền giao dịch',
    type: 'line',
    smooth: true,
    data: [5000000, 3000000, 7000000, 4000000, 6000000, 2000000, 5000000]
  }]
}))

// Methods
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('vi-VN')
}

const getInitials = (name: string) => {
  return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
}

const getAvatarColor = (name: string) => {
  const colors = ['#1890ff', '#52c41a', '#722ed1', '#faad14', '#eb2f96']
  const index = name.length % colors.length
  return colors[index]
}

const getAccountTypeColor = (type: string) => {
  const colors = {
    BANK_ACCOUNT: 'blue',
    WALLET: 'green',
    CARD: 'purple'
  }
  return colors[type] || 'default'
}

const getAccountTypeName = (type: string) => {
  const names = {
    BANK_ACCOUNT: 'Tài khoản ngân hàng',
    WALLET: 'Ví điện tử',
    CARD: 'Thẻ ngân hàng'
  }
  return names[type] || type
}

const getTransactionTypeClass = (type: string) => {
  return type === 'SEND' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
}

const getTransactionTypeIcon = (type: string) => {
  return type === 'SEND' ? SwapOutlined : TransactionOutlined
}

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const handleSearch = () => {
  // Implement search logic
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 500)
}

const handleExport = () => {
  message.success('Đang xuất file Excel')
}

const handleEdit = (record: any) => {
  editingBeneficiary.value = record
  Object.assign(formState, {
    beneficiary_name: record.beneficiary_name,
    account_type: record.account_type,
    bank_code: record.bank_code,
    account_identifier: record.account_identifier
  })
  showAddModal.value = true
}

const handleDelete = (record: any) => {
  Modal.confirm({
    title: 'Xác nhận xóa',
    content: `Bạn có chắc chắn muốn xóa người thụ hưởng ${record.beneficiary_name}?`,
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    onOk: () => {
      beneficiaries.value = beneficiaries.value.filter(item => item.id !== record.id)
      message.success('Đã xóa người thụ hưởng')
    }
  })
}

const handleToggleStatus = (record: any) => {
  const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  beneficiaries.value = beneficiaries.value.map(item =>
      item.id === record.id ? { ...item, status: newStatus } : item
  )
  message.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'khóa'} người thụ hưởng`)
}

const handleViewTransactions = (record: any) => {
  selectedBeneficiary.value = record
  showHistoryDrawer.value = true
}

const handleQuickTransfer = (record: any) => {
  selectedBeneficiary.value = record
  showQuickTransferModal.value = true
}

const handleVerify = (record: any) => {
  message.success('Đã gửi yêu cầu xác thực')
}

const handleSubmit = () => {
  submitting.value = true
  setTimeout(() => {
    if (editingBeneficiary.value) {
      beneficiaries.value = beneficiaries.value.map(item =>
          item.id === editingBeneficiary.value.id
              ? { ...item, ...formState }
              : item
      )
      message.success('Đã cập nhật người thụ hưởng')
    } else {
      const newBeneficiary = {
        id: beneficiaries.value.length + 1,
        ...formState,
        status: 'ACTIVE',
        transaction_count: 0,
        total_amount: 0,
        created_at: new Date().toISOString()
      }
      beneficiaries.value.unshift(newBeneficiary)
      message.success('Đã thêm người thụ hưởng mới')
    }
    showAddModal.value = false
    submitting.value = false
    resetForm()
  }, 500)
}

const resetForm = () => {
  Object.assign(formState, {
    beneficiary_name: '',
    account_type: undefined,
    bank_code: undefined,
    account_identifier: '',
    note: '',
    reminder_enabled: false
  })
  editingBeneficiary.value = null
}

// Computed
const filteredBeneficiaries = computed(() => {
  return beneficiaries.value.filter(beneficiary => {
    const matchesSearch = !searchText.value ||
        beneficiary.beneficiary_name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        beneficiary.account_identifier.toLowerCase().includes(searchText.value.toLowerCase())
    const matchesType = !filters.type || beneficiary.account_type === filters.type
    const matchesBank = !filters.bank || beneficiary.bank_code === filters.bank
    const matchesStatus = !filters.status || beneficiary.status === filters.status
    return matchesSearch && matchesType && matchesBank && matchesStatus
  })
})

onMounted(() => {
  handleRefresh()
})

definePageMeta({
  layout: 'admin'
})
</script>
