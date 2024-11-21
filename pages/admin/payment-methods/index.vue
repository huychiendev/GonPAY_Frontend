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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
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
  { id: 1, method_type: 'BANK_ACCOUNT', account_number: '1234567890', bank_name: 'Vietcombank', is_default: true, status: 'ACTIVE', created_at: '2024-11-20' },
  { id: 2, method_type: 'CREDIT_CARD', account_number: '4532456789012345', bank_name: 'VPBank', is_default: false, status: 'ACTIVE', created_at: '2024-11-19' },
  { id: 3, method_type: 'E_WALLET', account_number: '0912345678', bank_name: 'MoMo', is_default: false, status: 'INACTIVE', created_at: '2024-11-18' },
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
  { value: 'Vietcombank', label: 'Vietcombank' },
  { value: 'VPBank', label: 'VPBank' },
  { value: 'Techcombank', label: 'Techcombank' },
  { value: 'MB Bank', label: 'MB Bank' }
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
  message.success('Đang xuất file Excel')
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
definePageMeta({
  layout: 'admin'
})
</script>
