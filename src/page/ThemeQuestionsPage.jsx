"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Card, Button, Alert, Form, InputGroup, Badge, Spinner } from "react-bootstrap"
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Search, BarChart3, Filter, Layers, FileText } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import ApiBase from "../service/ApiBase"
import "./ThemeQuestionsPage.css"
import { formatApiDateForDisplay } from "../hooks/dateUtils"
import { ApiMethods } from "../service/ApiBase"


const fetchThemeNameBySlug = async (themeSlug, surveyType) => {
  const { data } = await ApiBase.get("/api/data/themes", { params: { type: surveyType } })
  if (!data.success) throw new Error("Erro ao buscar temas")
  const theme = data.themes.find((t) => t.slug === themeSlug)
  if (!theme) throw new Error(`Tema não encontrado para slug: ${themeSlug}`)
  return theme.theme
}

const fetchGroupedQuestions = async (themeName, surveyType) => {
  const { data } = await ApiBase.get(`/api/data/themes/${encodeURIComponent(themeName)}/questions-grouped`, {
    params: { type: surveyType },
  })
  if (!data.success) throw new Error("Erro ao buscar perguntas agrupadas")
  return data
}

export default function ThemeQuestionsPage() {
  const navigate = useNavigate()
  const { themeSlug, surveyType } = useParams()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRound, setSelectedRound] = useState("")

  const {
    data: themeName,
    isLoading: isLoadingTheme,
    error: themeError,
  } = useQuery({
    queryKey: ["themeName", themeSlug, surveyType],
    queryFn: () => fetchThemeNameBySlug(themeSlug, surveyType),
    enabled: !!themeSlug,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["groupedQuestions", themeName, surveyType],
    queryFn: () => fetchGroupedQuestions(themeName, surveyType),
    enabled: !!themeName,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  // NOVO: Query para buscar dados de datas
  const { data: questionsData } = useQuery({
    queryKey: ["allQuestions", surveyType],
    queryFn: async () => {
      try {
        // Usar o método que busca TODAS as páginas
        const response = await ApiMethods.getAllQuestionsComplete()
        return response?.success ? response.data.questions : []
      } catch (error) {
        console.warn("Erro ao buscar dados de questões:", error)
        // Fallback para busca simples com mais registros
        try {
          const fallbackResponse = await ApiBase.get("/api/data/questions/all?page=1&limit=1000")
          return fallbackResponse.data?.success ? fallbackResponse.data.data.questions : []
        } catch (fallbackError) {
          return []
        }
      }
    },
    enabled: !!themeName,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })

  const availableRounds = useMemo(() => {
    if (!data?.questionGroups) return []
    const allRounds = data.questionGroups.flatMap((g) => g.rounds || [])
    const uniqueRounds = [...new Set(allRounds)]
    
    // Mapear rodadas com datas
    const roundsWithDates = uniqueRounds.map(round => {
      const questionWithDate = questionsData?.find(q => q.surveyNumber?.toString() === round.toString())
      const dateStr = questionWithDate?.date ? formatApiDateForDisplay(questionWithDate.date) : ""
      
      return {
        number: round,
        label: dateStr ? `Rodada ${round} - ${dateStr}` : `Rodada ${round}`,
        value: round
      }
    })
    
    return roundsWithDates.sort((a, b) => Number(a.value) - Number(b.value))
  }, [data, questionsData])

  const { multipleQuestions, textGroupedQuestions } = useMemo(() => {
    const allGroups = data?.questionGroups || []
    return {
      multipleQuestions: allGroups.filter((g) => g.type === "multiple") || [],
      textGroupedQuestions: allGroups.filter((g) => g.type === "text-grouped") || [],
    }
  }, [data])

  const sortLogic = (a, b) => {
    // 1. Sort by number of rounds (descending)
    const roundsDiff = (b.rounds?.length || 0) - (a.rounds?.length || 0)
    if (roundsDiff !== 0) {
      return roundsDiff
    }

    // 2. Sort by the first variable (alphanumerically, ascending)
    const varA = a.variables?.[0]
    const varB = b.variables?.[0]

    if (varA && varB) {
      return varA.localeCompare(varB)
    }
    if (varA) return -1
    if (varB) return 1

    return 0
  }

  const filteredMultiple = useMemo(() => {
    let results = multipleQuestions

    if (selectedRound) {
      results = results.filter((g) => (g.rounds || []).includes(selectedRound))
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      results = results.filter(
        (g) =>
          g.questionText?.toLowerCase().includes(term) ||
          g.baseCode?.toLowerCase().includes(term) ||
          (g.subQuestions || []).some((sq) => sq.label?.toLowerCase().includes(term)),
      )
    }

    return results.sort(sortLogic)
  }, [multipleQuestions, searchTerm, selectedRound])

  const filteredTextGrouped = useMemo(() => {
    let results = textGroupedQuestions

    if (selectedRound) {
      results = results.filter((g) => (g.rounds || []).includes(selectedRound))
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      results = results.filter(
        (g) =>
          g.questionText?.toLowerCase().includes(term) ||
          (g.shortText && g.shortText.toLowerCase().includes(term)) ||
          (g.variables || []).some((v) => v.toLowerCase().includes(term)),
      )
    }

    return results.sort(sortLogic)
  }, [textGroupedQuestions, searchTerm, selectedRound])

  const handleQuestionClick = useCallback(
    (group) => {
      const params = new URLSearchParams({ theme: themeName, type: surveyType })
      if (group.type === "multiple") {
        params.append("baseCode", group.baseCode)
        params.append("variables", JSON.stringify(group.variables))
        navigate(`/dashboard/matrix?${params.toString()}`)
      } else {
        // type === 'text-grouped'
        params.append("questionText", group.questionText)

        // Check if it's a single-round question
        if ((group.rounds || []).length === 1 && (group.variables || []).length === 1) {
          // Navigate to SingleMentionDashboard with parameters for a GET request
          params.append("questionCode", group.variables[0])
          params.append("surveyNumber", group.rounds[0])
          navigate(`/dashboard/single-mention?${params.toString()}`)
        } else {
          // Navigate to the main Dashboard for historical view (multi-round)
          // This uses a POST request with theme and questionText
          navigate(`/dashboard?${params.toString()}`)
        }
      }
    },
    [navigate, themeName, surveyType],
  )

  const handleBack = useCallback(() => navigate(-1), [navigate])
  const handleSearchChange = useCallback((e) => setSearchTerm(e.target.value), [])
  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedRound("")
  }, [])

  const loading = isLoadingTheme || isLoading
  const hasError = themeError || error

  return (
    <div className="questions-page-wrapper">
      <CommonHeader />

      <main className="content-area">
        <Container>
          <div className="page-title-section">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="main-title">{loading ? "Carregando tema..." : themeName}</h1>
                <p className="main-description">
                  {loading 
                    ? "Carregando perguntas disponíveis..." 
                    : "Explore as perguntas disponíveis para análise."
                  }
                </p>
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="back-button">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>

          <Card className="filters-card">
            <Card.Body>            

              <div className="filters-row">
                
                <div className="filter-search">
                  <Form.Group>
                    <Form.Label>Buscar por texto, código ou variável</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <Search size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                      />
                    </InputGroup>
                  </Form.Group>
                </div>

                <div className="filter-round">
                  <Form.Group>
                    <Form.Label>Filtrar por rodada</Form.Label>
                    <Form.Select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)}>
                      <option value="">Todas as rodadas</option>
                      {availableRounds.map((round) => (
                        <option key={round.value} value={round.value}>
                          {round.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>

                <div className="filter-clear">
                  <Form.Label>&nbsp;</Form.Label>
                  <Button
                    variant="outline-secondary"
                    onClick={handleClearFilters}
                    className="clear-filters-btn d-block w-100"
                    disabled={!searchTerm && !selectedRound}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Mostrar erro se houver */}
          {hasError && (
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar dados</Alert.Heading>
              <p>{hasError?.message}</p>
              <Button variant="outline-danger" onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </Alert>
          )}

          {/* Mostrar loading ou conteúdo */}
          {loading && !hasError && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando perguntas do tema...</p>
            </div>
          )}

          {!loading && !hasError && (
            <>
              {filteredMultiple.length === 0 && filteredTextGrouped.length === 0 ? (
                <div className="empty-state">
                  <h4>Nenhuma pergunta encontrada</h4>
                  <p>
                    Não foram encontradas perguntas que correspondam à sua busca. Tente um termo diferente ou limpe o
                    filtro.
                  </p>
                  <Button variant="primary" onClick={handleClearFilters}>
                    Limpar busca
                  </Button>
                </div>
              ) : (
                <>
                  {filteredMultiple.length > 0 && (
                    <section>
                      <div className="question-group-header">
                        <Layers />
                        <h4>Perguntas de Matriz (Múltiplas)</h4>
                      </div>
                      <div className="questions-grid">
                        {filteredMultiple.map((group) => (
                          <Card key={group.id} className="question-card" onClick={() => handleQuestionClick(group)}>
                            <Card.Body>
                              <div className="question-card-header">
                                <div>
                                  <h6 className="question-card-title">{group.questionText}</h6>
                                  <Badge bg="primary" pill>
                                    {group.baseCode}
                                  </Badge>
                                </div>
                              </div>
                              <p className="question-card-meta">Contém {group.totalSubQuestions || 0} sub-perguntas.</p>
                              <ul className="sub-questions-list">
                                {(group.subQuestions || []).slice(0, 3).map((sub) => (
                                  <li key={sub.variable} className="sub-question-item">
                                    <span className="sub-question-variable">{sub.variable}</span>
                                    <span className="sub-question-label">{sub.label}</span>
                                  </li>
                                ))}
                                {(group.subQuestions || []).length > 3 && (
                                  <li className="sub-question-item text-muted">
                                    ... e mais {(group.subQuestions || []).length - 3}
                                  </li>
                                )}
                              </ul>
                              <div className="question-card-footer">
                                <Badge bg="info">{(group.rounds || []).length} Rodadas</Badge>
                                <Button variant="primary" size="sm" className="analyze-button">
                                  <BarChart3 size={14} className="me-1" />
                                  Analisar Matriz
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredTextGrouped.length > 0 && (
                    <section>
                      <div className="question-group-header">
                        <FileText />
                        <h4>Perguntas Individuais (Agrupadas por Texto)</h4>
                      </div>
                      <div className="questions-grid">
                        {filteredTextGrouped.map((group) => (
                          <Card key={group.id} className="question-card" onClick={() => handleQuestionClick(group)}>
                            <Card.Body>
                              <h6 className="question-card-title">
                                {group.shortText || group.questionText}
                              </h6>

                              <div className="question-card-footer">
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-${group.id}`}>
                                      {(group.variables || []).length} variável(eis): {(group.variables || []).join(", ")}
                                    </Tooltip>
                                  }
                                >
                                  <Badge bg="secondary" style={{ cursor: 'pointer' }}>
                                    {(group.rounds || []).length} Rodadas
                                  </Badge>
                                </OverlayTrigger>

                                <Button variant="outline-primary" size="sm" className="analyze-button">
                                  <BarChart3 size={14} className="me-1" />
                                  Ver Histórico
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p className="mb-0">Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}