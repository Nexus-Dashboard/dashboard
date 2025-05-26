import axios from "axios"

const ApiBase = axios.create({
  baseURL: "https://api-phi-one-99.vercel.app" || "http://localhost:4000",
  timeout: 30000,
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
    console.error("API Error:", error.response?.data || error.message)
    return Promise.reject(error)
  },
)

export default ApiBase
