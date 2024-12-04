<!-- layouts/admin.vue -->
<template>
  <ALayout class="min-h-screen">
    <!-- Header -->
    <ALayoutHeader class="flex items-center justify-between overflow-hidden">
      <div class="flex items-center  ">
        <!-- Logo -->
        <div class="flex items-center mr-8 ml-[-10%]">
          <img src="/GonPay.png" alt="GonPay Logo" class="w-16 h-auto mr-2 bg-white p-2 rounded-lg"/>
          <span class="text-xl font-bold text-emerald-500 whitespace-nowrap">GonPay Admin</span>
        </div>

        <!-- Toggle Sidebar Button -->
        <AButton type="text" @click="collapsed = !collapsed" class="text-white">
          <MenuFoldOutlined v-if="collapsed"/>
          <MenuUnfoldOutlined v-else/>
        </AButton>
      </div>

      <div class="flex-1 mx-8 w-[70%]">
        <div class="marquee-container overflow-hidden">
          <div class="flex items-center space-x-8 animate-marquee whitespace-nowrap">
            <template v-for="notification in marqueeNotifications" :key="notification.id">
              <div class="inline-flex items-center space-x-2">
                <component
                  :is="getNotificationIcon(notification.type)"
                  :class="{
                    'text-green-500': notification.type === 'success',
                    'text-yellow-500': notification.type === 'warning',
                    'text-blue-500': notification.type === 'info'
                  }"
                />
                <span class="text-white text-sm">{{ notification.message }}</span>
                <span class="text-gray-400 text-xs">{{ formatTime(notification.time) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Right Header Actions -->
      <div class=" text-white flex items-center space-x-4">
        <!-- Notifications -->
        <ADropdown>
          <ABadge :count="notificationCount">
            <BellOutlined class="text-xl cursor-pointer text-white"/>
          </ABadge>
          <template #overlay>
            <AMenu>
              <AMenuItem>
                <RouterLink to="/admin/notifications">Xem tất cả thông báo</RouterLink>
              </AMenuItem>
            </AMenu>
          </template>
        </ADropdown>

        <!-- User Profile -->
        <ADropdown>
          <div class="flex items-center cursor-pointer">
            <AAvatar>
              <template #icon>
                <UserOutlined/>
              </template>
            </AAvatar>
            <span class="ml-2">Admin</span>
          </div>
          <template #overlay>
            <AMenu>
              <AMenuItem key="profile">
                <RouterLink to="/admin/profile">Thông tin cá nhân</RouterLink>
              </AMenuItem>
              <AMenuItem key="settings">
                <RouterLink to="/admin/settings">Cài đặt</RouterLink>
              </AMenuItem>
              <AMenuDivider/>
              <AMenuItem key="logout" @click="handleLogout">
                Đăng xuất
              </AMenuItem>
            </AMenu>
          </template>
        </ADropdown>
      </div>
    </ALayoutHeader>

    <ALayout>
      <!-- Sidebar -->
      <ALayoutSider v-model:collapsed="collapsed" :trigger="null" collapsible class="bg-white">
        <AMenu v-model:selectedKeys="selectedKeys" mode="inline" class="h-full border-r">
          <!-- Dashboard -->
          <AMenuItem key="dashboard">
            <template #icon>
              <DashboardOutlined/>
            </template>
            <RouterLink to="/">Dashboard</RouterLink>
          </AMenuItem>

          <!-- User Management -->
          <ASubMenu key="users">
            <template #icon>
              <UsergroupAddOutlined/>
            </template>
            <template #title>Quản lý người dùng</template>
            <AMenuItem key="users-list">
              <RouterLink to="/admin/users">Danh sách người dùng</RouterLink>
            </AMenuItem>
            <AMenuItem key="users-roles">
              <RouterLink to="/admin/users/roles">Phân quyền</RouterLink>
            </AMenuItem>
          </ASubMenu>

          <!-- Wallet Management -->
          <ASubMenu key="wallets">
            <template #icon>
              <WalletOutlined/>
            </template>
            <template #title>Quản lý ví</template>
            <AMenuItem key="wallets-list">
              <RouterLink to="/admin/wallets">Danh sách ví</RouterLink>
            </AMenuItem>
            <AMenuItem key="wallets-transactions">
              <RouterLink to="/admin/wallets/transactions">Lịch sử giao dịch</RouterLink>
            </AMenuItem>
          </ASubMenu>

          <!-- Payment Methods -->

          <AMenuItem key="payments">
            <template #icon>
              <CreditCardOutlined/>
            </template>
            <RouterLink to="/admin/payment-methods">Phương thức thanh toán </RouterLink>
          </AMenuItem>


          <!-- Beneficiaries -->
          <AMenuItem key="beneficiaries">
            <template #icon>
              <TeamOutlined/>
            </template>
            <RouterLink to="/admin/beneficiaries">Người thụ hưởng</RouterLink>
          </AMenuItem>

          <!-- Transaction Limits -->
          <AMenuItem key="limits">
            <template #icon>
              <SafetyCertificateOutlined/>
            </template>
            <RouterLink to="/admin/limits">Hạn mức giao dịch</RouterLink>
          </AMenuItem>

          <!-- Notifications -->
          <AMenuItem key="notifications">
            <template #icon>
              <BellOutlined/>
            </template>
            <RouterLink to="/admin/notifications">Thông báo</RouterLink>
          </AMenuItem>

          <!-- System Logs -->
          <ASubMenu key="logs">
            <template #icon>
              <FileSearchOutlined/>
            </template>
            <template #title>Nhật ký hệ thống</template>
            <AMenuItem key="audit-logs">
              <RouterLink to="/admin/audit-logs">Nhật ký hoạt động</RouterLink>
            </AMenuItem>
            <AMenuItem key="system-logs">
              <RouterLink to="/admin/system-logs">Nhật ký hệ thống</RouterLink>
            </AMenuItem>
          </ASubMenu>

          <!-- Settings -->
          <AMenuItem key="settings">
            <template #icon>
              <SettingOutlined/>
            </template>
            <RouterLink to="/admin/settings">Cài đặt hệ thống</RouterLink>
          </AMenuItem>
        </AMenu>
      </ALayoutSider>

      <!-- Main Content -->
      <ALayoutContent class="p-6 bg-gray-50">
        <!-- Breadcrumb -->
        <ABreadcrumb class="mb-4">
          <ABreadcrumbItem>
            <HomeOutlined/>
          </ABreadcrumbItem>
          <ABreadcrumbItem>Admin</ABreadcrumbItem>
          <ABreadcrumbItem>{{ currentPage }}</ABreadcrumbItem>
        </ABreadcrumb>

        <!-- Page Content -->
        <div class="bg-white p-6 rounded-lg shadow">
          <slot/>
        </div>
      </ALayoutContent>
    </ALayout>
  </ALayout>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
  CreditCardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  FileSearchOutlined,
  SettingOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'

// State
const collapsed = ref(false)
const selectedKeys = ref(['dashboard'])
const notificationCount = ref(5)

// Router
const route = useRoute()
const router = useRouter()

// Computed
const currentPage = computed(() => {
  const path = route.path.split('/').pop()
  return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard'
})

// Methods
const handleLogout = async () => {
  try {
    // Add logout logic here
    await router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const marqueeNotifications = ref([
  {
    id: 1,
    type: 'success',
    message: 'Hệ thống vừa cập nhật tính năng mới: Thanh toán QR',
    time: new Date(Date.now() - 5 * 60000)
  },
  {
    id: 2,
    type: 'warning',
    message: 'Bảo trì hệ thống dự kiến: 23:00 tối nay',
    time: new Date(Date.now() - 15 * 60000)
  },
  {
    id: 3,
    type: 'info',
    message: 'Tỷ giá USD/VND: 24,500',
    time: new Date(Date.now() - 30 * 60000)
  },
  {
    id: 4,
    type: 'success',
    message: 'Giao dịch trong ngày đạt 1,234 tỷ VND',
    time: new Date(Date.now() - 45 * 60000)
  }
])

const getNotificationIcon = (type) => {
  switch(type) {
    case 'success': return CheckCircleOutlined
    case 'warning': return WarningOutlined
    case 'info': return InfoCircleOutlined
    default: return BellOutlined
  }
}

const formatTime = (time) => {
  const minutes = Math.floor((Date.now() - time.getTime()) / 60000)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  return `${hours} giờ trước`
}

// Cập nhật thông báo mới theo thời gian thực
onMounted(() => {
  setInterval(() => {
    const types = ['success', 'warning', 'info']
    const messages = [
      'Giao dịch thành công: ' + formatCurrency(Math.random() * 1000000000),
      'Người dùng mới đăng ký: +' + Math.floor(Math.random() * 100),
      'Tỷ lệ chuyển đổi: ' + (Math.random() * 20).toFixed(1) + '%',
      'Đang xử lý: ' + Math.floor(Math.random() * 100) + ' giao dịch',
      'Hệ thống hoạt động ổn định: ' + (99 + Math.random()).toFixed(1) + '%',
      'Tổng giao dịch: ' + formatCurrency(Math.random() * 10000000000),
      'Kiểm tra bảo mật hoàn tất',
      'Cập nhật dữ liệu thành công',
      'Đồng bộ số dư ví',
      'Xác thực người dùng mới'
    ]

    marqueeNotifications.value.push({
      id: Date.now(),
      type: types[Math.floor(Math.random() * types.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      time: new Date()
    })

    // Giữ số lượng thông báo trong khoảng 5-10
    if (marqueeNotifications.value.length > 10) {
      marqueeNotifications.value = marqueeNotifications.value.slice(-5)
    }
  }, 3000) // Thêm thông báo mới mỗi 3 giây
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}
</script>

<style scoped>
.ant-layout-header {
  height: 64px;
  line-height: 64px;
  border-bottom: 1px solid #f0f0f0;
}

.ant-layout-sider {
  min-height: calc(100vh - 64px);
}

.marquee-container {
  mask-image: linear-gradient(
    to right,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
}

.animate-marquee:hover {
  animation-play-state: paused;
}

.notification-ticker {
  position: relative;
  height: 24px;
}

.notification-slide-move,
.notification-slide-enter-active,
.notification-slide-leave-active {
  transition: all 0.5s ease;
}

.notification-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.notification-slide-leave-active {
  position: absolute;
}

.notification-item {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notifications-container {
  max-width: 100%;
  overflow: hidden;
}
</style>
