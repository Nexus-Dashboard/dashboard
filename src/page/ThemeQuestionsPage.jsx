"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Row, Col, Card, Button, Alert, Badge, Form } from "react-bootstrap"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Search, Layers, BarChart3, Users } from "lucide-react"

// Componentes
import LoadingState from "../components/LoadingState"

// Serviços
import ApiBase from "../service/ApiBase"

// Estilos
import "./ThemeQuestionsPage.css"

// Função para buscar o nome real do tema usando o slug
const fetchThemeNameBySlug = async (themeSlug) => {
  console.log(`🔍 Buscando nome real do tema para slug: ${themeSlug}`)

  try {
    const { data } = await ApiBase.get("/api/data/themes")
    console.log("📋 Temas recebidos:", data)

    if (!data.success) {
      throw new Error("Erro ao buscar temas")
    }

    const theme = data.themes.find((t) => t.slug === themeSlug)
    if (!theme) {
      throw new Error(`Tema não encontrado para slug: ${themeSlug}`)
    }

    console.log(`✅ Nome real encontrado: ${theme.theme}`)
    return theme.theme
  } catch (error) {
    console.error("💥 Erro ao buscar nome do tema:", error.message)
    throw error
  }
}

// Função para buscar perguntas agrupadas do tema
const fetchGroupedQuestions = async (themeName) => {
  console.log(`🔍 Buscando perguntas agrupadas para tema: ${themeName}`)

  try {
    const { data } = await ApiBase.get(`/api/data/themes/${encodeURIComponent(themeName)}/questions-grouped`)
    console.log("📊 Perguntas agrupadas recebidas:", data)

    if (!data.success) {
      throw new Error("Erro ao buscar perguntas agrupadas")
    }

    return data
  } catch (error) {
    console.error("💥 Erro ao buscar perguntas agrupadas:", error.message)
    throw error
  }
}

export default function ThemeQuestionsPage() {
  const navigate = useNavigate()
  const { themeSlug } = useParams()

  // Estados
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState([])

  // Query para buscar nome real do tema
  const {
    data: themeName,
    isLoading: isLoadingTheme,
    error: themeError,
  } = useQuery({
    queryKey: ["themeName", themeSlug],
    queryFn: () => fetchThemeNameBySlug(themeSlug),
    enabled: !!themeSlug,
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  })

  // Query para buscar perguntas agrupadas
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["groupedQuestions", themeName],
    queryFn: () => fetchGroupedQuestions(themeName),
    enabled: !!themeName,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  })

  const questionGroups = data?.questionGroups || []
  const totalGroups = data?.totalGroups || 0
  const totalQuestions = data?.totalQuestions || 0

  // Filtrar grupos por termo de busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return questionGroups

    const term = searchTerm.toLowerCase()
    return questionGroups.filter(
      (group) =>
        group.questionText.toLowerCase().includes(term) ||
        group.shortText.toLowerCase().includes(term) ||
        group.variables.some((variable) => variable.toLowerCase().includes(term)),
    )
  }, [questionGroups, searchTerm])

  // Handlers
  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleQuestionClick = useCallback(
    (group) => {
      const params = new URLSearchParams({
        theme: themeName,
        questionText: group.questionText,
        groupId: group.id,
      })

      navigate(`/dashboard?${params.toString()}`)
    },
    [navigate, themeName],
  )

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Estados de loading e erro
  if (isLoadingTheme) {
    return <LoadingState message="Carregando informações do tema..." />
  }

  if (themeError) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Erro ao carregar tema</Alert.Heading>
          <p>{themeError.message}</p>
          <Button variant="secondary" onClick={handleBack}>
            Voltar
          </Button>
        </Alert>
      </Container>
    )
  }

  if (isLoading) {
    return <LoadingState message="Carregando perguntas agrupadas..." />
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Erro ao carregar perguntas</Alert.Heading>
          <p>{error.message}</p>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" onClick={handleRefresh}>
              Tentar novamente
            </Button>
            <Button variant="secondary" onClick={handleBack}>
              Voltar
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <div className="theme-questions-wrapper">
      {/* Header */}
      <div className="theme-questions-header">
        <Container>
          <div className="d-flex justify-content-between align-items-start">
            <div className="header-content">
              <Button variant="outline-secondary" size="sm" onClick={handleBack} className="mb-3">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>

              <div className="theme-info">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Layers size={20} className="text-primary" />
                  <Badge bg="primary" pill>
                    Perguntas Agrupadas
                  </Badge>
                  <Badge bg="info" pill>
                    {totalGroups} grupos
                  </Badge>
                  <Badge bg="success" pill>
                    {totalQuestions} questões
                  </Badge>
                </div>

                <h1 className="theme-title">{themeName}</h1>
                <p className="theme-description">
                  Visualize perguntas agrupadas por conteúdo similar para análise consolidada
                </p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Estatísticas */}
      <section className="stats-section">
        <Container>
          <Row>
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <Layers size={32} className="stat-icon text-primary" />
                  <h3 className="stat-number">{totalGroups}</h3>
                  <p className="stat-label">Grupos de Perguntas</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <BarChart3 size={32} className="stat-icon text-success" />
                  <h3 className="stat-number">{totalQuestions}</h3>
                  <p className="stat-label">Total de Questões</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <Users size={32} className="stat-icon text-info" />
                  <h3 className="stat-number">{filteredGroups.length}</h3>
                  <p className="stat-label">Grupos Filtrados</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Filtros */}
      <section className="filters-section">
        <Container>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Filtros de Busca</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Buscar por texto da pergunta ou variável</Form.Label>
                    <div className="position-relative">
                      <Search size={16} className="search-icon" />
                      <Form.Control
                        type="text"
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="ps-5"
                      />
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="outline-secondary" onClick={() => setSearchTerm("")} disabled={!searchTerm}>
                    Limpar Filtros
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
      </section>

      {/* Lista de Grupos de Perguntas */}
      <section className="questions-section">
        <Container>
          {filteredGroups.length === 0 ? (
            <Alert variant="info">
              <Alert.Heading>Nenhum grupo encontrado</Alert.Heading>
              <p>
                {searchTerm
                  ? `Não foram encontrados grupos que correspondam ao termo "${searchTerm}".`
                  : "Não há grupos de perguntas disponíveis para este tema."}
              </p>
              {searchTerm && (
                <Button variant="outline-info" onClick={() => setSearchTerm("")}>
                  Limpar busca
                </Button>
              )}
            </Alert>
          ) : (
            <Row>
              {filteredGroups.map((group) => (
                <Col lg={6} className="mb-4" key={group.id}>
                  <Card className="question-group-card h-100">
                    <Card.Header className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center gap-2">
                        <Layers size={16} className="text-primary" />
                        <small className="text-muted">Grupo #{group.id.split("-").pop()}</small>
                      </div>
                      <div className="d-flex gap-1">
                        <Badge bg="primary" pill>
                          {group.totalVariations} variações
                        </Badge>
                        <Badge bg="info" pill>
                          {group.variables.length} variáveis
                        </Badge>
                        <Badge bg="success" pill>
                          {group.rounds.length} rodadas
                        </Badge>
                      </div>
                    </Card.Header>

                    <Card.Body>
                      <h6 className="question-text mb-3">{group.shortText}</h6>

                      <div className="question-meta mb-3">
                        <div className="meta-item">
                          <strong>Variáveis:</strong> {group.variables.join(", ")}
                        </div>
                        <div className="meta-item">
                          <strong>Rodadas:</strong> {group.rounds.join(", ")}
                        </div>
                      </div>

                      {group.variations && group.variations.length > 0 && (
                        <div className="variations-preview mb-3">
                          <small className="text-muted">
                            <strong>Exemplo de variação:</strong>
                            <br />
                            {group.variations[0].surveyName} - {group.variations[0].date}
                          </small>
                        </div>
                      )}
                    </Card.Body>

                    <Card.Footer>
                      <Button variant="primary" size="sm" onClick={() => handleQuestionClick(group)} className="w-100">
                        <BarChart3 size={16} className="me-2" />
                        Visualizar Dashboard
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </div>
  )
}
