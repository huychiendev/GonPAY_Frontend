<template>
  <div class="p-6">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Quản lý thông báo</h1>
        <p class="text-gray-500">Quản lý và theo dõi thông báo trong hệ thống</p>
      </div>
      <div class="space-x-3">
        <AButton @click="handleTemplates">
          <template #icon>
            <SnippetsOutlined/>
          </template>
          Mẫu thông báo
        </AButton>
        <AButton type="primary" @click="showCreateModal = true">
          <template #icon>
            <PlusOutlined/>
          </template>
          Tạo thông báo
        </AButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <ACard v-for="stat in stats" :key="stat.title" hoverable>
        <AStatistic :title="stat.title" :value="stat.value" :precision="stat.precision" :valueStyle="{ color: stat.color }">
          <template #prefix>
            <component :is="stat.icon"/>
          </template>
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
          <AInputSearch v-model:value="filters.search" placeholder="Tìm kiếm thông báo..." class="w-64" @search="handleSearch"/>
          <ASelect v-model:value="filters.type" placeholder="Loại thông báo" class="w-40">
            <ASelectOption value="SYSTEM">Hệ thống</ASelectOption>
            <ASelectOption value="TRANSACTION">Giao dịch</ASelectOption>
            <ASelectOption value="SECURITY">Bảo mật</ASelectOption>
            <ASelectOption value="MARKETING">Marketing</ASelectOption>
          </ASelect>
          <ASelect v-model:value="filters.status" placeholder="Trạng thái" class="w-40">
            <ASelectOption value="SCHEDULED">Lên lịch</ASelectOption>
            <ASelectOption value="SENT">Đã gửi</ASelectOption>
            <ASelectOption value="FAILED">Thất bại</ASelectOption>
          </ASelect>
          <ARangePicker v-model:value="filters.dateRange" class="w-64" :show-time="true"/>
        </div>
        <div class="space-x-2">
          <AButton @click="handleRefresh">
            <template #icon>
              <ReloadOutlined/>
            </template>
          </AButton>
          <AButton @click="handleExport">
            <template #icon>
              <DownloadOutlined/>
            </template>
            Xuất báo cáo
          </AButton>
        </div>
      </div>
    </div>

    <!-- Notifications Table -->
    <ATable :columns="columns" :dataSource="filteredNotifications" :loading="loading" :rowSelection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }">
      <!-- Content Column -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'content'">
          <div class="flex items-start gap-3">
            <div :class="getNotificationTypeClass(record.type)" class="p-2 rounded-lg">
              <component :is="getNotificationTypeIcon(record.type)"/>
            </div>
            <div>
              <div class="font-medium">{{ record.title }}</div>
              <div class="text-gray-500 text-sm">{{ record.content }}</div>
              <div class="text-xs text-gray-400 mt-1">
                Gửi đến: {{ getRecipientInfo(record) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Status Column -->
        <template v-if="column.key === 'status'">
          <ATag :color="getStatusColor(record.status)">
            {{ getStatusLabel(record.status) }}
          </ATag>
          <div class="text-xs text-gray-400 mt-1">
            {{ record.sent_count }}/{{ record.total_recipients }} đã nhận
          </div>
        </template>

        <!-- Schedule Column -->
        <template v-if="column.key === 'schedule'">
          <div>
            {{ formatDateTime(record.scheduled_at) }}
            <ATag v-if="record.recurring" color="blue" class="ml-2">
              {{ getRecurringLabel(record.recurring) }}
            </ATag>
          </div>
        </template>

        <!-- Actions Column -->
        <template v-if="column.key === 'actions'">
          <div class="space-x-2">
            <AButton type="link" size="small" :disabled="!canEdit(record)" @click="handleEdit(record)">
              <template #icon>
                <EditOutlined/>
              </template>
            </AButton>
            <AButton type="link" size="small" @click="handleViewDetails(record)">
              <template #icon>
                <EyeOutlined/>
              </template>
            </AButton>
            <ADropdown>
              <template #overlay>
                <AMenu>
                  <AMenuItem key="resend" v-if="canResend(record)" @click="handleResend(record)">
                    <RedoOutlined/>
                    Gửi lại
                  </AMenuItem>
                  <AMenuItem key="schedule" v-if="canSchedule(record)" @click="handleSchedule(record)">
                    <ScheduleOutlined/>
                    Đổi lịch
                  </AMenuItem>
                  <AMenuItem key="duplicate" @click="handleDuplicate(record)">
                    <CopyOutlined/>
                    Tạo bản sao
                  </AMenuItem>
                  <AMenuItem key="cancel" v-if="canCancel(record)" danger @click="handleCancel(record)">
                    <StopOutlined/>
                    Hủy gửi
                  </AMenuItem>
                </AMenu>
              </template>
              <AButton type="link" size="small">
                <template #icon>
                  <MoreOutlined/>
                </template>
              </AButton>
            </ADropdown>
          </div>
        </template>
      </template>
    </ATable>

    <!-- Create/Edit Modal -->
    <AModal v-model:visible="showCreateModal" :title="editingNotification ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'" width="800" @ok="handleSubmit" :confirmLoading="submitting">
      <AForm :model="formState" layout="vertical">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <AFormItem label="Tiêu đề" required>
              <AInput v-model:value="formState.title"/>
            </AFormItem>
          </div>

          <AFormItem label="Loại thông báo" required>
            <ASelect v-model:value="formState.type">
              <ASelectOption value="SYSTEM">Hệ thống</ASelectOption>
              <ASelectOption value="TRANSACTION">Giao dịch</ASelectOption>
              <ASelectOption value="SECURITY">Bảo mật</ASelectOption>
              <ASelectOption value="MARKETING">Marketing</ASelectOption>
            </ASelect>
          </AFormItem>

          <AFormItem label="Mức độ ưu tiên" required>
            <ASelect v-model:value="formState.priority">
              <ASelectOption value="HIGH">Cao</ASelectOption>
              <ASelectOption value="MEDIUM">Trung bình</ASelectOption>
              <ASelectOption value="LOW">Thấp</ASelectOption>
            </ASelect>
          </AFormItem>

          <div class="col-span-2">
            <AFormItem label="Nội dung" required>
              <ATextarea v-model:value="formState.content" :rows="4"/>
            </AFormItem>
          </div>

          <div class="col-span-2">
            <AFormItem label="Người nhận">
              <ASelect v-model:value="formState.recipients" mode="multiple" placeholder="Chọn người nhận" :options="recipientOptions" show-search :filter-option="filterOption"/>
            </AFormItem>
          </div>

          <AFormItem label="Thời gian gửi">
            <ADatePicker v-model:value="formState.scheduled_at" :show-time="true" format="YYYY-MM-DD HH:mm:ss" style="width: 100%"/>
          </AFormItem>

          <AFormItem label="Lặp lại">
            <ASelect v-model:value="formState.recurring">
              <ASelectOption value="">Không lặp lại</ASelectOption>
              <ASelectOption value="DAILY">Hàng ngày</ASelectOption>
              <ASelectOption value="WEEKLY">Hàng tuần</ASelectOption>
              <ASelectOption value="MONTHLY">Hàng tháng</ASelectOption>
            </ASelect>
          </AFormItem>

          <div class="col-span-2">
            <AFormItem>
              <div class="flex space-x-4">
                <ACheckbox v-model:checked="formState.send_email">Gửi email</ACheckbox>
                <ACheckbox v-model:checked="formState.send_sms">Gửi SMS</ACheckbox>
                <ACheckbox v-model:checked="formState.send_push">Gửi thông báo đẩy</ACheckbox>
              </div>
            </AFormItem>
          </div>
        </div>
      </AForm>
    </AModal>

    <!-- Details Drawer -->
    <ADrawer v-model:visible="showDetailsDrawer" title="Chi tiết thông báo" width="600" placement="right">
      <div v-if="selectedNotification" class="space-y-6">
        <div>
          <h3 class="text-lg font-medium">Thông tin chung</h3>
          <ADescriptions bordered :column="1" class="mt-2">
            <ADescriptionsItem label="ID">{{ selectedNotification.id }}</ADescriptionsItem>
            <ADescriptionsItem label="Tiêu đề">{{ selectedNotification.title }}</ADescriptionsItem>
            <ADescriptionsItem label="Loại">{{ getNotificationTypeName(selectedNotification.type) }}</ADescriptionsItem>
            <ADescriptionsItem label="Trạng thái">
              <ATag :color="getStatusColor(selectedNotification.status)">
                {{ getStatusLabel(selectedNotification.status) }}
              </ATag>
            </ADescriptionsItem>
            <ADescriptionsItem label="Thời gian tạo">{{ formatDateTime(selectedNotification.created_at) }}</ADescriptionsItem>
            <ADescriptionsItem label="Thời gian gửi">{{ formatDateTime(selectedNotification.scheduled_at) }}</ADescriptionsItem>
          </ADescriptions>
        </div>

        <div>
          <h3 class="text-lg font-medium">Nội dung</h3>
          <div class="mt-2 p-4 bg-gray-50 rounded-lg">
            {{ selectedNotification.content }}
          </div>
        </div>

        <div>
          <h3 class="text-lg font-medium">Thống kê gửi</h3>
          <div class="grid grid-cols-3 gap-4 mt-2">
            <AStatistic title="Tổng người nhận" :value="selectedNotification.total_recipients"/>
            <AStatistic title="Đã nhận" :value="selectedNotification.sent_count"/>
            <AStatistic title="Tỷ lệ thành công" :value="getSuccessRate(selectedNotification)" suffix="%"/>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-medium">Lịch sử gửi</h3>
          <ATimeline class="mt-2">
            <ATimelineItem v-for="log in selectedNotification.delivery_logs" :key="log.id">
              <template #dot>
                <component :is="getDeliveryStatusIcon(log.status)" :style="{ color: getDeliveryStatusColor(log.status) }"/>
              </template>
              <div>
                <div class="font-medium">{{ getDeliveryStatusText(log.status) }}</div>
                <div class="text-sm text-gray-500">{{ log.message }}</div>
                <div class="text-xs text-gray-400">{{ formatDateTime(log.timestamp) }}</div>
              </div>
            </ATimelineItem>
          </ATimeline>
        </div>
      </div>
    </ADrawer>

    <!-- Templates Modal -->
    <AModal v-model:visible="showTemplatesModal" title="Mẫu thông báo" width="800" :footer="null">
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <AInput v-model:value="templateSearch" placeholder="Tìm kiếm mẫu..." class="w-64"
          />
          <AButton type="primary" @click="handleCreateTemplate">
            <template #icon>
              <PlusOutlined/>
            </template>
            Tạo mẫu mới
          </AButton>
        </div>

        <ATabs v-model:activeKey="activeTemplateTab">
          <ATabPane key="system" tab="Hệ thống">
            <div class="grid grid-cols-2 gap-4">
              <div v-for="template in systemTemplates" :key="template.id" class="border rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-medium">{{ template.name }}</div>
                    <div class="text-sm text-gray-500 mt-1">{{ template.description }}</div>
                  </div>
                  <ADropdown>
                    <template #overlay>
                      <AMenu>
                        <AMenuItem key="use" @click="handleUseTemplate(template)">
                          <template #icon>
                            <CheckOutlined/>
                          </template>
                          Sử dụng
                        </AMenuItem>
                        <AMenuItem key="edit" @click="handleEditTemplate(template)">
                          <template #icon>
                            <EditOutlined/>
                          </template>
                          Chỉnh sửa
                        </AMenuItem>
                        <AMenuItem key="delete" danger @click="handleDeleteTemplate(template)">
                          <template #icon>
                            <DeleteOutlined/>
                          </template>
                          Xóa
                        </AMenuItem>
                      </AMenu>
                    </template>
                    <AButton type="link">
                      <MoreOutlined/>
                    </AButton>
                  </ADropdown>
                </div>
                <div class="mt-3 text-sm">
                  <div class="text-gray-500">Biến thể:</div>
                  <div class="flex flex-wrap gap-2 mt-1">
                    <ATag v-for="variable in template.variables" :key="variable">
                      {{ variable }}
                    </ATag>
                  </div>
                </div>
                <div class="mt-3 flex justify-between items-center text-xs text-gray-400">
                  <span>Cập nhật: {{ formatDateTime(template.updated_at) }}</span>
                  <span>{{ template.usage_count }} lần sử dụng</span>
                </div>
              </div>
            </div>
          </ATabPane>
        </ATabs>
      </div>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed, onMounted, onUnmounted} from 'vue'
import {message, Modal} from 'ant-design-vue'
import {
  PlusOutlined,
  SnippetsOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  CheckOutlined,
  DeleteOutlined,
  RedoOutlined,
  ScheduleOutlined,
  CopyOutlined,
  StopOutlined,
  BellOutlined,
  SecurityScanOutlined,
  TransactionOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'

// Stats Data
const stats = [
  {
    title: 'Tổng thông báo',
    value: 2458,
    precision: 0,
    color: '#1890ff',
    trend: 15.3,
    icon: NotificationOutlined
  },
  {
    title: 'Tỷ lệ gửi thành công',
    value: 98.5,
    precision: 1,
    color: '#52c41a',
    trend: 2.1,
    icon: CheckCircleOutlined
  },
  {
    title: 'Đang chờ gửi',
    value: 127,
    precision: 0,
    color: '#722ed1',
    trend: -5.2,
    icon: ClockCircleOutlined
  },
  {
    title: 'Thất bại',
    value: 23,
    precision: 0,
    color: '#ff4d4f',
    trend: -12.5,
    icon: CloseCircleOutlined
  }
]

// Mock Data
const mockNotifications = [
  {
    id: 1,
    type: 'SYSTEM',
    title: 'Bảo trì hệ thống định kỳ',
    content: 'Hệ thống sẽ bảo trì từ 23:00 ngày 20/11/2024 đến 02:00 ngày 21/11/2024 để nâng cấp tính năng mới',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduled_at: '2024-11-20T23:00:00Z',
    total_recipients: 5000,
    sent_count: 0,
    created_at: '2024-11-19T10:00:00Z',
    delivery_logs: [
      {
        id: 1,
        status: 'CREATED',
        message: 'Tạo thông báo thành công',
        timestamp: '2024-11-19T10:00:00Z'
      }
    ]
  },
  {
    id: 2, 
    type: 'SECURITY',
    title: 'Cảnh báo đăng nhập lạ',
    content: 'Phát hiện đăng nhập từ thiết bị mới tại Hà Nội. Vui lòng kiểm tra và xác nhận.',
    status: 'SENT',
    priority: 'HIGH',
    scheduled_at: '2024-11-19T08:00:00Z',
    total_recipients: 1,
    sent_count: 1,
    created_at: '2024-11-19T08:00:00Z'
  },
  {
    id: 3,
    type: 'TRANSACTION',
    title: 'Xác nhận giao dịch thành công',
    content: 'Giao dịch chuyển tiền 5.000.000đ đến số tài khoản 19037xxx293 - NGUYEN VAN A đã được thực hiện thành công',
    status: 'SENT',
    priority: 'MEDIUM',
    scheduled_at: '2024-11-19T07:30:00Z',
    total_recipients: 1,
    sent_count: 1,
    created_at: '2024-11-19T07:30:00Z'
  },
  {
    id: 4,
    type: 'MARKETING',
    title: 'Ưu đãi tháng 11 - Hoàn tiền 5%',
    content: 'Cơ hội nhận hoàn tiền 5% cho mọi giao dịch thanh toán hóa đơn từ 500.000đ',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduled_at: '2024-11-21T08:00:00Z',
    total_recipients: 3000,
    sent_count: 0,
    created_at: '2024-11-19T06:00:00Z'
  },
  {
    id: 5,
    type: 'SYSTEM',
    title: 'Nâng cấp tính năng mới',
    content: 'GonPay vừa ra mắt tính năng Ví điện tử liên kết. Khám phá ngay!',
    status: 'SENT',
    priority: 'MEDIUM',
    scheduled_at: '2024-11-18T09:00:00Z',
    total_recipients: 4500,
    sent_count: 4482,
    created_at: '2024-11-18T09:00:00Z'
  },
  {
    id: 6,
    type: 'TRANSACTION',
    title: 'Nhắc nhở thanh toán hóa đơn',
    content: 'Bạn có hóa đơn điện tháng 11 trị giá 857.000đ sắp đến hạn thanh toán',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduled_at: '2024-11-22T10:00:00Z',
    total_recipients: 2500,
    sent_count: 0,
    created_at: '2024-11-19T05:00:00Z'
  },
  {
    id: 7,
    type: 'SECURITY',
    title: 'Xác thực bảo mật 2 lớp',
    content: 'Vui lòng bật xác thực 2 lớp để bảo vệ tài khoản của bạn tốt hơn',
    status: 'FAILED',
    priority: 'HIGH',
    scheduled_at: '2024-11-19T04:00:00Z',
    total_recipients: 1200,
    sent_count: 980,
    created_at: '2024-11-19T04:00:00Z'
  },
  {
    id: 8,
    type: 'MARKETING',
    title: 'Giới thiệu bạn bè - Nhận quà hấp dẫn',
    content: 'Nhận ngay 50.000đ cho mỗi lượt giới thiệu bạn bè sử dụng GonPay thành công',
    status: 'SENT',
    priority: 'LOW',
    scheduled_at: '2024-11-19T03:00:00Z',
    total_recipients: 3500,
    sent_count: 3500,
    created_at: '2024-11-19T03:00:00Z'
  },
  {
    id: 9,
    type: 'SYSTEM',
    title: 'Thông báo nghỉ Tết Nguyên đán 2025',
    content: 'GonPay thông báo lịch nghỉ Tết Nguyên đán từ ngày 29/01/2025 đến 05/02/2025',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    scheduled_at: '2024-12-25T08:00:00Z',
    total_recipients: 5000,
    sent_count: 0,
    created_at: '2024-11-19T02:00:00Z'
  }
]

// State
const loading = ref(false)
const selectedKeys = ref<string[]>([])
const notifications = ref(mockNotifications)
const showCreateModal = ref(false)
const showDetailsDrawer = ref(false)
const showTemplatesModal = ref(false)
const editingNotification = ref(null)
const selectedNotification = ref(null)
const submitting = ref(false)
const templateSearch = ref('')
const activeTemplateTab = ref('system')

const filters = reactive({
  search: '',
  type: undefined,
  status: undefined,
  dateRange: undefined
})

const formState = reactive({
  title: '',
  type: 'SYSTEM',
  content: '',
  priority: 'MEDIUM',
  recipients: [],
  scheduled_at: undefined,
  recurring: '',
  send_email: true,
  send_sms: false,
  send_push: true
})

// Table Columns
const columns = [
  {title: 'Nội dung', key: 'content', width: '40%'},
  {title: 'Trạng thái', key: 'status', width: '15%'},
  {title: 'Thời gian gửi', key: 'schedule', width: '20%', sorter: true},
  {title: 'Thao tác', key: 'actions', width: '15%', fixed: 'right'}
]

// Templates Data
const systemTemplates = [
  {
    id: 1,
    name: 'Thông báo bảo trì',
    description: 'Mẫu thông báo bảo trì hệ thống',
    content: 'Hệ thống sẽ bảo trì từ {start_time} đến {end_time}',
    variables: ['start_time', 'end_time'],
    updated_at: '2024-11-18T10:00:00Z',
    usage_count: 15
  },
  {
    id: 2,
    name: 'Xác thực thiết bị mới',
    description: 'Thông báo khi phát hiện đăng nhập từ thiết bị mới',
    content: 'Phát hiện đăng nhập từ thiết bị mới tại {location}',
    variables: ['location', 'device_info'],
    updated_at: '2024-11-17T15:30:00Z',
    usage_count: 128
  }
]

// Recipient Options
const recipientOptions = [
  {value: 'ALL', label: 'Tất cả người dùng'},
  {value: 'ACTIVE', label: 'Người dùng đang hoạt động'},
  {value: 'PREMIUM', label: 'Người dùng Premium'}
]

// Methods
const getNotificationTypeClass = (type: string) => {
  const classes = {
    SYSTEM: 'bg-blue-100 text-blue-600',
    TRANSACTION: 'bg-green-100 text-green-600',
    SECURITY: 'bg-red-100 text-red-600',
    MARKETING: 'bg-purple-100 text-purple-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

const getNotificationTypeIcon = (type: string) => {
  const icons = {
    SYSTEM: BellOutlined,
    TRANSACTION: TransactionOutlined,
    SECURITY: SecurityScanOutlined,
    MARKETING: NotificationOutlined
  }
  return icons[type] || BellOutlined
}

const getNotificationTypeName = (type: string) => {
  const names = {
    SYSTEM: 'Hệ thống',
    TRANSACTION: 'Giao dịch',
    SECURITY: 'Bảo mật',
    MARKETING: 'Marketing'
  }
  return names[type] || type
}

const getStatusColor = (status: string) => {
  const colors = {
    SCHEDULED: 'processing',
    SENT: 'success',
    FAILED: 'error',
    CANCELLED: 'default'
  }
  return colors[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels = {
    SCHEDULED: 'Lên lịch',
    SENT: 'Đã gửi',
    FAILED: 'Thất bại',
    CANCELLED: 'Đã hủy'
  }
  return labels[status] || status
}

const getRecurringLabel = (recurring: string) => {
  const labels = {
    DAILY: 'Hàng ngày',
    WEEKLY: 'Hàng tuần',
    MONTHLY: 'Hàng tháng'
  }
  return labels[recurring] || recurring
}

const getDeliveryStatusIcon = (status: string) => {
  const icons = {
    CREATED: ClockCircleOutlined,
    SENT: CheckCircleOutlined,
    FAILED: CloseCircleOutlined
  }
  return icons[status] || ClockCircleOutlined
}

const getDeliveryStatusColor = (status: string) => {
  const colors = {
    CREATED: '#1890ff',
    SENT: '#52c41a',
    FAILED: '#ff4d4f'
  }
  return colors[status] || '#1890ff'
}

const getDeliveryStatusText = (status: string) => {
  const texts = {
    CREATED: 'Tạo thông báo',
    SENT: 'Gửi thành công',
    FAILED: 'Gửi thất bại'
  }
  return texts[status] || status
}

const getRecipientInfo = (record: any) => {
  if (record.recipients?.includes('ALL')) return 'Tất cả người dùng'
  return `${record.total_recipients} người dùng`
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('vi-VN')
}

const getSuccessRate = (notification: any) => {
  if (!notification.total_recipients) return 0
  return ((notification.sent_count / notification.total_recipients) * 100).toFixed(1)
}

// Action Handlers
const handleRefresh = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success('Đã làm mới dữ liệu')
  }, 500)
}

const handleSearch = () => {
  // Implement search
}

const handleExport = () => {
  message.success('Đang xuất báo cáo')
}

const handleEdit = (record: any) => {
  editingNotification.value = record
  Object.assign(formState, {
    title: record.title,
    type: record.type,
    content: record.content,
    priority: record.priority,
    recipients: record.recipients,
    scheduled_at: record.scheduled_at,
    recurring: record.recurring
  })
  showCreateModal.value = true
}

const handleViewDetails = (record: any) => {
  selectedNotification.value = record
  showDetailsDrawer.value = true
}

const handleResend = (record: any) => {
  message.success('Đang gửi lại thông báo')
}

const handleSchedule = (record: any) => {
  // Implement reschedule
}

const handleDuplicate = (record: any) => {
  handleEdit({...record, id: undefined})
}

const handleCancel = (record: any) => {
  Modal.confirm({
    title: 'Xác nhận hủy gửi',
    content: 'Bạn có chắc chắn muốn hủy gửi thông báo này?',
    okText: 'Hủy gửi',
    okType: 'danger',
    cancelText: 'Đóng',
    onOk: () => {
      message.success('Đã hủy gửi thông báo')
    }
  })
}

const onSelectChange = (keys: string[]) => {
  selectedKeys.value = keys
}

const canEdit = (record: any) => {
  return record.status === 'SCHEDULED'
}

const canResend = (record: any) => {
  return record.status === 'FAILED'
}

const canSchedule = (record: any) => {
  return record.status === 'SCHEDULED'
}

const canCancel = (record: any) => {
  return record.status === 'SCHEDULED'
}

const handleSubmit = () => {
  // Validate form
  if (!formState.title || !formState.content || !formState.scheduled_at) {
    message.error('Vui lòng điền đầy đủ thông tin bắt buộc')
    return
  }

  submitting.value = true
  setTimeout(() => {
    if (editingNotification.value) {
      notifications.value = notifications.value.map(item =>
          item.id === editingNotification.value.id
              ? {...item, ...formState}
              : item
      )
      message.success('Cập nhật thông báo thành công')
    } else {
      const newNotification = {
        id: notifications.value.length + 1,
        ...formState,
        status: 'SCHEDULED',
        total_recipients: 0,
        sent_count: 0,
        created_at: new Date().toISOString(),
        delivery_logs: []
      }
      notifications.value.unshift(newNotification)
      message.success('Tạo thông báo mới thành công')
    }
    showCreateModal.value = false
    submitting.value = false
    resetForm()
  }, 500)
}

const resetForm = () => {
  Object.assign(formState, {
    title: '',
    type: 'SYSTEM',
    content: '',
    priority: 'MEDIUM',
    recipients: [],
    scheduled_at: undefined,
    recurring: '',
    send_email: true,
    send_sms: false,
    send_push: true
  })
  editingNotification.value = null
}

const handleTemplates = () => {
  showTemplatesModal.value = true
}

const handleCreateTemplate = () => {
  // Implement create template
}

const handleUseTemplate = (template: any) => {
  Object.assign(formState, {
    title: template.name,
    content: template.content
  })
  showTemplatesModal.value = false
  showCreateModal.value = true
}

const handleEditTemplate = (template: any) => {
  // Implement edit template
  message.success('Đang chỉnh sửa mẫu thông báo')
}

const handleDeleteTemplate = (template: any) => {
  Modal.confirm({
    title: 'Xác nhận xóa',
    content: `Bạn có chắc chắn muốn xóa mẫu thông báo "${template.name}"?`,
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    onOk: () => {
      message.success('Đã xóa mẫu thông báo')
    }
  })
}

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// Computed
const filteredNotifications = computed(() => {
  return notifications.value.filter(notification => {
    const matchesSearch = !filters.search ||
        notification.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        notification.content.toLowerCase().includes(filters.search.toLowerCase())
    const matchesType = !filters.type || notification.type === filters.type
    const matchesStatus = !filters.status || notification.status === filters.status

    if (filters.dateRange) {
      const [start, end] = filters.dateRange
      const notificationDate = new Date(notification.scheduled_at)
      const isInRange = notificationDate >= start && notificationDate <= end
      return matchesSearch && matchesType && matchesStatus && isInRange
    }

    return matchesSearch && matchesType && matchesStatus
  })
})

// Thêm hàm cập nhật số liệu realtime
const updateStatsRealtime = () => {
  const hour = new Date().getHours()
  let activityMultiplier = 1

  // Điều chỉnh hệ số hoạt động theo giờ
  if (hour >= 9 && hour <= 11) activityMultiplier = 1.5 // Cao điểm sáng
  else if (hour >= 13 && hour <= 16) activityMultiplier = 1.3 // Cao điểm chiều  
  else if (hour >= 22 || hour <= 5) activityMultiplier = 0.3 // Đêm khuya

  stats.forEach(stat => {
    switch(stat.title) {
      case 'Tổng thông báo':
        if (Math.random() > 0.7) { // 30% cơ hội tăng
          stat.value += Math.floor(Math.random() * 3) * activityMultiplier
          stat.trend = +(Math.random() * 2 + 14).toFixed(1)
        }
        break
      case 'Tỷ lệ gửi thành công':
        stat.value = +(Math.random() * 2 + 97).toFixed(1) // Dao động 97-99%
        stat.trend = +(Math.random() * 3 + 1).toFixed(1)
        break
      case 'Đang chờ gửi':
        if (Math.random() > 0.5) { // 50% cơ hội thay đổi
          const change = Math.floor(Math.random() * 5) * activityMultiplier
          stat.value += Math.random() > 0.6 ? change : -change
          if (stat.value < 0) stat.value = 0
          stat.trend = +(Math.random() * 8 - 4).toFixed(1)
        }
        break
      case 'Thất bại':
        if (Math.random() > 0.8) { // 20% cơ hội tăng
          stat.value += Math.floor(Math.random() * 2)
          stat.trend = +(Math.random() * 15 - 10).toFixed(1)
        }
        break
    }
  })
}

// Thêm vào onMounted
onMounted(() => {
  const statsInterval = setInterval(updateStatsRealtime, 1000)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})

definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.ant-timeline {
  max-height: 400px;
  overflow-y: auto;
}

.template-card {
  transition: all 0.3s ease;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
