<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
            <div>
                <h2 class="text-center text-3xl font-extrabold text-gray-900">
                    Đăng nhập
                </h2>
            </div>

            <AAlert v-if="error" type="error" show-icon :message="error" class="mb-4" />

            <AForm :model="formState" @finish="handleSubmit" layout="vertical" :rules="rules">
                <AFormItem label="Email" name="email">
                    <AInput v-model:value="formState.email" :disabled="loading" />
                </AFormItem>

                <AFormItem label="Mật khẩu" name="password">
                    <AInputPassword v-model:value="formState.password" :disabled="loading" />
                </AFormItem>

                <div class="flex justify-between items-center">
                    <ACheckbox v-model:checked="rememberMe" :disabled="loading">
                        Ghi nhớ đăng nhập
                    </ACheckbox>
                    <NuxtLink to="/auth/forgot-password" class="text-blue-600 hover:text-blue-800">
                        Quên mật khẩu?
                    </NuxtLink>
                </div>

                <div class="flex justify-between items-center mt-4">
                    <AButton type="primary" html-type="submit" :loading="loading" :disabled="loading">
                        {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
                    </AButton>
                    <NuxtLink to="/auth/register" class="text-blue-600 hover:text-blue-800">
                        Chưa có tài khoản? Đăng ký
                    </NuxtLink>
                </div>
            </AForm>
        </div>
    </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useRouter } from 'nuxt/app'
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const { fetchApi } = useApi()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const rememberMe = ref(false)

const formState = reactive<LoginRequest>({
    email: '',
    password: ''
})

const rules = {
    email: [
        { required: true, message: 'Vui lòng nhập email' },
        { type: 'email', message: 'Email không hợp lệ' }
    ],
    password: [
        { required: true, message: 'Vui lòng nhập mật khẩu' }
    ]
}

interface LoginResponse {
  user: {
    id: number
    username: string
    email: string
    phone_number: string
    role: string
    status: string
    preferences: {
      language: string
      notification_enabled: boolean
    }
  }
  token: string
}

const handleSubmit = async () => {
  try {
    error.value = ''
    loading.value = true

    const { data, error: apiError } = await fetchApi<LoginResponse>('https://gonpay-backend-2.onrender.com/api/login', {
      method: 'POST',
      body: formState
    })

    if (apiError.value) {
      if (apiError.value.status === 503) {
        throw new Error('Hệ thống đang bảo trì, vui lòng thử lại sau')
      }
      throw new Error(apiError.value.message || 'Đăng nhập thất bại')
    }

    if (!data.value || !data.value.token) {
      throw new Error('Đăng nhập thất bại: Không nhận được token')
    }

    // Lưu thông tin đăng nhập
    authStore.setUser(data.value.user)
    authStore.setToken(data.value.token)

    if (rememberMe.value) {
      localStorage.setItem('token', data.value.token)
    }

    message.success('Đăng nhập thành công')
    await router.push('/')
  } catch (err: any) {
    error.value = err.message || 'Đăng nhập thất bại'
    message.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>
