<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Phương thức thanh toán</h1>
        <p class="text-gray-500">Quản lý các phương thức thanh toán trong hệ thống</p>
      </div>
      <AButton type="primary" @click="showAddModal = true">
        <template #icon><PlusOutlined /></template>
        Thêm phương thức
      </AButton>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex justify-between gap-4 mb-4">
        <div class="flex gap-4 flex-1">
          <AInputSearch v-model:value="searchText" placeholder="Tìm kiếm theo số tài khoản, ngân hàng..." class="max-w-xs" @search="handleSearch" />
          <ASelect v-model:value="filters.type" placeholder="Loại phương thức" class="w-40">
            <ASelectOption v-for="type in paymentTypes" :key="type.value" :value="type.value">{{ type.label }}</ASelectOption>
          </ASelect>
          <ASelect v-model:value="filters.status" placeholder="Trạng thái" class="w-40">
            <ASelectOption value="ACTIVE">Hoạt động</ASelectOption>
            <ASelectOption value="INACTIVE">Tạm khóa</ASelectOption>
          </ASelect>
        </div>
        <div class="flex gap-2">
          <AButton @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
          </AButton>
          <AButton @click="handleExport">
            <template #icon><DownloadOutlined /></template>
            Xuất Excel
          </AButton>
        </div>
      </div>

      <ATable :dataSource="filteredPaymentMethods" :columns="columns" :loading="loading" :pagination="pagination">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <ATag :color="record.status === 'ACTIVE' ? 'success' : 'error'">
              {{ record.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa' }}
            </ATag>
          </template>
          <template v-if="column.key === 'is_default'">
            <ATag :color="record.is_default ? 'blue' : ''">
              {{ record.is_default ? 'Mặc định' : 'Thường' }}
            </ATag>
          </template>
          <template v-if="column.key === 'action'">
            <div class="flex gap-2">
              <AButton type="link" size="small" @click="handleEdit(record)">
                <template #icon><EditOutlined /></template>
              </AButton>
              <AButton v-if="!record.is_default" type="link" size="small" @click="handleSetDefault(record)">
                <template #icon><StarOutlined /></template>
              </AButton>
              <AButton type="link" size="small" @click="handleToggleStatus(record)" :danger="record.status === 'ACTIVE'">
                <template #icon><PoweroffOutlined /></template>
              </AButton>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <AModal v-model:visible="showAddModal" title="Thêm phương thức thanh toán" @ok="handleAddSubmit">
      <AForm :model="formState" layout="vertical">
        <AFormItem label="Loại phương thức" required>
          <ASelect v-model:value="formState.method_type">
            <ASelectOption v-for="type in paymentTypes" :key="type.value" :value="type.value">{{ type.label }}</ASelectOption>
          </ASelect>
        </AFormItem>
        <AFormItem label="Số tài khoản" required>
          <AInput v-model:value="formState.account_number" />
        </AFormItem>
        <AFormItem label="Ngân hàng">
          <ASelect v-model:value="formState.bank_name" :options="bankOptions" />
        </AFormItem>
        <AFormItem label="Đặt làm mặc định">
          <ASwitch v-model:checked="formState.is_default" />
        </AFormItem>
      </AForm>
    </AModal>

    <ExportModal
      v-model:visible="modal"
      :data="dataSource" 
      :columns="columns"
      @success="handleExportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { PlusOutlined, EditOutlined, StarOutlined, PoweroffOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

// Types
interface PaymentMethod {
  id: number
  method_type: string
  account_number: string
  bank_name: string
  is_default: boolean
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
}

// Mock Data
const mockPaymentMethods: PaymentMethod[] = [
  { id: 1, method_type: 'BANK_ACCOUNT', account_number: '19036789445', bank_name: 'Vietcombank', is_default: true, status: 'ACTIVE', created_at: '2024-03-20' },
  { id: 2, method_type: 'BANK_ACCOUNT', account_number: '0123456789', bank_name: 'MB Bank', is_default: false, status: 'ACTIVE', created_at: '2024-03-19' },
  { id: 3, method_type: 'E_WALLET', account_number: '0912345678', bank_name: 'MoMo', is_default: false, status: 'ACTIVE', created_at: '2024-03-18' },
  { id: 4, method_type: 'BANK_ACCOUNT', account_number: '9876543210', bank_name: 'Techcombank', is_default: false, status: 'ACTIVE', created_at: '2024-03-17' },
  { id: 5, method_type: 'CREDIT_CARD', account_number: '4532xxxx1234', bank_name: 'VPBank', is_default: false, status: 'INACTIVE', created_at: '2024-03-16' },
  { id: 6, method_type: 'E_WALLET', account_number: '0987654321', bank_name: 'ZaloPay', is_default: false, status: 'ACTIVE', created_at: '2024-03-15' },
  { id: 7, method_type: 'BANK_ACCOUNT', account_number: '1357924680', bank_name: 'BIDV', is_default: false, status: 'ACTIVE', created_at: '2024-03-14' },
  { id: 8, method_type: 'DEBIT_CARD', account_number: '9632xxxx5678', bank_name: 'ACB', is_default: false, status: 'INACTIVE', created_at: '2024-03-13' },
  { id: 9, method_type: 'BANK_ACCOUNT', account_number: '0246813579', bank_name: 'Agribank', is_default: false, status: 'ACTIVE', created_at: '2024-03-12' },
  { id: 10, method_type: 'CREDIT_CARD', account_number: '5678xxxx9012', bank_name: 'Sacombank', is_default: false, status: 'ACTIVE', created_at: '2024-03-11' },
  { id: 11, method_type: 'E_WALLET', account_number: '0369852147', bank_name: 'VNPay', is_default: false, status: 'ACTIVE', created_at: '2024-03-10' },
  { id: 12, method_type: 'BANK_ACCOUNT', account_number: '7890123456', bank_name: 'TPBank', is_default: false, status: 'INACTIVE', created_at: '2024-03-09' },
  { id: 13, method_type: 'DEBIT_CARD', account_number: '8901xxxx3456', bank_name: 'OCB', is_default: false, status: 'ACTIVE', created_at: '2024-03-08' },
  { id: 14, method_type: 'BANK_ACCOUNT', account_number: '1590753684', bank_name: 'VietinBank', is_default: false, status: 'ACTIVE', created_at: '2024-03-07' },
  { id: 15, method_type: 'E_WALLET', account_number: '0147852369', bank_name: 'ShopeePay', is_default: false, status: 'ACTIVE', created_at: '2024-03-06' },
  { id: 16, method_type: 'CREDIT_CARD', account_number: '3456xxxx7890', bank_name: 'HDBank', is_default: false, status: 'INACTIVE', created_at: '2024-03-05' },
  { id: 17, method_type: 'BANK_ACCOUNT', account_number: '9517538462', bank_name: 'MSB', is_default: false, status: 'ACTIVE', created_at: '2024-03-04' },
  { id: 18, method_type: 'DEBIT_CARD', account_number: '7890xxxx1234', bank_name: 'VIB', is_default: false, status: 'ACTIVE', created_at: '2024-03-03' },
  { id: 19, method_type: 'E_WALLET', account_number: '0258963147', bank_name: 'VNPT Money', is_default: false, status: 'INACTIVE', created_at: '2024-03-02' },
  { id: 20, method_type: 'BANK_ACCOUNT', account_number: '3698521470', bank_name: 'SeABank', is_default: false, status: 'ACTIVE', created_at: '2024-03-01' }
]

// State
const loading = ref(false)
const searchText = ref('')
const showAddModal = ref(false)
const paymentMethods = ref(mockPaymentMethods)

const formState = reactive({
  method_type: undefined,
  account_number: '',
  bank_name: undefined,
  is_default: false
})

const filters = reactive({
  type: undefined,
  status: undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: mockPaymentMethods.length,
  showSizeChanger: true
})

// Constants
const paymentTypes = [
  { value: 'BANK_ACCOUNT', label: 'Tài khoản ngân hàng' },
  { value: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
  { value: 'DEBIT_CARD', label: 'Thẻ ghi nợ' },
  { value: 'E_WALLET', label: 'Ví điện tử' }
]

const bankOptions = [
  { value: 'Vietcombank', label: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)' },
  { value: 'MB Bank', label: 'Ngân hàng TMCP Quân đội (MB Bank)' },
  { value: 'Techcombank', label: 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)' },
  { value: 'VPBank', label: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)' },
  { value: 'BIDV', label: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)' },
  { value: 'ACB', label: 'Ngân hàng TMCP Á Châu (ACB)' },
  { value: 'Agribank', label: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)' },
  { value: 'Sacombank', label: 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)' },
  { value: 'TPBank', label: 'Ngân hàng TMCP Tiên Phong (TPBank)' },
  { value: 'OCB', label: 'Ngân hàng TMCP Phương Đông (OCB)' },
  { value: 'VietinBank', label: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)' },
  { value: 'HDBank', label: 'Ngân hàng TMCP Phát triển TP.HCM (HDBank)' },
  { value: 'MSB', label: 'Ngân hàng TMCP Hàng Hải (MSB)' },
  { value: 'VIB', label: 'Ngân hàng TMCP Quốc tế Việt Nam (VIB)' },
  { value: 'SeABank', label: 'Ngân hàng TMCP Đông Nam Á (SeABank)' },
  { value: 'MoMo', label: 'Ví điện tử MoMo' },
  { value: 'ZaloPay', label: 'Ví điện tử ZaloPay' },
  { value: 'VNPay', label: 'Ví điện tử VNPay' },
  { value: 'ShopeePay', label: 'Ví điện tử ShopeePay' },
  { value: 'VNPT Money', label: 'Ví điện tử VNPT Money' }
]

const columns = [
  { title: 'Số tài khoản', dataIndex: 'account_number', key: 'account_number' },
  { title: 'Loại', dataIndex: 'method_type', key: 'method_type' },
  { title: 'Ngân hàng', dataIndex: 'bank_name', key: 'bank_name' },
  { title: 'Mặc định', key: 'is_default' },
  { title: 'Trạng thái', key: 'status' },
  { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at' },
  { title: 'Thao tác', key: 'action', width: 150 }
]

// Computed
const filteredPaymentMethods = computed(() => {
  return paymentMethods.value.filter(method => {
    const matchesSearch = !searchText.value ||
        method.account_number.toLowerCase().includes(searchText.value.toLowerCase()) ||
        method.bank_name.toLowerCase().includes(searchText.value.toLowerCase())
    const matchesType = !filters.type || method.method_type === filters.type
    const matchesStatus = !filters.status || method.status === filters.status
    return matchesSearch && matchesType && matchesStatus
  })
})

// Methods
const handleSearch = () => {
  pagination.current = 1
}

const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 500)
}

const handleExport = () => {
  modal.value = true
}

const handleEdit = (record: PaymentMethod) => {
  message.info(`Chỉnh sửa phương thức ${record.account_number}`)
}

const handleSetDefault = (record: PaymentMethod) => {
  paymentMethods.value = paymentMethods.value.map(method => ({
    ...method,
    is_default: method.id === record.id
  }))
  message.success('Đã đặt làm phương thức mặc định')
}

const handleToggleStatus = (record: PaymentMethod) => {
  const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  paymentMethods.value = paymentMethods.value.map(method =>
      method.id === record.id ? { ...method, status: newStatus } : method
  )
  message.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'khóa'} phương thức thanh toán`)
}

const handleAddSubmit = () => {
  if (!formState.method_type || !formState.account_number) {
    message.error('Vui lòng điền đầy đủ thông tin')
    return
  }
  const newMethod = {
    id: paymentMethods.value.length + 1,
    ...formState,
    status: 'ACTIVE' as const,
    created_at: new Date().toISOString().split('T')[0]
  }
  paymentMethods.value.unshift(newMethod)
  showAddModal.value = false
  message.success('Thêm phương thức thanh toán thành công')
}

// Thêm state cho realtime updates
const realtimeStats = reactive({
  totalTransactions: 0,
  successRate: 95,
  totalAmount: 0,
  lastUpdate: new Date()
})

// Thêm hàm để cập nhật số liệu realtime
const updateRealtimeStats = () => {
  // Tăng số giao dịch
  realtimeStats.totalTransactions += Math.floor(Math.random() * 3)
  
  // Dao động tỷ lệ thành công
  realtimeStats.successRate += (Math.random() - 0.5) * 0.2
  if (realtimeStats.successRate > 99.9) realtimeStats.successRate = 99.9
  if (realtimeStats.successRate < 90) realtimeStats.successRate = 90
  
  // Tăng tổng số tiền (từ 100k đến 10tr mỗi giao dịch)
  realtimeStats.totalAmount += Math.floor(Math.random() * 9900000 + 100000)
  
  realtimeStats.lastUpdate = new Date()
}

// Thêm vào phần onMounted
onMounted(() => {
  // Cập nhật số liệu mỗi giây
  setInterval(updateRealtimeStats, 1000)
})

definePageMeta({
  layout: 'admin'
})
</script>
