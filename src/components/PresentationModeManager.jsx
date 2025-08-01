"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useInactivityTimer } from "../hooks/useInactivityTimer"
import ApiBase from "../service/ApiBase"

const PRESENTATION_INTERVAL = 300000 // 5 minutes
const INACTIVITY_TIMEOUT = 300000 // 5 minutes

export const PresentationModeManager = () => {
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [topQuestions, setTopQuestions] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const presentationIntervalRef = useRef(null)
  const currentQuestionIndexRef = useRef(0)

  const fetchTopQuestions = useCallback(async () => {
    try {
      // Determinar o tipo de pesquisa baseado na URL atual
      const currentPath = location.pathname
      let surveyType = "telefonica" // padrão

      if (currentPath.includes("/f2f/")) {
        surveyType = "f2f"
      }

      // Buscar temas baseado no tipo de pesquisa
      const params = {}
      if (surveyType === "f2f") {
        params.type = "f2f"
      } else if (surveyType === "telefonica") {
        params.type = "telephonic"
      }

      const themesResponse = await ApiBase.get("/api/data/themes", { params })

      // Encontrar o tema de popularidade baseado no tipo de pesquisa
      let popularidadeTheme = null
      if (surveyType === "f2f") {
        popularidadeTheme = themesResponse.data.themes.find((t) => t.theme === "Popularidade Face a Face")
      } else {
        popularidadeTheme = themesResponse.data.themes.find((t) => t.theme === "Popularidade tracking")
      }

      if (!popularidadeTheme) {
        console.error(`Theme de popularidade não encontrado para o tipo ${surveyType}.`)
        return
      }

      // Buscar perguntas agrupadas do tema
      const questionParams = { ...params }
      const response = await ApiBase.get(
        `/api/data/themes/${encodeURIComponent(popularidadeTheme.theme)}/questions-grouped`,
        { params: questionParams },
      )

      if (response.data.success) {
        const sortedQuestions = response.data.questionGroups
          .filter((g) => g.type === "text-grouped" && g.rounds?.length > 1) // Only individual questions with history
          .sort((a, b) => (b.rounds?.length || 0) - (a.rounds?.length || 0))
        setTopQuestions(sortedQuestions.slice(0, 5))
      }
    } catch (error) {
      console.error("Failed to fetch top questions for presentation mode:", error)
    }
  }, [location.pathname])

  const startPresentationMode = useCallback(() => {
    // Don't start if already in presentation mode or no questions are loaded
    if (isPresentationMode || topQuestions.length === 0) return

    console.log("Starting presentation mode...")
    setIsPresentationMode(true)
    currentQuestionIndexRef.current = 0
    const firstQuestion = topQuestions[0]
    navigate(
      `/dashboard?theme=${encodeURIComponent(firstQuestion.theme)}&questionText=${encodeURIComponent(firstQuestion.questionText)}`,
    )

    if (presentationIntervalRef.current) clearInterval(presentationIntervalRef.current)

    presentationIntervalRef.current = setInterval(() => {
      currentQuestionIndexRef.current = (currentQuestionIndexRef.current + 1) % topQuestions.length
      const nextQuestion = topQuestions[currentQuestionIndexRef.current]
      console.log(`Switching to question ${currentQuestionIndexRef.current + 1}: ${nextQuestion.questionText}`)
      navigate(
        `/dashboard?theme=${encodeURIComponent(nextQuestion.theme)}&questionText=${encodeURIComponent(nextQuestion.questionText)}`,
      )
    }, PRESENTATION_INTERVAL)
  }, [navigate, topQuestions, isPresentationMode])

  const stopPresentationMode = useCallback(() => {
    if (isPresentationMode) {
      console.log("Stopping presentation mode due to activity.")
      setIsPresentationMode(false)
      if (presentationIntervalRef.current) {
        clearInterval(presentationIntervalRef.current)
        presentationIntervalRef.current = null
      }
      // Only navigate away if the user is currently on a dashboard page from the presentation
      if (location.pathname.startsWith("/dashboard")) {
        navigate("/")
      }
    }
  }, [isPresentationMode, navigate, location.pathname])

  useEffect(() => {
    fetchTopQuestions()
  }, [fetchTopQuestions])

  useInactivityTimer({
    onTimeout: startPresentationMode,
    onActivity: stopPresentationMode,
    timeout: INACTIVITY_TIMEOUT,
  })

  return null // This is a manager component, it doesn't render anything
}
