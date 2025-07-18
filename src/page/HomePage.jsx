"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Image, Spinner, Breadcrumb, Badge } from "react-bootstrap"
import { useNavigate, useParams, Link } from "react-router-dom"
import { Folder, ChevronRight, Search } from "lucide-react"
import ApiBase from "../service/ApiBase"
import { useAuth } from "../contexts/AuthContext"
import "./HomePage.css"

export default function HomePage() {
  const navigate = useNavigate()
  const { surveyType } = useParams()
  const { logout } = useAuth()

  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchThemesWithUniqueQuestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiBase.get("/api/data/themes")

        if (response.data && response.data.success) {
          const fetchedThemes = response.data.themes

          // Para cada tema, buscar as perguntas e contar apenas as únicas
          const themesWithUniqueCount = await Promise.all(
            fetchedThemes.map(async (theme) => {
              try {
                const questionsResponse = await ApiBase.get(`/api/data/themes/${theme.slug}/questions`)

                if (questionsResponse.data && questionsResponse.data.success) {
                  // Filtrar para obter apenas perguntas únicas baseadas na 'variable'
                  const uniqueQuestionsMap = new Map()
                  questionsResponse.data.questions.forEach((question) => {
                    if (!uniqueQuestionsMap.has(question.variable)) {
                      uniqueQuestionsMap.set(question.variable, question)
                    }
                  })
                  const uniqueQuestionCount = uniqueQuestionsMap.size

                  return {
                    ...theme,
                    questionCount: uniqueQuestionCount,
                  }
                } else {
                  return {
                    ...theme,
                    questionCount: 0,
                  }
                }
              } catch (err) {
                console.error(`Erro ao buscar perguntas para o tema ${theme.slug}:`, err)
                return {
                  ...theme,
                  questionCount: 0,
                }
              }
            }),
          )

          // Find, rename, and move "Popularidade tracking" to the top
          const popularidadeIndex = themesWithUniqueCount.findIndex((t) => t.theme === "Popularidade tracking")
          if (popularidadeIndex > -1) {
            const popularidadeTheme = { ...themesWithUniqueCount[popularidadeIndex], theme: "Avaliação do Governo" }
            themesWithUniqueCount.splice(popularidadeIndex, 1)
            themesWithUniqueCount.unshift(popularidadeTheme)
          }

          setThemes(themesWithUniqueCount)
        } else {
          setError("Não foi possível carregar os temas.")
        }
      } catch (err) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
        console.error("Erro ao buscar temas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchThemesWithUniqueQuestions()
  }, [])

  const handleThemeClick = (theme) => {
    navigate(`/theme/${surveyType}/${theme.slug}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getSurveyTypeTitle = () => {
    return surveyType === "telefonica" ? "Pesquisas Telefônicas" : "Pesquisas Face-to-Face"
  }

  return (
    <div className="home-page-wrapper">
      <header className="main-header">
        <Container className="d-flex justify-content-between align-items-center">
          <Image src="/nexus-logo.png" alt="Nexus Logo" className="header-logo-nexus" />
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </Container>
      </header>

      <main className="content-area">
        <Container>
          <Breadcrumb className="mb-4 custom-breadcrumb">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
              Tipos de Pesquisa
            </Breadcrumb.Item>
            <Breadcrumb.Item active>{getSurveyTypeTitle()}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="page-title-section">
            <h1 className="main-title">{getSurveyTypeTitle()}</h1>
            <p className="main-description">
              {loading ? "Carregando temas disponíveis..." : `Explore ${themes.length} temas de pesquisa disponíveis`}
            </p>
          </div>

          {loading && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando temas e contando perguntas únicas...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <p className="mb-0">{error}</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate("/")}>
                Voltar ao Início
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="themes-grid">
              <Row className="g-4">
                {themes.map((theme) => (
                  <Col key={theme.id || theme.slug} lg={4} md={6}>
                    <Card className="theme-card" onClick={() => handleThemeClick(theme)}>
                      <Card.Body>
                        <div className="theme-icon-wrapper">
                          <Folder size={24} color="white" />
                        </div>

                        <div className="flex-grow-1">
                          <h5 className="theme-card-title">{theme.theme}</h5>
                          <p className="theme-card-description">
                            Análise detalhada de dados relacionados a {theme.theme.toLowerCase()}
                          </p>
                        </div>

                        <div className="theme-footer">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <Badge bg="info" pill>
                              {theme.questionCount} pergunta{theme.questionCount !== 1 ? "s" : ""} única
                              {theme.questionCount !== 1 ? "s" : ""}
                            </Badge>
                            <ChevronRight size={20} className="text-muted" />
                          </div>
                          <Button variant="dark" size="sm" className="view-analysis-btn w-100">
                            Ver Análises
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {!loading && !error && themes.length === 0 && (
            <div className="empty-state">
              <Search size={48} className="text-muted mb-3" />
              <h4 className="text-muted">Nenhum tema encontrado</h4>
              <p className="text-muted">Não há temas disponíveis para este tipo de pesquisa no momento.</p>
            </div>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}
