"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Image, Spinner, Breadcrumb, Badge } from "react-bootstrap"
import { useNavigate, useParams, Link } from "react-router-dom"
import { BarChart3, ChevronLeft, HelpCircle } from "lucide-react"
import ApiBase from "../service/ApiBase"
import { useAuth } from "../contexts/AuthContext"
import "./ThemeQuestionsPage.css"

export default function ThemeQuestionsPage() {
  const navigate = useNavigate()
  const { themeSlug } = useParams()
  const { logout } = useAuth()

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

        // Tratar o slug especial para a API
        const apiSlug = themeSlug === "avaliacao-de-governo" ? "popularidade-tracking" : themeSlug

        const response = await ApiBase.get(`/api/data/themes/${apiSlug}/questions`)

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

  const handleQuestionClick = (question) => {
    // Futuramente, navegar para a página de análise da pergunta
    navigate(`/dashboard?question=${question.variable}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="questions-page-wrapper">
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
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/home" }}>
              Temas
            </Breadcrumb.Item>
            <Breadcrumb.Item active>{loading ? "Carregando..." : themeName}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="page-title-section">
            <h1 className="main-title">{loading ? "Carregando Tema..." : themeName}</h1>
            <p className="main-description">
              {loading
                ? "Buscando perguntas..."
                : `Selecione uma das ${questions.length} perguntas distintas disponíveis para análise detalhada.`}
            </p>
          </div>

          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando perguntas...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger text-center">
              <p className="mb-0">{error}</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate("/home")}>
                <ChevronLeft size={16} className="me-2" />
                Voltar para Temas
              </Button>
            </div>
          )}

          {!loading && !error && (
            <Row className="g-4">
              {questions.map((question) => (
                <Col key={question.variable} md={12}>
                  <Card className="question-card" onClick={() => handleQuestionClick(question)}>
                    <Card.Body className="d-flex align-items-center">
                      <div className="question-icon-wrapper">
                        <HelpCircle size={24} color="white" />
                      </div>
                      <div className="question-text-wrapper">
                        <p className="question-text">{question.questionText || question.label}</p>
                        <Badge bg="secondary" pill>
                          {question.variable}
                        </Badge>
                      </div>
                      <Button variant="dark" size="sm" className="view-question-btn ms-auto">
                        <BarChart3 size={14} className="me-2" />
                        Analisar
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
      </footer>
    </div>
  )
}
