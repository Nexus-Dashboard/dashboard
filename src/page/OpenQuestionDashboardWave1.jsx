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

export default function OpenQuestionDashboardWave1() {
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

  // Buscar índice de perguntas da Onda 1
  const { data: indexData } = useQuery({
    queryKey: ["wave1SurveyIndex"],
    queryFn: ApiMethods.getWave1SurveyIndex,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Buscar dados brutos da Onda 1
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["wave1SurveyData"],
    queryFn: ApiMethods.getWave1SurveyData,
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

  // Normalizar resposta: filtrar inválidas e agrupar "Outros"
  const normalizeResponse = (response) => {
    if (!response) return null
    const trimmed = response.trim()
    // Filtrar respostas inválidas
    if (trimmed === '#NULO!' || trimmed === '#NULL!' || trimmed === '#NULL' || trimmed === '#null') return null
    if (trimmed === '!NULL' || trimmed === '98' || trimmed === '99') return null
    // Agrupar variantes de "Outros"
    if (trimmed.toLowerCase().startsWith('outros') && trimmed.includes('(ANOTAR)')) return 'Outros'
    return trimmed
  }

  // Verificar se deve aglomerar (múltiplas variáveis)
  const shouldAggregate = useMemo(() => {
    if (variables.length <= 1) return false
    const aggregationLabels = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto']
    const labels = variables.map(v => (variableLabels[v] || '').toLowerCase().trim())
    const allAreAggregationLabels = labels.every(label =>
      aggregationLabels.some(aggLabel => label === aggLabel || label.includes(aggLabel))
    )
    const allAreOVariables = variables.every(v => /^P\d+_O\d+$/.test(v))
    return allAreAggregationLabels || allAreOVariables
  }, [variables, variableLabels])

  // Calcular estatísticas para cada variável
  const chartData = useMemo(() => {
    if (!isReady || !calculateVariableStats) {
      return []
    }

    // Se deve aglomerar (múltiplas variáveis como P39_O1, P39_O2, P39_O3)
    if (variables.length > 1 && shouldAggregate) {
      const aggregatedResponses = new Map()
      const firstVarStats = calculateVariableStats(variables[0], filters)
      const universeCount = firstVarStats?.totalCount || firstVarStats?.totalResponses || 0

      variables.forEach(variable => {
        const stats = calculateVariableStats(variable, filters)
        if (!stats?.data) return

        stats.data.forEach(item => {
          const normalizedResponse = normalizeResponse(item.response)
          if (!normalizedResponse) return

          const existing = aggregatedResponses.get(normalizedResponse) || { weightSum: 0, count: 0 }
          aggregatedResponses.set(normalizedResponse, {
            weightSum: existing.weightSum + (item.weightSum || item.count || 0),
            count: existing.count + (item.count || 0)
          })
        })
      })

      const aggregatedStats = Array.from(aggregatedResponses.entries()).map(([response, data]) => ({
        response,
        count: data.count,
        weightSum: data.weightSum,
        percentage: universeCount > 0 ? (data.weightSum / universeCount) * 100 : 0
      }))

      const firstVarStatsNoFilter = calculateVariableStats(variables[0], {})
      const originalUniverseCount = firstVarStatsNoFilter?.totalCount || firstVarStatsNoFilter?.totalResponses || 0

      const marginOfError = universeCount > 0
        ? (1.96 * Math.sqrt(0.25 / universeCount)) * 100
        : 0

      const labels = variables.map(v => variableLabels[v]).filter(Boolean)
      const combinedLabel = labels.length > 0 ? labels.join(' / ') : ''

      return [{
        variable: variables.join(' + '),
        label: combinedLabel,
        stats: aggregatedStats,
        totalWeight: universeCount,
        totalResponses: universeCount,
        originalSampleSize: originalUniverseCount,
        marginOfError: Math.round(marginOfError * 100) / 100
      }]
    }

    // Caso normal: uma variável ou sem aglomeração
    const results = variables.map(variable => {
      const label = variableLabels[variable] || ''
      const stats = calculateVariableStats(variable, filters)
      const statsWithoutFilters = calculateVariableStats(variable, {})

      const sampleSize = stats?.totalResponses || 0
      const originalSampleSize = statsWithoutFilters?.totalResponses || 0

      // Filtrar e normalizar respostas
      const filteredStats = (stats?.data || [])
        .map(item => {
          const normalizedResponse = normalizeResponse(item.response)
          if (!normalizedResponse) return null
          return { ...item, response: normalizedResponse }
        })
        .filter(Boolean)

      // Agrupar respostas normalizadas (ex: "Outros 1º" + "Outros 2º" -> "Outros")
      const groupedResponses = new Map()
      filteredStats.forEach(item => {
        const existing = groupedResponses.get(item.response) || { count: 0, weightSum: 0, percentage: 0 }
        groupedResponses.set(item.response, {
          count: existing.count + (item.count || 0),
          weightSum: existing.weightSum + (item.weightSum || 0),
          percentage: existing.percentage + (item.percentage || 0)
        })
      })

      const finalStats = Array.from(groupedResponses.entries()).map(([response, data]) => ({
        response,
        count: data.count,
        weightSum: data.weightSum,
        percentage: data.percentage
      }))

      const marginOfError = sampleSize > 0
        ? (1.96 * Math.sqrt(0.25 / sampleSize)) * 100
        : 0

      return {
        variable,
        label,
        stats: finalStats,
        totalWeight: stats?.totalWeight || 0,
        totalResponses: sampleSize,
        originalSampleSize,
        marginOfError: Math.round(marginOfError * 100) / 100
      }
    })

    return results
  }, [variables, filters, isReady, calculateVariableStats, variableLabels, shouldAggregate])

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
              {/* Coluna de Filtros - 25% */}
              <Col lg={3}>
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

              {/* Coluna de Conteúdo - 75% */}
              <Col lg={9}>
                <div className="d-flex flex-column gap-4">
                  {/* Header informativo */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    borderRadius: '12px',
                    border: '1px solid #ffcc80'
                  }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#e65100' }}>
                        Dados da Onda 1 (Rodada 13) - Pergunta Aberta
                      </h5>
                      <p style={{ margin: 0, fontSize: '13px', color: '#f57c00' }}>
                        Respostas da primeira onda da pesquisa ampliada
                      </p>
                    </div>
                  </div>

                  {chartData.map((data, idx) => (
                    <HorizontalBarChart
                      key={idx}
                      data={data.stats}
                      questionText={questionText}
                      variableName={data.variable}
                      variableLabel={data.label}
                      sampleSize={data.totalResponses}
                      originalSampleSize={data.originalSampleSize}
                      marginOfError={data.marginOfError}
                    />
                  ))}

                  {chartData.length === 0 && (
                    <div className="empty-state">
                      <h4>Nenhum dado disponível</h4>
                      <p>Não há respostas para exibir com os filtros selecionados.</p>
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
