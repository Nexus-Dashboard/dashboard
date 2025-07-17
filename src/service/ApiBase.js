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

// Métodos específicos para as novas rotas da API
export const ApiMethods = {
  // Buscar todos os temas
  getThemes: () => ApiBase.get("/api/data/themes"),

  // Buscar perguntas de um tema específico
  getThemeQuestions: (themeSlug) => ApiBase.get(`/api/data/themes/${themeSlug}/questions`),

  // Buscar dados de uma pergunta específica
  getQuestionResponses: (questionCode) => ApiBase.get(`/api/data/question/${questionCode}/responses`),

  // Buscar comparação de uma pergunta
  getQuestionComparison: (questionCode, response) =>
    ApiBase.get(`/api/data/question/${questionCode}/comparison?response=${encodeURIComponent(response)}`),

  // Buscar todas as perguntas com paginação
  getAllQuestions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return ApiBase.get(`/api/data/questions/all${queryString ? `?${queryString}` : ""}`)
  },

  // Nova função para buscar TODAS as páginas de questões
  getAllQuestionsComplete: async () => {
    console.log("Iniciando busca completa de todas as questões...")
    let allQuestions = []
    let currentPage = 1
    let totalPages = 1

    try {
      // Primeira requisição para descobrir quantas páginas existem
      const firstResponse = await ApiBase.get(`/api/data/questions/all?page=1&limit=50`)
      
      if (!firstResponse.data?.success) {
        throw new Error("API returned an error")
      }

      allQuestions = [...firstResponse.data.data.questions]
      totalPages = firstResponse.data.data.pagination.totalPages
      
      console.log(`Total de páginas: ${totalPages}`)

      // Buscar as páginas restantes em paralelo (mas com limite)
      const batchSize = 5 // Processar 5 páginas por vez para não sobrecarregar
      
      for (let startPage = 2; startPage <= totalPages; startPage += batchSize) {
        const endPage = Math.min(startPage + batchSize - 1, totalPages)
        const promises = []
        
        for (let page = startPage; page <= endPage; page++) {
          promises.push(
            ApiBase.get(`/api/data/questions/all?page=${page}&limit=50`)
              .then(response => {
                if (response.data?.success) {
                  console.log(`Página ${page} carregada com ${response.data.data.questions.length} questões`)
                  return response.data.data.questions
                }
                return []
              })
              .catch(error => {
                console.error(`Erro ao buscar página ${page}:`, error)
                return []
              })
          )
        }

        // Aguardar o lote atual
        const batchResults = await Promise.all(promises)
        
        // Adicionar resultados do lote
        batchResults.forEach(pageQuestions => {
          allQuestions = [...allQuestions, ...pageQuestions]
        })
        
        console.log(`Progresso: ${allQuestions.length} questões carregadas de ${firstResponse.data.data.pagination.totalQuestions}`)
      }

      console.log(`Busca completa finalizada: ${allQuestions.length} questões carregadas`)

      return {
        success: true,
        data: {
          questions: allQuestions,
          pagination: {
            ...firstResponse.data.data.pagination,
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        }
      }
    } catch (error) {
      console.error("Erro na busca completa de dados:", error.message)
      throw error
    }
  },

  // Buscar perguntas
  searchQuestions: (query) => ApiBase.get(`/api/data/search/questions?q=${encodeURIComponent(query)}`),

  // Buscar perguntas de um tema (método POST)
  getThemeQuestionsPost: (theme) => ApiBase.post("/api/data/themes/questions", { theme }),
}

export default ApiBase