"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import WordCloudChart from "../components/dashboard/expanded-survey/WordCloudChart"
import ResponseList from "../components/dashboard/expanded-survey/ResponseList"
import DemographicFilters from "../components/dashboard/expanded-survey/DemographicFilters"
import { ApiMethods } from "../service/ApiBase"
import { useExpandedSurveyData } from "../hooks/useExpandedSurveyData"
import "./ThemeQuestionsPage.css"

export default function OpenQuestionDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Obter parâmetros da URL
  const variables = useMemo(() => {
    const varsParam = searchParams.get('variables')
    return varsParam ? JSON.parse(varsParam) : []
  }, [searchParams])

  const questionText = searchParams.get('questionText') || ''
  const pageTitle = searchParams.get('pageTitle') || 'Análise de Pergunta Aberta'

  // Estado de filtros demográficos
  const [filters, setFilters] = useState({})

  // Buscar índice de perguntas para obter labels
  const { data: indexData, isLoading: indexLoading } = useQuery({
    queryKey: ["expandedSurveyIndex"],
    queryFn: ApiMethods.getExpandedSurveyIndex,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Buscar dados brutos
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["expandedSurveyData"],
    queryFn: ApiMethods.getExpandedSurveyData,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Processar dados usando hook customizado
  const {
    calculateVariableStats,
    demographicVariables,
    isReady
  } = useExpandedSurveyData(rawData)

  // Criar mapeamento de variável -> label
  const variableLabels = useMemo(() => {
    if (!indexData?.data || !Array.isArray(indexData.data)) {
      return {}
    }

    const mapping = {}
    indexData.data.forEach(question => {
      if (question.variable && question.label) {
        mapping[question.variable] = question.label
      }
    })

    return mapping
  }, [indexData])

  // Calcular estatísticas para cada variável (para perguntas abertas)
  const chartData = useMemo(() => {
    if (!isReady || !calculateVariableStats) {
      return []
    }

    const results = variables.map(variable => {
      const label = variableLabels[variable] || ''
      const stats = calculateVariableStats(variable, filters)
      const statsWithoutFilters = calculateVariableStats(variable, {})

      const sampleSize = stats?.totalResponses || 0
      const originalSampleSize = statsWithoutFilters?.totalResponses || 0

      return {
        variable,
        label,
        stats: stats?.data || [],
        totalWeight: stats?.totalWeight || 0,
        totalResponses: sampleSize,
        originalSampleSize
      }
    })

    return results
  }, [variables, filters, isReady, calculateVariableStats, variableLabels])

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
              <h1 className="main-title" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitle}
              </h1>
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
              {/* Coluna de Filtros - 20% */}
              <Col lg={2}>
                <div style={{ position: 'sticky', top: '20px', height: 'calc(100vh - 200px)' }}>
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

              {/* Coluna de Visualizações - 80% */}
              <Col lg={10}>
                <div className="d-flex flex-column gap-4">
                  {chartData.map((data, idx) => (
                    <div key={idx}>
                      {/* Título da pergunta (apenas uma vez para cada variável) */}
                      {idx === 0 && (
                        <div style={{
                          marginBottom: '20px',
                          padding: '20px',
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                          borderRadius: '12px',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <h4 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#212529',
                            margin: 0,
                            marginBottom: '8px'
                          }}>
                            {questionText}
                          </h4>
                          <p style={{
                            fontSize: '14px',
                            color: '#6c757d',
                            margin: 0
                          }}>
                            Pergunta Aberta - Análise de Respostas
                          </p>
                        </div>
                      )}

                      {/* Grid: Word Cloud (60%) + Response List (40%) */}
                      <Row className="g-3">
                        <Col lg={7}>
                          <WordCloudChart
                            data={data.stats}
                            questionText={questionText}
                            variableName={data.variable}
                            variableLabel={data.label}
                            sampleSize={data.totalResponses}
                            originalSampleSize={data.originalSampleSize}
                          />
                        </Col>
                        <Col lg={5}>
                          <ResponseList
                            data={data.stats}
                            variableName={data.variable}
                            variableLabel={data.label}
                          />
                        </Col>
                      </Row>

                      {/* Separador entre variáveis diferentes */}
                      {idx < chartData.length - 1 && (
                        <hr style={{
                          margin: '40px 0',
                          border: 'none',
                          borderTop: '2px solid #dee2e6'
                        }} />
                      )}
                    </div>
                  ))}

                  {chartData.length === 0 && (
                    <div className="empty-state">
                      <h4>Nenhum dado disponível</h4>
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
