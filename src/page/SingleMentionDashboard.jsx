"use client"

import { useMemo } from "react"
import { Container, Row, Col, Card, Button, Alert, Image, Spinner } from "react-bootstrap"
import { useNavigate, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, BarChart3, Users, TrendingUp } from "lucide-react"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { useAuth } from "../contexts/AuthContext"
import ApiBase from "../service/ApiBase"
import "./SingleMentionDashboard.css"

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Data fetching function
const fetchSingleMentionData = async ({ queryKey }) => {
  const [, { questionCode, theme, surveyNumber, questionText }] = queryKey
  const params = new URLSearchParams({
    theme,
    surveyNumber,
    questionText,
  })
  const { data } = await ApiBase.get(
    `/api/data/question/${encodeURIComponent(questionCode)}/responses`,
    {
      questionText: questionText,
      theme:  theme,
      surveyNumber: surveyNumber,
    }
  )
  if (!data.success || !data.historicalData || data.historicalData.length === 0) {
    throw new Error(data.message || "Não foi possível carregar os dados da pergunta.")
  }
  return data
}

export default function SingleMentionDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  // Extrair parâmetros da URL
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const theme = searchParams.get("theme")
  const questionText = searchParams.get("questionText")
  const questionCode = searchParams.get("questionCode")
  const surveyNumber = searchParams.get("surveyNumber")

  const {
    data: queryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["singleMentionData", { questionCode, theme, surveyNumber, questionText }],
    queryFn: fetchSingleMentionData,
    enabled: !!questionCode && !!theme && !!surveyNumber && !!questionText,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  })

  // Transformar dados da API para o formato que o componente espera
  const data = useMemo(() => {
    if (!queryData) return null

    const historicalEntry = queryData.historicalData[0]
    if (!historicalEntry) return null

    const responses = historicalEntry.distribution.map((d) => ({
      answer: d.response,
      count: d.count,
    }))

    const totalResponses = historicalEntry.totalResponses

    // Reestruturar dados demográficos
    const demographics = {}
    historicalEntry.distribution.forEach((distItem) => {
      const mainResponseAnswer = distItem.response
      if (distItem.demographics) {
        Object.entries(distItem.demographics).forEach(([demoField, demoValues]) => {
          if (!demographics[demoField]) {
            demographics[demoField] = {}
          }
          demoValues.forEach((demoValue) => {
            const demoResponse = demoValue.response
            if (!demographics[demoField][demoResponse]) {
              demographics[demoField][demoResponse] = {}
            }
            demographics[demoField][demoResponse][mainResponseAnswer] = demoValue.count
          })
        })
      }
    })

    return {
      responses,
      demographics,
      totalResponses,
      round: historicalEntry.rodada,
    }
  }, [queryData])

  const handleBack = () => {
    navigate(-1)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Função para gerar cores em gradiente azul
  const generateBlueGradient = (count) => {
    const colors = []
    for (let i = 0; i < count; i++) {
      const intensity = 1 - (i / Math.max(1, count - 1)) * 0.7 // De 1 (azul escuro) a 0.3 (azul claro)
      colors.push(`rgba(54, 162, 235, ${intensity})`)
    }
    return colors
  }

  // Configuração do gráfico de barras horizontais
  const getHorizontalBarConfig = (responses) => {
    if (!responses || responses.length === 0) return null

    const sortedResponses = [...responses].sort((a, b) => b.count - a.count)
    const colors = generateBlueGradient(sortedResponses.length)

    return {
      data: {
        labels: sortedResponses.map((r) => r.answer),
        datasets: [
          {
            label: "Número de Respostas",
            data: sortedResponses.map((r) => r.count),
            backgroundColor: colors,
            borderColor: colors.map((color) => color.replace(/[\d.]+\)$/g, "1)")),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: "Distribuição de Respostas",
            font: {
              size: 16,
              weight: "bold",
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
          y: {
            ticks: {
              maxRotation: 0,
              font: {
                size: 12,
              },
            },
          },
        },
      },
    }
  }

  // Configuração do gráfico de barras empilhadas verticais
  const getStackedBarConfig = (demographicData, title) => {
    if (!demographicData || Object.keys(demographicData).length === 0) return null

    const categories = Object.keys(demographicData)
    const responses = data?.responses || []
    const colors = generateBlueGradient(responses.length)

    const datasets = responses.map((response, index) => ({
      label: response.answer,
      data: categories.map((category) => demographicData[category]?.[response.answer] || 0),
      backgroundColor: colors[index],
      borderColor: colors[index].replace(/[\d.]+\)$/g, "1)"),
      borderWidth: 1,
    }))

    return {
      data: {
        labels: categories,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 12,
              font: {
                size: 11,
              },
            },
          },
          title: {
            display: true,
            text: title,
            font: {
              size: 14,
              weight: "bold",
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              maxRotation: 45,
              font: {
                size: 11,
              },
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    }
  }

  if (isLoading) {
    return (
      <div className="single-mention-wrapper">
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
            <div className="loading-state">
              <Spinner animation="border" variant="primary" size="lg" />
              <p className="mt-3 text-muted">Carregando dados da análise...</p>
            </div>
          </Container>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="single-mention-wrapper">
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
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar dados</Alert.Heading>
              <p>{error.message}</p>
              <Button variant="outline-danger" onClick={handleBack}>
                Voltar
              </Button>
            </Alert>
          </Container>
        </main>
      </div>
    )
  }

  const horizontalBarConfig = getHorizontalBarConfig(data?.responses)
  const demographicFields = data?.demographics || {}

  return (
    <div className="single-mention-wrapper">
      {/* Header */}
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
          {/* Page Title Section */}
          <div className="page-title-section">
            <div className="d-flex align-items-center justify-content-between">
              <div className="title-content">
                <h1 className="main-title">Análise de Menção Única</h1>
                <p className="main-description">{questionText}</p>
                <small className="text-muted">Tema: {theme}</small>
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="ms-3">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>

          {/* Estatísticas Resumo */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <BarChart3 size={32} className="stat-icon text-primary mb-2" />
                  <h3 className="stat-number">{data?.totalResponses || 0}</h3>
                  <p className="stat-label">Total de Respostas</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <TrendingUp size={32} className="stat-icon text-success mb-2" />
                  <h3 className="stat-number">{data?.responses?.length || 0}</h3>
                  <p className="stat-label">Opções de Resposta</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stat-card">
                <Card.Body className="text-center">
                  <Users size={32} className="stat-icon text-info mb-2" />
                  <h3 className="stat-number">{data?.round || "N/A"}</h3>
                  <p className="stat-label">Rodada da Pesquisa</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Gráfico de Barras Horizontais - Respostas */}
          {horizontalBarConfig && (
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Distribuição de Respostas</h5>
              </Card.Header>
              <Card.Body>
                <div className="chart-container" style={{ height: "400px" }}>
                  <Bar {...horizontalBarConfig} />
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Gráficos Demográficos */}
          {Object.keys(demographicFields).length > 0 && (
            <Row>
              {Object.entries(demographicFields).map(([fieldName, fieldData]) => {
                const stackedConfig = getStackedBarConfig(fieldData, `Distribuição por ${fieldName}`)
                if (!stackedConfig) return null

                return (
                  <Col lg={6} className="mb-4" key={fieldName}>
                    <Card>
                      <Card.Body>
                        <div className="chart-container" style={{ height: "350px" }}>
                          <Bar {...stackedConfig} />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}

          {/* Mensagem se não houver dados demográficos */}
          {Object.keys(demographicFields).length === 0 && (
            <Alert variant="info">
              <Alert.Heading>Dados demográficos não disponíveis</Alert.Heading>
              <p>Não foram encontrados dados demográficos para esta pergunta.</p>
            </Alert>
          )}
        </Container>
      </main>

      {/* Footer */}
      <footer className="page-footer">
        <Container>
          <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}
