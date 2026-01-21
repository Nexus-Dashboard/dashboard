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

    // Adicionar o parâmetro 'type' se estiver presente nos parâmetros da requisição
    if (config.params?.type) {
      config.url = `${config.url}?type=${config.params.type}`
      // Remover o 'type' dos params para não ser adicionado duas vezes
      delete config.params.type
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
  getThemes: (type) => ApiBase.get("/api/data/themes", { params: { type } }),

  // Buscar perguntas de um tema específico
  getThemeQuestions: (themeSlug, type) => ApiBase.get(`/api/data/themes/${themeSlug}/questions`, { params: { type } }),

  // Buscar dados de uma pergunta específica
  getQuestionResponses: (questionCode, params = {}) =>
    ApiBase.get(`/api/data/question/${questionCode}/responses`, { params }),

  // Buscar comparação de uma pergunta
  getQuestionComparison: (questionCode, response) =>
    ApiBase.get(`/api/data/question/${questionCode}/comparison?response=${encodeURIComponent(response)}`),

  // Buscar todas as perguntas com paginação
  getAllQuestions: (params = {}) => {
    return ApiBase.get(`/api/data/questions/all`, { params })
  },

  // Nova função para buscar TODAS as páginas de questões
  getAllQuestionsComplete: async () => {
    console.log("Iniciando busca completa de todas as questões...")
    let allQuestions = []
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
              .then((response) => {
                if (response.data?.success) {
                  console.log(`Página ${page} carregada com ${response.data.data.questions.length} questões`)
                  return response.data.data.questions
                }
                return []
              })
              .catch((error) => {
                console.error(`Erro ao buscar página ${page}:`, error)
                return []
              }),
          )
        }

        // Aguardar o lote atual
        const batchResults = await Promise.all(promises)

        // Adicionar resultados do lote
        batchResults.forEach((pageQuestions) => {
          allQuestions = [...allQuestions, ...pageQuestions]
        })

        console.log(
          `Progresso: ${allQuestions.length} questões carregadas de ${firstResponse.data.data.pagination.totalQuestions}`,
        )
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
          },
        },
      }
    } catch (error) {
      console.error("Erro na busca completa de dados:", error.message)
      throw error
    }
  },

  // Buscar perguntas
  searchQuestions: (query, type) =>
    ApiBase.get(`/api/data/search/questions?q=${encodeURIComponent(query)}`, { params: { type } }),

  // Buscar perguntas de um tema (método POST)
  getThemeQuestionsPost: (theme, type) => ApiBase.post("/api/data/themes/questions", { theme }, { params: { type } }),

  // NOVO: Buscar índice de perguntas da Pesquisa Ampliada (Rodada 16)
  getExpandedSurveyIndex: async () => {
    try {
      const response = await axios.get(
        "https://nmbcoamazonia-api.vercel.app/google/sheets/1pcJqXSzEzqNYWMdThadgmt3FDib5V5gzZz2DSeXg1AU/data"
      )

      if (!response.data?.success) {
        throw new Error("Erro ao buscar índice da pesquisa ampliada")
      }

      // Filtrar apenas rodada 16
      const values = response.data.data.values

      // Filtrar linhas da rodada 16
      const round16Questions = values.slice(1).filter(row => {
        const roundNumber = row[0] // "Número da Pesquisa" está na primeira coluna
        return roundNumber === "16"
      })

      // Mapear para objetos estruturados
      const questions = round16Questions.map(row => ({
        surveyNumber: row[0],
        fileName: row[1],
        variable: row[2],
        questionText: row[3],
        label: row[5],
        index: row[6],
        methodology: row[7],
        map: row[8],
        sample: row[9],
        date: row[10],
      }))

      return {
        success: true,
        data: questions
      }
    } catch (error) {
      console.error("Erro ao buscar índice da pesquisa ampliada:", error)
      throw error
    }
  },

  // NOVO: Buscar dados brutos da Pesquisa Ampliada (Rodada 16)
  getExpandedSurveyData: async () => {
    try {
      const response = await axios.get(
        "https://nmbcoamazonia-api.vercel.app/google/sheets/1jveDEOr6-GBlh4-vOfjUfs6D-1am3trZunJ7BQR3WIg/data",
        {
          params: {
            range: "BD - F2F Brasil - Pesquisa Pred"
          }
        }
      )

      if (!response.data?.success) {
        throw new Error("Erro ao buscar dados da pesquisa ampliada")
      }

      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      console.error("Erro ao buscar dados da pesquisa ampliada:", error)
      throw error
    }
  },

  // NOVO: Buscar índice de perguntas da Rodada 13 (Onda 1)
  // O índice está na mesma planilha da Rodada 16, apenas filtrado por número da pesquisa
  getWave1SurveyIndex: async () => {
    try {
      const response = await axios.get(
        "https://nmbcoamazonia-api.vercel.app/google/sheets/1pcJqXSzEzqNYWMdThadgmt3FDib5V5gzZz2DSeXg1AU/data"
      )

      if (!response.data?.success) {
        throw new Error("Erro ao buscar índice da Rodada 13 (Onda 1)")
      }

      const values = response.data.data.values

      // Filtrar linhas da rodada 13 (mesmo índice que a Rodada 16)
      const round13Questions = values.slice(1).filter(row => {
        const roundNumber = row[0] // "Número da Pesquisa" está na primeira coluna
        return roundNumber === "13"
      })

      // Mapear para objetos estruturados (mesma estrutura da Rodada 16)
      const questions = round13Questions.map(row => ({
        surveyNumber: row[0],
        fileName: row[1],
        variable: row[2],
        questionText: row[3],
        label: row[5],
        index: row[6],
        methodology: row[7],
        map: row[8],
        sample: row[9],
        date: row[10],
      }))

      return {
        success: true,
        data: questions
      }
    } catch (error) {
      console.error("Erro ao buscar índice da Rodada 13:", error)
      throw error
    }
  },

  // NOVO: Buscar dados brutos da Rodada 13 (Onda 1)
  getWave1SurveyData: async () => {
    try {
      const response = await axios.get(
        "https://nmbcoamazonia-api.vercel.app/google/sheets/1VkyGtH11Ghl6H9USVfWOrQUOCyy8tO-L65936Jz3BQA/data",
        {
          params: {
            range: "BD SECOM - F2F - PESQUISA AMPLI"
          }
        }
      )

      if (!response.data?.success) {
        throw new Error("Erro ao buscar dados da Rodada 13 (Onda 1)")
      }

      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      console.error("Erro ao buscar dados da Rodada 13:", error)
      throw error
    }
  },

  // NOVO: Buscar mapeamento de perguntas entre Rodada 13 (Onda 1) e Rodada 16 (Onda 2)
  // O mapeamento é feito comparando "Texto da Pergunta" e "Rótulo" entre as rodadas
  // A estrutura da API agora é um índice unificado com todas as perguntas
  getQuestionMapping: async () => {
    try {
      const response = await axios.get(
        "https://nmbcoamazonia-api.vercel.app/google/sheets/1KE58via47wIUxYyx23ByPGwR8j1nL8JQC6CVEq7mm4U/data"
      )

      if (!response.data?.success) {
        throw new Error("Erro ao buscar mapeamento de perguntas")
      }

      const values = response.data.data.values
      const rows = values.slice(1) // Pular header

      // Separar perguntas por rodada
      // Estrutura: [Número da Pesquisa, Arquivo do BD, Variável, Texto da Pergunta, , Rótulo, Index, ...]
      const r13Questions = []
      const r16Questions = []

      rows.forEach(row => {
        const surveyNumber = row[0]
        const variable = row[2]
        const questionText = row[3]?.trim() || ''
        const label = row[5]?.trim() || ''

        const questionObj = {
          surveyNumber,
          variable,
          questionText,
          label,
          // Criar chave de comparação: combinação de texto + rótulo (normalizado)
          comparisonKey: normalizeForComparison(questionText, label)
        }

        if (surveyNumber === "13") {
          r13Questions.push(questionObj)
        } else if (surveyNumber === "16") {
          r16Questions.push(questionObj)
        }
      })

      // Criar mapeamento baseado no texto da pergunta e rótulo
      const mappingR13toR16 = {}
      const mappingR16toR13 = {}
      const matchedPairs = []

      r16Questions.forEach(r16Q => {
        // Procurar pergunta equivalente na R13
        const matchingR13 = r13Questions.find(r13Q => {
          // Comparar pela chave normalizada (texto + rótulo)
          return r13Q.comparisonKey === r16Q.comparisonKey && r13Q.comparisonKey !== ''
        })

        if (matchingR13) {
          mappingR13toR16[matchingR13.variable] = r16Q.variable
          mappingR16toR13[r16Q.variable] = matchingR13.variable

          matchedPairs.push({
            r13Variable: matchingR13.variable,
            r16Variable: r16Q.variable,
            questionText: r16Q.questionText,
            label: r16Q.label
          })
        }
      })

      console.log(`📋 Mapeamento criado: ${matchedPairs.length} perguntas equivalentes encontradas`)
      console.log('Exemplos de mapeamento:', matchedPairs.slice(0, 5))

      return {
        success: true,
        data: {
          r13ToR16: mappingR13toR16, // Mapeia Rodada 13 -> Rodada 16
          r16ToR13: mappingR16toR13, // Mapeia Rodada 16 -> Rodada 13
          matchedPairs,              // Pares correspondentes com detalhes
          r13Questions,              // Todas as perguntas da R13
          r16Questions,              // Todas as perguntas da R16
          rawData: rows              // Dados brutos para referência
        }
      }
    } catch (error) {
      console.error("Erro ao buscar mapeamento de perguntas:", error)
      throw error
    }
  },
}

/**
 * Normaliza texto da pergunta e rótulo para comparação
 * Remove acentos, pontuação, espaços extras e converte para minúsculas
 */
function normalizeForComparison(questionText, label) {
  const text = `${questionText || ''} ${label || ''}`.trim()

  if (!text) return ''

  return text
    .toLowerCase()
    // Remover acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover pontuação
    .replace(/[.,;:!?()[\]{}'"]/g, '')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    .trim()
}

export default ApiBase
