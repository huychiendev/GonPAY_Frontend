import {useAuthStore} from "~/stores/auth";

export default defineNuxtRouteMiddleware((to, from) => {
    const authStore = useAuthStore()

    // Kiểm tra token trong localStorage khi refresh trang
    const token = localStorage.getItem('token')
    if (token && !authStore.token) {
        authStore.setToken(token)
    }

    // Chuyển hướng về trang đăng nhập nếu chưa xác thực
    if (!authStore.isAuthenticated && to.path !== '/auth/login' && to.path !== '/auth/register') {
        return navigateTo('/auth/login')
    }

    // Chuyển hướng về trang chủ nếu đã đăng nhập mà cố truy cập trang đăng nhập/đăng ký
    if (authStore.isAuthenticated && (to.path === '/auth/login' || to.path === '/auth/register')) {
        return navigateTo('/')
    }
})
