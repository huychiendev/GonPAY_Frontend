<!-- layouts/admin.vue -->
<template>
  <ALayout class="min-h-screen">
    <!-- Header -->
    <ALayoutHeader class="flex items-center justify-between px-6">
      <div class="flex items-center">
        <!-- Logo -->
        <div class="flex items-center mr-8">
<!--          <img src="/api/placeholder/40/40" alt="GonPay Logo" class="h-8 w-8 mr-2"/>-->
          <span class="text-xl font-bold text-emerald-500">GonPay Admin</span>
        </div>

        <!-- Toggle Sidebar Button -->
        <AButton type="text" @click="collapsed = !collapsed" class="text-white">
          <MenuFoldOutlined v-if="collapsed"/>
          <MenuUnfoldOutlined v-else/>
        </AButton>
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
import {ref, computed} from 'vue'
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
  HomeOutlined
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
    await router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
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
</style>
