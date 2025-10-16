"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"

const PRESENTATION_INTERVAL = 300000 // 5 minutes

export const PresentationModeManager = () => {
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [topQuestions, setTopQuestions] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const presentationIntervalRef = useRef(null)
  const currentQuestionIndexRef = useRef(0)

  const fetchTopQuestions = useCallback(async () => {
    try {
      // Perguntas fixas para o modo apresentação - Tema: Popularidade tracking
      const fixedQuestions = [
        "Como você avalia o desempenho do Governo Federal? Você diria que ele está sendo ótimo, bom, regular, ruim ou péssimo? (ESTIMULADA E ÚNICA)",
        "E você aprova ou desaprova o desempenho do Governo Federal? (ESTIMULADA E ÚNICA)",
        "E como você avalia o desempenho do Presidente da República? Você diria que ele está sendo ótimo, bom, regular, ruim ou péssimo?(ESTIMULADA E ÚNICA)",
        "E você aprova ou desaprova o trabalho do Presidente da República? (ESTIMULADA E ÚNICA)"
      ]

      // Buscar o tema Popularidade tracking
      const themesResponse = await ApiBase.get("/api/data/themes", { params: { type: "telephonic" } })
      const popularidadeTheme = themesResponse.data.themes.find((t) => t.theme === "Popularidade tracking")

      if (!popularidadeTheme) {
        console.error("Theme 'Popularidade tracking' não encontrado.")
        return
      }

      // Buscar perguntas agrupadas do tema
      const response = await ApiBase.get(
        `/api/data/themes/${encodeURIComponent(popularidadeTheme.theme)}/questions-grouped`,
        { params: { type: "telephonic" } },
      )

      if (response.data.success) {
        // Filtrar apenas as perguntas fixas definidas
        const selectedQuestions = response.data.questionGroups
          .filter((g) => g.type === "text-grouped" && fixedQuestions.includes(g.questionText))
          .sort((a, b) => {
            // Ordenar na ordem das perguntas fixas
            const indexA = fixedQuestions.indexOf(a.questionText)
            const indexB = fixedQuestions.indexOf(b.questionText)
            return indexA - indexB
          })

        setTopQuestions(selectedQuestions)
      }
    } catch (error) {
      console.error("Failed to fetch fixed questions for presentation mode:", error)
    }
  }, [])

  const startPresentationMode = useCallback(() => {
    // Don't start if already in presentation mode or no questions are loaded
    if (isPresentationMode || topQuestions.length === 0) return

    setIsPresentationMode(true)
    window.isPresentationModeActive = true
    
    // Entrar em tela cheia
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log("Erro ao entrar em tela cheia:", err)
      })
    }
    
    currentQuestionIndexRef.current = 0
    const firstQuestion = topQuestions[0]
    navigate(
      `/dashboard?theme=${encodeURIComponent(firstQuestion.theme)}&questionText=${encodeURIComponent(firstQuestion.questionText)}&type=telephonic&pageTitle=${encodeURIComponent("Avaliação e Aprovação do Governo")}`,
    )

    if (presentationIntervalRef.current) clearInterval(presentationIntervalRef.current)

    presentationIntervalRef.current = setInterval(() => {
      currentQuestionIndexRef.current = (currentQuestionIndexRef.current + 1) % topQuestions.length
      const nextQuestion = topQuestions[currentQuestionIndexRef.current]
      navigate(
        `/dashboard?theme=${encodeURIComponent(nextQuestion.theme)}&questionText=${encodeURIComponent(nextQuestion.questionText)}&type=telephonic&pageTitle=${encodeURIComponent("Avaliação e Aprovação do Governo")}`,
      )
    }, PRESENTATION_INTERVAL)
  }, [navigate, topQuestions, isPresentationMode])

  const stopPresentationMode = useCallback(() => {
    if (isPresentationMode) {
      setIsPresentationMode(false)
      window.isPresentationModeActive = false
      
      // Sair da tela cheia
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.log("Erro ao sair da tela cheia:", err)
        })
      }
      
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
    
    // Listener para quando sair da tela cheia manualmente
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentationMode) {
        stopPresentationMode()
      }
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [fetchTopQuestions, isPresentationMode, stopPresentationMode])

  // Listener para evento manual de iniciar apresentação
  useEffect(() => {
    const handleManualStart = () => {
      startPresentationMode()
    }

    window.addEventListener('startPresentationMode', handleManualStart)
    
    return () => {
      window.removeEventListener('startPresentationMode', handleManualStart)
    }
  }, [startPresentationMode])

  // Expor estado do modo apresentação globalmente
  useEffect(() => {
    window.isPresentationMode = isPresentationMode
    if (isPresentationMode) {
      window.isPresentationModeActive = true
    }
  }, [isPresentationMode])

  return null // This is a manager component, it doesn't render anything
}