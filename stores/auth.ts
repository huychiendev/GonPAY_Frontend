import { defineStore } from 'pinia'

interface User {
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

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        token: null,
        isAuthenticated: false
    }),

    getters: {
        getUser: (state) => state.user,
        getToken: (state) => state.token,
        isAdmin: (state) => state.user?.role === 'ADMIN'
    },

    actions: {
        setUser(user: User) {
            this.user = user
            this.isAuthenticated = true
        },

        setToken(token: string) {
            this.token = token
            localStorage.setItem('token', token)
        },

        logout() {
            this.user = null
            this.token = null
            this.isAuthenticated = false
            localStorage.removeItem('token')
        },

        async checkAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    // Gọi API kiểm tra token
                    const response = await fetch('/api/auth/verify', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    
                    if (response.ok) {
                        const data = await response.json()
                        this.setUser(data.user)
                        this.token = token
                    } else {
                        this.logout()
                    }
                } catch (error) {
                    this.logout()
                }
            }
        }
    },

    persist: {
        paths: ['token', 'user']
    }
})
