"use client"

import { useState, useEffect, useCallback } from "react"
import { ApiMethods } from "../service/ApiBase"

// Hook para buscar temas
export const useThemes = () => {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchThemes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ApiMethods.getThemes()
      if (response.data && response.data.success) {
        setThemes(response.data.themes)
      } else {
        setError("Não foi possível carregar os temas.")
      }
    } catch (err) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
      console.error("Erro ao buscar temas:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchThemes()
  }, [fetchThemes])

  return { themes, loading, error, refetch: fetchThemes }
}

// Hook para buscar perguntas de um tema
export const useThemeQuestions = (themeSlug) => {
  const [questions, setQuestions] = useState([])
  const [themeName, setThemeName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!themeSlug) return

    const fetchQuestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiMethods.getThemeQuestions(themeSlug)

        if (response.data && response.data.success) {
          setThemeName(response.data.theme)

          // Filtrar para obter apenas perguntas únicas baseadas na 'variable'
          const uniqueQuestionsMap = new Map()
          response.data.questions.forEach((question) => {
            if (!uniqueQuestionsMap.has(question.variable)) {
              uniqueQuestionsMap.set(question.variable, question)
            }
          })
          const uniqueQuestions = Array.from(uniqueQuestionsMap.values())
          setQuestions(uniqueQuestions)
        } else {
          setError("Não foi possível carregar as perguntas para este tema.")
        }
      } catch (err) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
        console.error(`Erro ao buscar perguntas para o tema ${themeSlug}:`, err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [themeSlug])

  return { questions, themeName, loading, error }
}

// Hook para buscar dados de uma pergunta
export const useQuestionData = (questionCode) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!questionCode) return

    const fetchQuestionData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiMethods.getQuestionResponses(questionCode)

        if (response.data && response.data.success) {
          setData(response.data)
        } else {
          setError("Não foi possível carregar os dados da pergunta.")
        }
      } catch (err) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
        console.error(`Erro ao buscar dados da pergunta ${questionCode}:`, err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionData()
  }, [questionCode])

  return { data, loading, error }
}

// Hook para buscar todas as perguntas com paginação
export const useAllQuestions = (params = {}) => {
  const [questions, setQuestions] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAllQuestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiMethods.getAllQuestions(params)

        if (response.data && response.data.success) {
          setQuestions(response.data.data.questions)
          setPagination(response.data.data.pagination)
        } else {
          setError("Não foi possível carregar as perguntas.")
        }
      } catch (err) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
        console.error("Erro ao buscar todas as perguntas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllQuestions()
  }, [JSON.stringify(params)])

  return { questions, pagination, loading, error }
}

// Hook para busca de perguntas
export const useSearchQuestions = (query) => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const searchQuestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiMethods.searchQuestions(query)

        if (response.data && response.data.success) {
          setResults(response.data.questions)
        } else {
          setError("Erro na busca de perguntas.")
        }
      } catch (err) {
        setError("Erro de conexão durante a busca.")
        console.error("Erro na busca de perguntas:", err)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchQuestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  return { results, loading, error }
}
