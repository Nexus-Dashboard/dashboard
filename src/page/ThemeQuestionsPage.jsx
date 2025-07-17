"use client"

import { useState } from "react"
import { Container, Row, Col, Card, Button, Image, Spinner, Breadcrumb, Badge } from "react-bootstrap"
import { useNavigate, useParams, Link } from "react-router-dom"
import { BarChart3, ChevronLeft, HelpCircle, List, Grid3x3 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useThemeQuestions } from "../hooks/useApiData"
import { groupQuestionsByAnswerType } from "../utils/questionGrouping"
import AnswerOptionsDisplay from "../components/AnswerOptionsDisplay"
import "./ThemeQuestionsPage.css"

export default function ThemeQuestionsPage() {
  const navigate = useNavigate()
  const { surveyType, themeSlug } = useParams()
  const { logout } = useAuth()
  const [viewMode, setViewMode] = useState("grouped") // "grouped" ou "list"

  // Usar o hook personalizado
  const { questions, themeName, loading, error } = useThemeQuestions(themeSlug)

  // Agrupar perguntas por tipo de resposta
  const groupedQuestions = groupQuestionsByAnswerType(questions)

  const handleQuestionClick = (question) => {
    navigate(`/dashboard?question=${question.variable}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "grouped" ? "list" : "grouped")
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
          <Breadcrumb className="mb-4 custom-breadcrumb">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
              Tipos de Pesquisa
            </Breadcrumb.Item>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/themes/${surveyType}` }}>
              {surveyType === "telefonica" ? "Pesquisas Telefônicas" : "Pesquisas F2F"}
            </Breadcrumb.Item>
            <Breadcrumb.Item active>{loading ? "Carregando..." : themeName}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="page-title-section">
            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-3">
              <div className="title-content">
                <h1 className="main-title">{loading ? "Carregando Tema..." : themeName}</h1>
                <p className="main-description">
                  {loading
                    ? "Buscando perguntas..."
                    : `${questions.length} perguntas disponíveis organizadas por tipo de resposta`}
                </p>
              </div>

              {!loading && !error && questions.length > 0 && (
                <Button 
                  variant="outline-dark" 
                  onClick={toggleViewMode} 
                  className="view-toggle-btn d-flex align-items-center gap-2"
                >
                  {viewMode === "grouped" ? <List size={16} /> : <Grid3x3 size={16} />}
                  {viewMode === "grouped" ? "Ver Lista" : "Ver Agrupado"}
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando perguntas...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <p className="mb-0">{error}</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate(`/themes/${surveyType}`)}>
                <ChevronLeft size={16} className="me-2" />
                Voltar para Temas
              </Button>
            </div>
          )}

          {!loading && !error && viewMode === "list" && (
            <div className="questions-list">
              {questions.map((question) => (
                <Card key={question.variable} className="question-card mb-3" onClick={() => handleQuestionClick(question)}>
                  <Card.Body>
                    <div className="question-card-content">
                      <div className="question-icon-wrapper">
                        <HelpCircle size={24} color="white" />
                      </div>
                      <div className="question-text-wrapper">
                        <p className="question-text">{question.questionText || question.label}</p>
                        <div className="question-meta">
                          <Badge bg="secondary" pill className="me-2">
                            {question.variable}
                          </Badge>
                          <AnswerOptionsDisplay possibleAnswers={question.possibleAnswers} maxDisplay={2} />
                        </div>
                      </div>
                      <Button variant="dark" size="sm" className="view-question-btn">
                        <BarChart3 size={14} className="me-2" />
                        Analisar
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && viewMode === "grouped" && (
            <div className="grouped-questions">
              {Object.values(groupedQuestions).map((group) => (
                <Card key={group.key} className="group-card">
                  <Card.Header className="group-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="group-info">
                        <h5 className="group-title">{group.title}</h5>
                        <small className="group-description">{group.description}</small>
                      </div>
                      <Badge bg={group.color} pill className="group-badge">
                        {group.questions.length} pergunta{group.questions.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </Card.Header>

                  <Card.Body className="group-body">
                    {/* Mostrar exemplo das respostas possíveis */}
                    {group.sampleAnswers.length > 0 && (
                      <div className="answer-options-section">
                        <small className="text-muted d-block mb-2">Opções de resposta:</small>
                        <AnswerOptionsDisplay
                          possibleAnswers={group.sampleAnswers}
                          maxDisplay={5}
                          variant={group.color}
                        />
                      </div>
                    )}

                    {/* Lista de perguntas do grupo */}
                    <div className="group-questions-list">
                      {group.questions.map((question) => (
                        <Card
                          key={question.variable}
                          className="question-card-small"
                          onClick={() => handleQuestionClick(question)}
                        >
                          <Card.Body>
                            <div className="question-small-content">
                              <div className="question-icon-wrapper-small">
                                <HelpCircle size={18} color="white" />
                              </div>
                              <div className="question-small-text-wrapper">
                                <p className="question-text-small">{question.questionText || question.label}</p>
                                <Badge bg="secondary" pill className="question-variable-badge">
                                  {question.variable}
                                </Badge>
                              </div>
                              <Button variant="outline-dark" size="sm" className="question-analyze-btn">
                                <BarChart3 size={14} />
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && questions.length === 0 && (
            <div className="empty-state">
              <HelpCircle size={48} className="text-muted mb-3" />
              <h4 className="text-dark">Nenhuma pergunta encontrada</h4>
              <p className="text-muted">Não há perguntas disponíveis para este tema no momento.</p>
            </div>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p className="footer-text">Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}