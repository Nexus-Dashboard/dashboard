import axios from "axios"

// Configuração base da API
const ApiBase = axios.create({
  baseURL: "https://api-phi-one-99.vercel.app" || "http://localhost:4000",
  timeout: 120000, // 2 minutes timeout for large responses
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token de autenticação
ApiBase.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para tratar respostas e erros
ApiBase.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("API Error:", error.message)

    // Se o token expirou, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login"
      }
    }

    return Promise.reject(error)
  },
)

export default ApiBase
