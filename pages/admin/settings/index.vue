<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Cài đặt hệ thống</h1>
        <p class="text-gray-500">Quản lý và cấu hình các thiết lập của hệ thống</p>
      </div>
      <AButton type="primary" :loading="saving" @click="saveAllSettings">
        <template #icon><SaveOutlined /></template>
        Lưu thay đổi
      </AButton>
    </div>

   <div class="flex flex-wrap gap-4 mb-6">
  <ACard v-for="stat in stats" :key="stat.title" class="flex-1">
    <AStatistic :title="stat.title" :value="stat.value" :valueStyle="{ color: stat.color }">
      <template #prefix><component :is="stat.icon" /></template>
      <template #suffix>
        <small :class="stat.trend >= 0 ? 'text-green-500' : 'text-red-500'">
          {{ stat.trend >= 0 ? '+' : '' }}{{ stat.trend }}%
        </small>
      </template>
    </AStatistic>
  </ACard>
</div>

    <ATabs v-model:activeKey="activeTab">
      <!-- Cài đặt chung -->
      <ATabPane key="general" tab="Cài đặt chung">
        <AForm layout="vertical">
          <div class="grid grid-cols-2 gap-6">
            <ACard title="Thông tin hệ thống" :bordered="false">
              <AFormItem label="Tên ứng dụng">
                <AInput v-model:value="settings.general.appName" />
              </AFormItem>
              <AFormItem label="URL">
                <AInput v-model:value="settings.general.appUrl" />
              </AFormItem>
              <AFormItem label="Timezone">
                <ASelect v-model:value="settings.general.timezone" :options="timezoneOptions" />
              </AFormItem>
              <AFormItem label="Ngôn ngữ mặc định">
                <ASelect v-model:value="settings.general.defaultLanguage">
                  <ASelectOption value="vi">Tiếng Việt</ASelectOption>
                  <ASelectOption value="en">English</ASelectOption>
                </ASelect>
              </AFormItem>
              <AFormItem label="Chế độ bảo trì">
                <ASwitch v-model:checked="settings.general.maintenanceMode" />
                <div class="text-xs text-gray-500 mt-1">Chỉ admin có thể truy cập khi bật chế độ này</div>
              </AFormItem>
            </ACard>

            <ACard title="Cấu hình Email" :bordered="false">
              <AFormItem label="SMTP Host">
                <AInput v-model:value="settings.email.smtpHost" />
              </AFormItem>
              <AFormItem label="SMTP Port">
                <AInputNumber v-model:value="settings.email.smtpPort" class="w-full" />
              </AFormItem>
              <AFormItem label="Email gửi">
                <AInput v-model:value="settings.email.fromAddress" />
              </AFormItem>
              <AFormItem label="Tên người gửi">
                <AInput v-model:value="settings.email.fromName" />
              </AFormItem>
              <AFormItem>
                <AButton @click="testEmailConfig">
                  <template #icon><SendOutlined /></template>
                  Gửi email test
                </AButton>
              </AFormItem>
            </ACard>
          </div>
        </AForm>
      </ATabPane>

      <!-- Cấu hình giao dịch -->
      <ATabPane key="transaction" tab="Cấu hình giao dịch">
        <div class="grid grid-cols-2 gap-6">
          <ACard title="Hạn mức giao dịch" :bordered="false">
            <AFormItem label="Hạn mức chuyển tiền/ngày">
              <AInputNumber
                  v-model:value="settings.transaction.dailyTransferLimit"
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              />
            </AFormItem>
            <AFormItem label="Hạn mức rút tiền/ngày">
              <AInputNumber
                  v-model:value="settings.transaction.dailyWithdrawLimit"
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              />
            </AFormItem>
            <AFormItem label="Số tiền tối thiểu">
              <AInputNumber
                  v-model:value="settings.transaction.minAmount"
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              />
            </AFormItem>
          </ACard>

          <ACard title="Phí giao dịch" :bordered="false">
            <AFormItem label="Phí chuyển tiền (%)">
              <AInputNumber v-model:value="settings.transaction.transferFee" class="w-full" :min="0" :max="100" :step="0.1" />
            </AFormItem>
            <AFormItem label="Phí rút tiền (%)">
              <AInputNumber v-model:value="settings.transaction.withdrawFee" class="w-full" :min="0" :max="100" :step="0.1" />
            </AFormItem>
            <AFormItem label="Miễn phí cho giao dịch dưới">
              <AInputNumber
                  v-model:value="settings.transaction.feeExemptionThreshold"
                  class="w-full"
                  :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              />
            </AFormItem>
          </ACard>
        </div>
      </ATabPane>

      <!-- Bảo mật -->
      <ATabPane key="security" tab="Bảo mật">
        <div class="grid grid-cols-2 gap-6">
          <ACard title="Cấu hình đăng nhập" :bordered="false">
            <AFormItem label="Số lần đăng nhập sai tối đa">
              <AInputNumber v-model:value="settings.security.maxLoginAttempts" class="w-full" :min="1" />
            </AFormItem>
            <AFormItem label="Thời gian khóa tài khoản (phút)">
              <AInputNumber v-model:value="settings.security.lockoutDuration" class="w-full" :min="1" />
            </AFormItem>
            <AFormItem label="Xác thực hai lớp">
              <ASwitch v-model:checked="settings.security.twoFactorEnabled" />
            </AFormItem>
            <AFormItem label="Thời gian session (phút)">
              <AInputNumber v-model:value="settings.security.sessionTimeout" class="w-full" :min="1" />
            </AFormItem>
          </ACard>

          <ACard title="Chính sách mật khẩu" :bordered="false">
            <AFormItem label="Độ dài tối thiểu">
              <AInputNumber v-model:value="settings.security.passwordMinLength" class="w-full" :min="6" />
            </AFormItem>
            <AFormItem label="Yêu cầu số">
              <ASwitch v-model:checked="settings.security.passwordRequireNumbers" />
            </AFormItem>
            <AFormItem label="Yêu cầu chữ hoa">
              <ASwitch v-model:checked="settings.security.passwordRequireUppercase" />
            </AFormItem>
            <AFormItem label="Yêu cầu ký tự đặc biệt">
              <ASwitch v-model:checked="settings.security.passwordRequireSpecial" />
            </AFormItem>
          </ACard>
        </div>
      </ATabPane>

      <!-- Thông báo -->
      <ATabPane key="notification" tab="Thông báo">
        <div class="grid grid-cols-2 gap-6">
          <ACard title="Cấu hình thông báo" :bordered="false">
            <AFormItem label="Thông báo qua email">
              <ASwitch v-model:checked="settings.notification.emailEnabled" />
            </AFormItem>
            <AFormItem label="Thông báo SMS">
              <ASwitch v-model:checked="settings.notification.smsEnabled" />
            </AFormItem>
            <AFormItem label="Thông báo đẩy">
              <ASwitch v-model:checked="settings.notification.pushEnabled" />
            </AFormItem>
            <AFormItem label="Telegram Bot Token" v-if="settings.notification.pushEnabled">
              <AInput v-model:value="settings.notification.telegramBotToken" />
            </AFormItem>
          </ACard>

          <ACard title="Sự kiện thông báo" :bordered="false">
            <ACheckboxGroup v-model:value="settings.notification.events">
              <div class="space-y-2">
                <ACheckbox value="login">Đăng nhập mới</ACheckbox>
                <ACheckbox value="transfer">Giao dịch chuyển tiền</ACheckbox>
                <ACheckbox value="withdraw">Rút tiền</ACheckbox>
                <ACheckbox value="security">Cảnh báo bảo mật</ACheckbox>
                <ACheckbox value="system">Thông báo hệ thống</ACheckbox>
              </div>
            </ACheckboxGroup>
          </ACard>
        </div>
      </ATabPane>

      <!-- Tích hợp -->
      <ATabPane key="integration" tab="Tích hợp">
        <div class="grid grid-cols-2 gap-6">
          <ACard title="API Configuration" :bordered="false">
            <AFormItem label="API Version">
              <ASelect v-model:value="settings.integration.apiVersion">
                <ASelectOption value="v1">Version 1.0</ASelectOption>
                <ASelectOption value="v2">Version 2.0</ASelectOption>
              </ASelect>
            </AFormItem>
            <AFormItem label="Rate Limit (requests/minute)">
              <AInputNumber v-model:value="settings.integration.rateLimit" class="w-full" :min="1" />
            </AFormItem>
            <AFormItem label="Timeout (seconds)">
              <AInputNumber v-model:value="settings.integration.timeout" class="w-full" :min="1" />
            </AFormItem>
            <AFormItem label="Debug Mode">
              <ASwitch v-model:checked="settings.integration.debugMode" />
            </AFormItem>
          </ACard>

          <ACard title="Webhook Settings" :bordered="false">
            <AFormItem label="Webhook URL">
              <AInput v-model:value="settings.integration.webhookUrl" />
            </AFormItem>
            <AFormItem label="Secret Key">
              <AInput v-model:value="settings.integration.webhookSecret" />
            </AFormItem>
            <AFormItem label="Events">
              <ASelect v-model:value="settings.integration.webhookEvents" mode="multiple">
                <ASelectOption value="transaction">Transactions</ASelectOption>
                <ASelectOption value="user">User Events</ASelectOption>
                <ASelectOption value="system">System Events</ASelectOption>
              </ASelect>
            </AFormItem>
            <AFormItem>
              <AButton @click="testWebhook">
                <template #icon><ApiOutlined /></template>
                Test Webhook
              </AButton>
            </AFormItem>
          </ACard>
        </div>
      </ATabPane>
    </ATabs>

    <div class="fixed bottom-6 right-6">
      <AAffix :offset-bottom="10">
        <AButton type="primary" size="large" :loading="saving" @click="saveAllSettings">
          <template #icon><SaveOutlined /></template>
          Lưu thay đổi
        </AButton>
      </AAffix>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import {
  SaveOutlined,
  SendOutlined,
  ApiOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  TransactionOutlined
} from '@ant-design/icons-vue'

// Stats data
const stats = [
  {
    title: 'Thay đổi cài đặt',
    value: 147,
    color: '#1890ff',
    trend: 12.5,
    icon: SettingOutlined
  },
  {
    title: 'Số lần đăng nhập',
    value: 2458,
    color: '#52c41a',
    trend: 8.3,
    icon: SecurityScanOutlined
  },
  {
    title: 'Thông báo gửi đi',
    value: 12589,
    color: '#722ed1',
    trend: 15.7,
    icon: BellOutlined
  },
  {
    title: 'API Calls',
    value: 45789,
    color: '#faad14',
    trend: -2.4,
    icon: ApiOutlined
  }
]

// State
const activeTab = ref('general')
const saving = ref(false)

// Mock timezone options
const timezoneOptions = [
  { value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Hồ Chí Minh' },
  { value: 'Asia/Bangkok', label: '(GMT+7) Bangkok' },
  { value: 'Asia/Singapore', label: '(GMT+8) Singapore' },
  { value: 'UTC', label: '(GMT+0) UTC' }
]

// Settings state
const settings = reactive({
  general: {
    appName: 'GonPay',
    appUrl: 'https://gonpay.com',
    timezone: 'Asia/Ho_Chi_Minh',
    defaultLanguage: 'vi',
    maintenanceMode: false
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    fromAddress: 'no-reply@gonpay.com',
    fromName: 'GonPay System',
    encryption: 'tls'
  },
  transaction: {
    dailyTransferLimit: 100000000,
    dailyWithdrawLimit: 50000000,
    minAmount: 10000,
    transferFee: 0.5,
    withdrawFee: 1,
    feeExemptionThreshold: 100000
  },
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    twoFactorEnabled: true,
    sessionTimeout: 120,
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    passwordRequireSpecial: true
  },
  notification: {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    telegramBotToken: '',
    events: ['login', 'transfer', 'withdraw', 'security']
  },
  integration: {
    apiVersion: 'v2',
    rateLimit: 1000,
    timeout: 30,
    debugMode: false,
    webhookUrl: 'https://webhook.gonpay.com/callback',
    webhookSecret: 'your-webhook-secret-key',
    webhookEvents: ['transaction', 'user']
  }
})

// Methods
const saveAllSettings = async () => {
  try {
    saving.value = true
    // Giả lập API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Validate settings trước khi lưu
    if (!validateSettings()) {
      return
    }

    // Lưu từng phần cài đặt
    await Promise.all([
      saveGeneralSettings(),
      saveEmailSettings(),
      saveTransactionSettings(),
      saveSecuritySettings(),
      saveNotificationSettings(),
      saveIntegrationSettings()
    ])

    message.success('Đã lưu thay đổi cài đặt thành công')

    // Ghi log
    logSettingsChange()

  } catch (error) {
    message.error('Không thể lưu cài đặt: ' + error.message)
  } finally {
    saving.value = false
  }
}

const validateSettings = () => {
  // Validate general settings
  if (!settings.general.appName || !settings.general.appUrl) {
    message.error('Vui lòng điền đầy đủ thông tin hệ thống')
    return false
  }

  // Validate email settings
  if (settings.notification.emailEnabled) {
    if (!settings.email.smtpHost || !settings.email.fromAddress) {
      message.error('Vui lòng cấu hình email đầy đủ')
      return false
    }
  }

  // Validate transaction limits
  if (settings.transaction.dailyTransferLimit < settings.transaction.minAmount) {
    message.error('Hạn mức chuyển tiền phải lớn hơn số tiền tối thiểu')
    return false
  }

  return true
}

const saveGeneralSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved general settings:', settings.general)
}

const saveEmailSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved email settings:', settings.email)
}

const saveTransactionSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved transaction settings:', settings.transaction)
}

const saveSecuritySettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved security settings:', settings.security)
}

const saveNotificationSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved notification settings:', settings.notification)
}

const saveIntegrationSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Saved integration settings:', settings.integration)
}

const logSettingsChange = () => {
  console.log('Settings changed at:', new Date().toISOString())
}

const testEmailConfig = async () => {
  try {
    message.loading('Đang gửi email test...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    message.success('Đã gửi email test thành công')
  } catch (error) {
    message.error('Không thể gửi email test: ' + error.message)
  }
}

const testWebhook = async () => {
  try {
    message.loading('Đang test webhook...')

    // Giả lập gửi test event
    const testEvent = {
      type: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook event'
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1500))
    message.success('Test webhook thành công')

    // Log test result
    console.log('Webhook test payload:', testEvent)

  } catch (error) {
    message.error('Test webhook thất bại: ' + error.message)
  }
}

// Watchers for important settings
watch(() => settings.security.twoFactorEnabled, (newValue) => {
  if (newValue) {
    message.warning('Hãy đảm bảo người dùng được thông báo về thay đổi này')
  }
})

watch(() => settings.general.maintenanceMode, (newValue) => {
  if (newValue) {
    Modal.confirm({
      title: 'Xác nhận bật chế độ bảo trì',
      content: 'Khi bật chế độ bảo trì, chỉ admin mới có thể truy cập hệ thống. Bạn có chắc chắn muốn tiếp tục?',
      okText: 'Bật',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã bật chế độ bảo trì')
      },
      onCancel: () => {
        settings.general.maintenanceMode = false
      }
    })
  }
})

// Auto-save draft settings
let autoSaveTimeout: NodeJS.Timeout
const autoSaveDraft = () => {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(() => {
    localStorage.setItem('settings_draft', JSON.stringify(settings))
  }, 1000)
}

watch(settings, autoSaveDraft, { deep: true })

// Load saved draft on mount
onMounted(() => {
  const savedDraft = localStorage.getItem('settings_draft')
  if (savedDraft) {
    try {
      const draftSettings = JSON.parse(savedDraft)
      Object.assign(settings, draftSettings)
    } catch (error) {
      console.error('Error loading settings draft:', error)
    }
  }
})

// Keyboard shortcuts
onMounted(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      saveAllSettings()
    }
  }

  window.addEventListener('keydown', handleKeyPress)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
  })
})

// Clean up
onUnmounted(() => {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
})

definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 16px;
}

.ant-card {
  height: 100%;
}
</style>
