<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
            <div>
                <h2 class="text-center text-3xl font-extrabold text-gray-900">
                    Đăng ký tài khoản
                </h2>
            </div>
            <AForm :model="formState" @finish="handleSubmit" layout="vertical" :rules="rules">
                <AFormItem label="Tên đăng nhập" name="username">
                    <AInput v-model:value="formState.username" />
                </AFormItem>

                <AFormItem label="Email" name="email">
                    <AInput v-model:value="formState.email" />
                </AFormItem>

                <AFormItem label="Số điện thoại" name="phone_number">
                    <AInput v-model:value="formState.phone_number" />
                </AFormItem>

                <AFormItem label="Mật khẩu" name="password">
                    <AInputPassword v-model:value="formState.password" />
                </AFormItem>

                <div class="flex justify-between items-center">
                    <AButton type="primary" html-type="submit" :loading="loading">
                        Đăng ký
                    </AButton>
                    <NuxtLink to="/auth/login" class="text-blue-600 hover:text-blue-800">
                        Đã có tài khoản? Đăng nhập
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

const router = useRouter()
const { fetchApi } = useApi()
const loading = ref(false)

const formState = reactive({
    username: '',
    email: '',
    phone_number: '',
    password: ''
})

const rules = {
    username: [{ required: true, message: 'Vui lòng nhập tên đăng nhập' }],
    email: [
        { required: true, message: 'Vui lòng nhập email' },
        { type: 'email', message: 'Email không hợp lệ' }
    ],
    phone_number: [{ required: true, message: 'Vui lòng nhập số điện thoại' }],
    password: [
        { required: true, message: 'Vui lòng nhập mật khẩu' },
        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
    ]
}

const handleSubmit = async () => {
    try {
        loading.value = true
        const { data, error } = await fetchApi('/register', {
            method: 'POST',
            body: formState
        })

        if (error.value) throw error.value

        message.success('Đăng ký thành công')
        router.push('/auth/login')
    } catch (err: any) {
        message.error(err.message || 'Đăng ký thất bại')
    } finally {
        loading.value = false
    }
}
</script>
