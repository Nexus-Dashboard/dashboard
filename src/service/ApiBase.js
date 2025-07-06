import axios from "axios"

const ApiBase = axios.create({
  baseURL: "https://api-phi-one-99.vercel.app" || "http://localhost:4000",
  timeout: 120000, // Aumentado para 2 minutos (120 segundos)
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor for authentication if needed
ApiBase.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if required in the future
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor for error handling
ApiBase.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Better error handling for timeouts and large responses
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout - A resposta da API está demorando mais que o esperado")
    } else {
      console.error("API Error:", error.response?.data || error.message)
    }
    return Promise.reject(error)
  },
)

export default ApiBase
