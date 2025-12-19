"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import HorizontalBarChart from "../components/dashboard/expanded-survey/HorizontalBarChart"
import DemographicFilters from "../components/dashboard/expanded-survey/DemographicFilters"
import { ApiMethods } from "../service/ApiBase"
import { useExpandedSurveyData } from "../hooks/useExpandedSurveyData"
import "./ThemeQuestionsPage.css"

export default function ExpandedSurveyDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Obter parâmetros da URL
  const variables = useMemo(() => {
    const varsParam = searchParams.get('variables')
    return varsParam ? JSON.parse(varsParam) : []
  }, [searchParams])

  const questionText = searchParams.get('questionText') || ''
  const pageTitle = searchParams.get('pageTitle') || 'Análise de Pergunta'

  // Estado de filtros demográficos
  const [filters, setFilters] = useState({})

  // Buscar dados brutos
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["expandedSurveyData"],
    queryFn: ApiMethods.getExpandedSurveyData,
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  })

  // Processar dados usando hook customizado
  const {
    calculateVariableStats,
    demographicVariables,
    isReady
  } = useExpandedSurveyData(rawData)

  // Calcular estatísticas para cada variável
  const chartData = useMemo(() => {
    console.log('Calculando chartData:', { isReady, hasCalculateFunc: !!calculateVariableStats, variables })

    if (!isReady || !calculateVariableStats) {
      console.log('Aguardando dados ficarem prontos...')
      return []
    }

    const results = variables.map(variable => {
      console.log(`Processando variável: ${variable}`)
      const stats = calculateVariableStats(variable, filters)

      return {
        variable,
        stats: stats?.data || [],
        totalWeight: stats?.totalWeight || 0,
        totalResponses: stats?.totalResponses || 0
      }
    })

    console.log('ChartData calculado:', results)
    return results
  }, [variables, filters, isReady, calculateVariableStats])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
  }, [])

  return (
    <div className="questions-page-wrapper">
      <CommonHeader />

      <main className="content-area">
        <Container fluid>
          <div className="page-title-section">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h1 className="main-title">{pageTitle}</h1>
                <p className="main-description">{questionText}</p>
                {variables.length > 0 && (
                  <div className="d-flex gap-2 mt-2">
                    {variables.map((v, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#212529',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="back-button">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>

          {/* Estado de erro */}
          {error && (
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar dados</Alert.Heading>
              <p>{error?.message}</p>
            </Alert>
          )}

          {/* Estado de carregamento */}
          {isLoading && !error && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando dados da pesquisa...</p>
            </div>
          )}

          {/* Dashboard */}
          {!isLoading && !error && isReady && (
            <Row>
              {/* Coluna de Filtros - 25% */}
              <Col lg={3}>
                <div style={{ position: 'sticky', top: '20px' }}>
                  <DemographicFilters
                    demographicVariables={demographicVariables}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                  />

                  {/* Info de filtros ativos */}
                  {Object.keys(filters).length > 0 && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        borderRadius: '12px',
                        border: '1px solid #90caf9'
                      }}
                    >
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1565c0',
                        margin: 0,
                        marginBottom: '8px'
                      }}>
                        Filtros Ativos
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: '#1976d2',
                        margin: 0
                      }}>
                        {Object.values(filters).reduce((sum, arr) => sum + arr.length, 0)} filtro(s) aplicado(s)
                      </p>
                    </div>
                  )}
                </div>
              </Col>

              {/* Coluna de Gráficos - 75% */}
              <Col lg={9}>
                <div className="d-flex flex-column gap-4">
                  {chartData.map((data, idx) => (
                    <HorizontalBarChart
                      key={idx}
                      data={data.stats}
                      title={`${pageTitle} - ${data.variable}`}
                      questionText={questionText}
                      variableName={data.variable}
                    />
                  ))}

                  {chartData.length === 0 && (
                    <div className="empty-state">
                      <h4>Nenhum gráfico disponível</h4>
                      <p>Não há dados para exibir com os filtros selecionados.</p>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
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
