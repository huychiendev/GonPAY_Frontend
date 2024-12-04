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
                :src="getBankLogo(record)"
                :alt="record.bank_name"
                class="mr-2 w-6 h-6 rounded"
                @error="handleImageError"
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
        <AList :dataSource="filteredTransactions" class="mt-4">
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
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
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
    beneficiary_name: 'Nguyễn Văn An',
    account_type: 'BANK_ACCOUNT', 
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '1234567890',
    status: 'ACTIVE',
    transaction_count: 25,
    total_amount: 50000000,
    last_transaction: '2024-03-21T10:00:00Z',
    created_at: '2024-03-01T00:00:00Z'
  },
  {
    id: 2, 
    beneficiary_name: 'Trần Thị Bình',
    account_type: 'WALLET',
    bank_code: 'MOMO',
    bank_name: 'Ví MoMo',
    account_identifier: '0912345678',
    status: 'ACTIVE', 
    transaction_count: 15,
    total_amount: 25000000,
    last_transaction: '2024-03-20T15:30:00Z',
    created_at: '2024-03-02T00:00:00Z'
  },
  {
    id: 3,
    beneficiary_name: 'Lê Hoàng Cường',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB', 
    bank_name: 'Techcombank',
    account_identifier: '9876543210',
    status: 'ACTIVE',
    transaction_count: 42,
    total_amount: 120000000,
    last_transaction: '2024-03-21T09:15:00Z',
    created_at: '2024-03-05T00:00:00Z'
  },
  {
    id: 4,
    beneficiary_name: 'Phạm Thị Diễm',
    account_type: 'CARD',
    bank_code: 'VPB',
    bank_name: 'VPBank',
    account_identifier: '4111111111111111',
    status: 'INACTIVE',
    transaction_count: 8,
    total_amount: 15000000,
    last_transaction: '2024-03-19T14:20:00Z',
    created_at: '2024-03-10T00:00:00Z'
  },
  {
    id: 5,
    beneficiary_name: 'Hoàng Văn Em',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'BIDV',
    bank_name: 'BIDV',
    account_identifier: '0987654321',
    status: 'ACTIVE',
    transaction_count: 31,
    total_amount: 85000000,
    last_transaction: '2024-03-21T08:45:00Z', 
    created_at: '2024-03-12T00:00:00Z'
  },
  {
    id: 6,
    beneficiary_name: 'Vũ Thị Phương',
    account_type: 'WALLET',
    bank_code: 'ZALO',
    bank_name: 'ZaloPay',
    account_identifier: '0923456789',
    status: 'ACTIVE',
    transaction_count: 12,
    total_amount: 18000000,
    last_transaction: '2024-03-20T16:10:00Z',
    created_at: '2024-03-15T00:00:00Z'
  },
  {
    id: 7,
    beneficiary_name: 'Đặng Minh Quân',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'MB',
    bank_name: 'MB Bank',
    account_identifier: '1357924680',
    status: 'ACTIVE', 
    transaction_count: 19,
    total_amount: 45000000,
    last_transaction: '2024-03-21T07:30:00Z',
    created_at: '2024-03-18T00:00:00Z'
  },
  {
    id: 8,
    beneficiary_name: 'Bùi Thị Hương',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'ACB',
    bank_name: 'ACB',
    account_identifier: '2468013579',
    status: 'ACTIVE',
    transaction_count: 27,
    total_amount: 72000000,
    last_transaction: '2024-03-21T11:20:00Z',
    created_at: '2024-03-19T00:00:00Z'
  },
  {
    id: 9,
    beneficiary_name: 'Phan Văn Khoa',
    account_type: 'CARD',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '4222222222222222',
    status: 'ACTIVE',
    transaction_count: 5,
    total_amount: 28000000,
    last_transaction: '2024-03-20T13:45:00Z',
    created_at: '2024-03-20T00:00:00Z'
  },
  {
    id: 9,
    beneficiary_name: 'Công ty TNHH Thương mại Thế Giới Di Động',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB',
    bank_name: 'Techcombank',
    account_identifier: '19033324556789',
    status: 'ACTIVE',
    transaction_count: 156,
    total_amount: 850000000,
    last_transaction: '2024-03-21T08:15:00Z',
    created_at: '2023-12-15T00:00:00Z'
  },
  {
    id: 10,
    beneficiary_name: 'Công ty Cổ phần Vàng bạc Đá quý Phú Nhuận (PNJ)',
    account_type: 'BANK_ACCOUNT', 
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0071000576239',
    status: 'ACTIVE',
    transaction_count: 89,
    total_amount: 670000000,
    last_transaction: '2024-03-20T14:30:00Z',
    created_at: '2024-01-05T00:00:00Z'
  },
  {
    id: 11,
    beneficiary_name: 'Công ty TNHH GRAB Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'BIDV',
    bank_name: 'BIDV',
    account_identifier: '21510000157520',
    status: 'ACTIVE',
    transaction_count: 234,
    total_amount: 920000000,
    last_transaction: '2024-03-21T09:45:00Z',
    created_at: '2023-11-20T00:00:00Z'
  },
  {
    id: 12,
    beneficiary_name: 'Công ty Điện lực TP.HCM',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0071000776688',
    status: 'ACTIVE',
    transaction_count: 178,
    total_amount: 450000000,
    last_transaction: '2024-03-20T16:20:00Z',
    created_at: '2023-10-10T00:00:00Z'
  },
  {
    id: 13,
    beneficiary_name: 'Công ty Cổ phần FPT',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB',
    bank_name: 'Techcombank',
    account_identifier: '19033399887766',
    status: 'ACTIVE',
    transaction_count: 145,
    total_amount: 780000000,
    last_transaction: '2024-03-21T10:30:00Z',
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 14,
    beneficiary_name: 'CÔNG TY TNHH SHOPEE',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VPB',
    bank_name: 'VPBank',
    account_identifier: '166288899977',
    status: 'ACTIVE',
    transaction_count: 198,
    total_amount: 890000000,
    last_transaction: '2024-03-21T11:15:00Z',
    created_at: '2023-12-20T00:00:00Z'
  },
  {
    id: 15,
    beneficiary_name: 'Tổng Công ty Viễn thông Viettel',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'MB',
    bank_name: 'MB Bank',
    account_identifier: '0990099887766',
    status: 'ACTIVE',
    transaction_count: 167,
    total_amount: 560000000,
    last_transaction: '2024-03-20T15:45:00Z',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 16,
    beneficiary_name: 'Công ty TNHH LAZADA Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'ACB',
    bank_name: 'ACB',
    account_identifier: '22244466688',
    status: 'ACTIVE',
    transaction_count: 156,
    total_amount: 670000000,
    last_transaction: '2024-03-21T09:20:00Z',
    created_at: '2023-11-30T00:00:00Z'
  },
  {
    id: 17,
    beneficiary_name: 'Công ty Cổ phần Thế Giới Kim Cương',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB',
    bank_name: 'Techcombank',
    account_identifier: '19033388776655',
    status: 'ACTIVE',
    transaction_count: 89,
    total_amount: 920000000,
    last_transaction: '2024-03-20T14:50:00Z',
    created_at: '2024-02-10T00:00:00Z'
  },
  {
    id: 18,
    beneficiary_name: 'Công ty TNHH TIKI',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0071000887766',
    status: 'ACTIVE',
    transaction_count: 178,
    total_amount: 780000000,
    last_transaction: '2024-03-21T10:45:00Z',
    created_at: '2023-12-05T00:00:00Z'
  },
  {
    id: 19,
    beneficiary_name: 'Công ty Cổ phần Vinamilk',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'BIDV',
    bank_name: 'BIDV',
    account_identifier: '11510000679123',
    status: 'ACTIVE',
    transaction_count: 245,
    total_amount: 1250000000,
    last_transaction: '2024-03-21T11:30:00Z',
    created_at: '2023-11-15T00:00:00Z'
  },
  {
    id: 20,
    beneficiary_name: 'Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0011004399123',
    status: 'ACTIVE',
    transaction_count: 189,
    total_amount: 890000000,
    last_transaction: '2024-03-21T10:15:00Z',
    created_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 21,
    beneficiary_name: 'Công ty TNHH Yamaha Motor Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'MB',
    bank_name: 'MB Bank',
    account_identifier: '0990012345678',
    status: 'ACTIVE',
    transaction_count: 167,
    total_amount: 750000000,
    last_transaction: '2024-03-21T09:45:00Z',
    created_at: '2023-12-10T00:00:00Z'
  },
  {
    id: 22,
    beneficiary_name: 'Công ty TNHH Samsung Electronics Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB',
    bank_name: 'Techcombank',
    account_identifier: '19033388990011',
    status: 'ACTIVE',
    transaction_count: 278,
    total_amount: 1450000000,
    last_transaction: '2024-03-21T08:30:00Z',
    created_at: '2023-11-25T00:00:00Z'
  },
  {
    id: 23,
    beneficiary_name: 'Tổng Công ty Hàng không Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0011004488990',
    status: 'ACTIVE',
    transaction_count: 198,
    total_amount: 980000000,
    last_transaction: '2024-03-21T11:00:00Z',
    created_at: '2024-02-15T00:00:00Z'
  },
  {
    id: 24,
    beneficiary_name: 'Công ty CP Sữa TH True Milk',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'BIDV',
    bank_name: 'BIDV',
    account_identifier: '11510000887766',
    status: 'ACTIVE',
    transaction_count: 145,
    total_amount: 670000000,
    last_transaction: '2024-03-21T10:45:00Z',
    created_at: '2024-01-10T00:00:00Z'
  },
  {
    id: 25,
    beneficiary_name: 'Tập đoàn Dầu khí Việt Nam (PVN)',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0011004477889',
    status: 'ACTIVE',
    transaction_count: 234,
    total_amount: 1680000000,
    last_transaction: '2024-03-21T09:30:00Z',
    created_at: '2023-12-01T00:00:00Z'
  },
  {
    id: 26,
    beneficiary_name: 'Công ty CP Thép Hòa Phát',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'TCB',
    bank_name: 'Techcombank',
    account_identifier: '19033377889900',
    status: 'ACTIVE',
    transaction_count: 167,
    total_amount: 890000000,
    last_transaction: '2024-03-21T08:45:00Z',
    created_at: '2024-02-05T00:00:00Z'
  },
  {
    id: 27,
    beneficiary_name: 'Tập đoàn Công nghiệp Cao su Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'BIDV',
    bank_name: 'BIDV',
    account_identifier: '11510000998877',
    status: 'ACTIVE',
    transaction_count: 156,
    total_amount: 750000000,
    last_transaction: '2024-03-21T11:45:00Z',
    created_at: '2023-11-10T00:00:00Z'
  },
  {
    id: 28,
    beneficiary_name: 'Tổng Công ty Điện lực Dầu khí Việt Nam',
    account_type: 'BANK_ACCOUNT',
    bank_code: 'VCB',
    bank_name: 'Vietcombank',
    account_identifier: '0011004466778',
    status: 'ACTIVE',
    transaction_count: 189,
    total_amount: 980000000,
    last_transaction: '2024-03-21T10:30:00Z',
    created_at: '2024-01-25T00:00:00Z'
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

const handleViewTransactions = (record) => {
  selectedBeneficiary.value = record
  showHistoryDrawer.value = true
  
  // Khởi tạo dữ liệu ngay khi mở drawer
  const days = parseInt(historyTimeRange.value)
  transactionHistory.value = generateMockTransactions(days)
  
  // Cập nhật dữ liệu biểu đồ
  const chartData = transactionHistory.value.reduce((acc, transaction) => {
    const date = new Date(transaction.created_at)
    const dayKey = date.toLocaleDateString('vi-VN', { weekday: 'short' })
    
    if (!acc[dayKey]) {
      acc[dayKey] = {
        inflow: 0,
        outflow: 0
      }
    }
    
    if (transaction.type === 'RECEIVE') {
      acc[dayKey].inflow += transaction.amount
    } else {
      acc[dayKey].outflow += transaction.amount
    }
    
    return acc
  }, {})
  
  // Cập nhật option cho biểu đồ
  transactionChartOption.value = {
    ...transactionChartOption.value,
    xAxis: {
      data: Object.keys(chartData)
    },
    series: [
      {
        name: 'Tiền vào',
        data: Object.values(chartData).map(d => d.inflow)
      },
      {
        name: 'Tiền ra', 
        data: Object.values(chartData).map(d => d.outflow)
      }
    ]
  }
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

// Thêm hàm cập nhật số liệu realtime
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
      case 'Tổng người thụ hưởng':
        if (Math.random() > 0.7) { // 30% cơ hội tăng
          stat.value += Math.floor(Math.random() * 3) * activityMultiplier
          stat.trend = +(Math.random() * 2 + 10).toFixed(1)
        }
        break
      case 'Số tài khoản ngân hàng':
        if (Math.random() > 0.8) { // 20% cơ hội tăng
          stat.value += Math.floor(Math.random() * 2) * activityMultiplier
          stat.trend = +(Math.random() * 3 + 5).toFixed(1)
        }
        break
      case 'Giao dịch tháng này':
        stat.value += Math.floor(Math.random() * 5 * activityMultiplier)
        stat.trend = +(Math.random() * 5 + 10).toFixed(1)
        break
      case 'Đang chờ xác thực':
        if (Math.random() > 0.9) { // 10% cơ hội tăng
          stat.value += Math.floor(Math.random() * 2)
          stat.trend = +(Math.random() * 10 - 5).toFixed(1)
        }
        break
    }
  })

  // Cập nhật số liệu giao dịch cho người thụ hưởng
  beneficiaries.value.forEach(beneficiary => {
    if (beneficiary.status === 'ACTIVE' && Math.random() > 0.7) {
      const transactionAmount = Math.floor(Math.random() * 10000000 * activityMultiplier)
      beneficiary.transaction_count += 1
      beneficiary.total_amount += transactionAmount
      beneficiary.last_transaction = new Date().toISOString()
    }
  })
}

// Thêm vào onMounted
onMounted(() => {
  // Khởi tạo dữ liệu
  beneficiaries.value = mockBeneficiaries
  
  // Cập nhật số liệu mỗi giây
  const statsInterval = setInterval(updateRealtimeStats, 1000)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})

definePageMeta({
  layout: 'admin'
})

const generateMockTransactions = (days: number) => {
  const transactions = []
  const now = new Date()
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(now.getTime() - Math.random() * days * 24 * 60 * 60 * 1000)
    const type = Math.random() > 0.5 ? 'SEND' : 'RECEIVE'
    
    transactions.push({
      id: i + 1,
      type,
      amount: Math.floor(Math.random() * 15000000) + 1000000, // 1M - 15M VND
      description: type === 'SEND' 
        ? 'Chuyển tiền - Thanh toán hóa đơn'
        : 'Nhận tiền hoàn trả',
      created_at: date.toISOString()
    })
  }
  
  // Sắp xếp theo thời gian mới nhất
  return transactions.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

watch(historyTimeRange, (newRange) => {
  const days = parseInt(newRange)
  transactionHistory.value = generateMockTransactions(days)
  
  // Cập nhật dữ liệu biểu đồ
  const chartData = transactionHistory.value.reduce((acc, transaction) => {
    const date = new Date(transaction.created_at)
    const dayKey = date.toLocaleDateString('vi-VN', { weekday: 'short' })
    
    if (!acc[dayKey]) {
      acc[dayKey] = {
        inflow: 0,
        outflow: 0
      }
    }
    
    if (transaction.type === 'RECEIVE') {
      acc[dayKey].inflow += transaction.amount
    } else {
      acc[dayKey].outflow += transaction.amount
    }
    
    return acc
  }, {})
  
  // Cập nhật option cho biểu đồ
  transactionChartOption.value = {
    // ... các option khác giữ nguyên
    xAxis: {
      data: Object.keys(chartData)
    },
    series: [
      {
        name: 'Tiền vào',
        data: Object.values(chartData).map(d => d.inflow)
      },
      {
        name: 'Tiền ra', 
        data: Object.values(chartData).map(d => d.outflow)
      }
    ]
  }
})

const filteredTransactions = computed(() => {
  const days = parseInt(historyTimeRange.value)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return transactionHistory.value.filter(transaction => 
    new Date(transaction.created_at) > cutoffDate
  )
})

watch(showHistoryDrawer, (newValue) => {
  if (newValue) {
    // Khi drawer mở, khởi tạo lại dữ liệu với khoảng thời gian hiện tại
    const days = parseInt(historyTimeRange.value)
    transactionHistory.value = generateMockTransactions(days)
  }
})

const bankLogos = {
  VCB: 'https://cdn.tuoitre.vn/thumb_w/600/471584752817336320/2023/2/23/29229888323456029822604684420721366064172575n-16771238637691533081421.jpg',
  TCB: 'https://s3-symbol-logo.tradingview.com/techcombank--600.png', 
  BIDV: 'https://inkythuatso.com/uploads/thumbnails/800/2021/10/logo-bidv-inkythuatso-22-08-48-55.jpg',
  VPB: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Icon-VPBank.png',
  MB: 'https://cdn.haitrieu.com/wp-content/uploads/2022/02/Icon-MB-Bank-MBB.png',
  ACB: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-ACB-Ori.png',
  TPB: 'https://cdn.haitrieu.com/wp-content/uploads/2022/02/Icon-TPBank.png'
}

// Cho các ví điện tử
const eWalletLogos = {
  MOMO: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png',
  ZALO: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQe6SEQ293X0nfFojf6nsCWKA8dNGOrqn21jg&s',
  ZALOPAY: 'https://play-lh.googleusercontent.com/NfFBz1Rxk0nQ7RsOk0kXbi1AEp1ZJ3rzJHbwRlHsZ_BIAHJeBn-UzR45JJUBGTVnQ8N-',
  VNPAY: 'https://download.logo.wine/logo/VNPAY/VNPAY-Logo.wine.png'
}

const getBankLogo = (record) => {
  console.log('Record type:', record.account_type)
  console.log('Bank code:', record.bank_code)
  
  if (record.account_type === 'WALLET') {
    const walletCode = record.bank_code.toUpperCase()
    console.log('Wallet logo URL:', eWalletLogos[walletCode])
    return eWalletLogos[walletCode] || '/default-wallet-logo.png'
  }
  
  console.log('Bank logo URL:', bankLogos[record.bank_code])
  return bankLogos[record.bank_code] || '/default-bank-logo.png'
}

const handleImageError = (e) => {
  // Khi ảnh lỗi sẽ hiển thị ảnh mặc định
  e.target.src = '/default-bank-logo.png'
}
</script>
