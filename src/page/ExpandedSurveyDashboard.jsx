"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, TrendingUp } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import HorizontalBarChart from "../components/dashboard/expanded-survey/HorizontalBarChart"
import WaveComparisonChart from "../components/dashboard/expanded-survey/WaveComparisonChart"
import DemographicFilters from "../components/dashboard/expanded-survey/DemographicFilters"
import { ApiMethods } from "../service/ApiBase"
import { useExpandedSurveyData } from "../hooks/useExpandedSurveyData"
import { applyUnifiedFilters } from "../utils/waveComparisonUtils"
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

  // NOVO: Parâmetros de comparação entre ondas
  const hasWaveComparison = searchParams.get('hasWaveComparison') === 'true'
  const wave1Variables = useMemo(() => {
    const varsParam = searchParams.get('wave1Variables')
    return varsParam ? JSON.parse(varsParam) : []
  }, [searchParams])

  // Log dos parâmetros de comparação
  // NOTA: wave1Variables contém as variáveis da Rodada 13 (Onda 1), que podem ter nomes
  // diferentes das variáveis da Rodada 16 (Onda 2). O mapeamento foi feito no ExpandedSurveyPage.
  // Exemplo: variables = ['P06'] (R16), wave1Variables = ['P05'] (R13)
  console.log('🔍 Parâmetros de comparação:', {
    hasWaveComparison,
    variables, // Variáveis da Rodada 16
    wave1Variables, // Variáveis correspondentes da Rodada 13 (podem ter nomes diferentes!)
    rawHasWaveComparison: searchParams.get('hasWaveComparison'),
    rawWave1Variables: searchParams.get('wave1Variables')
  })

  // Estado de filtros demográficos
  const [filters, setFilters] = useState({})

  // Buscar índice de perguntas para obter labels (mesma fonte dos dados)
  const { data: indexData, isLoading: indexLoading } = useQuery({
    queryKey: ["expandedSurveyIndex"],
    queryFn: ApiMethods.getExpandedSurveyIndex,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Buscar dados brutos da Rodada 16 (Onda 2)
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["expandedSurveyData"],
    queryFn: ApiMethods.getExpandedSurveyData,
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  })

  // NOVO: Buscar dados brutos da Rodada 13 (Onda 1) - apenas se tiver comparação
  const { data: wave1RawData, isLoading: isLoadingWave1 } = useQuery({
    queryKey: ["wave1SurveyData"],
    queryFn: ApiMethods.getWave1SurveyData,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    enabled: hasWaveComparison, // Só busca se tiver comparação
  })

  // Log para debug
  console.log('Estado das queries:', {
    indexDataExists: !!indexData,
    rawDataExists: !!rawData,
    indexLoading,
    isLoading
  })

  // Processar dados da Rodada 16 (Onda 2) usando hook customizado
  const {
    calculateVariableStats,
    calculateVariableStatsWithRows,
    demographicVariables,
    getProcessedRows: getWave2Rows,
    isReady
  } = useExpandedSurveyData(rawData)

  // NOVO: Processar dados da Rodada 13 (Onda 1)
  const {
    calculateVariableStatsWithRows: calculateWave1StatsWithRows,
    getProcessedRows: getWave1Rows,
    isReady: isWave1Ready
  } = useExpandedSurveyData(wave1RawData)

  // Criar mapeamento de variável -> label
  const variableLabels = useMemo(() => {
    // O getExpandedSurveyIndex retorna { success: true, data: [...] }
    if (!indexData?.data || !Array.isArray(indexData.data)) {
      console.log('❌ Dados do índice ainda não disponíveis ou em formato incorreto')
      console.log('indexData:', indexData)
      return {}
    }

    console.log('✅ Dados do índice carregados:', indexData.data.length, 'perguntas')

    // Criar mapa de variável -> label a partir dos objetos já processados
    const mapping = {}
    indexData.data.forEach(question => {
      if (question.variable && question.label) {
        mapping[question.variable] = question.label
      }
    })

    console.log('✅ Mapeamento de labels criado:', Object.keys(mapping).length, 'variáveis mapeadas')
    return mapping
  }, [indexData])

  // Calcular estatísticas para cada variável
  const chartData = useMemo(() => {
    console.log('Calculando chartData:', { isReady, hasCalculateFunc: !!calculateVariableStats, variables })

    if (!isReady || !calculateVariableStats) {
      console.log('Aguardando dados ficarem prontos...')
      return []
    }

    const results = variables.map(variable => {
      console.log(`Processando variável: ${variable}`)
      const label = variableLabels[variable] || ''
      console.log(`  → Label encontrado: "${label}"`)

      const stats = calculateVariableStats(variable, filters)
      const statsWithoutFilters = calculateVariableStats(variable, {})

      // Calcular margem de erro (fórmula: 1.96 * sqrt(0.25 / n))
      // Para 95% de confiança e proporção de 50% (pior caso)
      const sampleSize = stats?.totalResponses || 0
      const originalSampleSize = statsWithoutFilters?.totalResponses || 0
      const marginOfError = sampleSize > 0
        ? (1.96 * Math.sqrt(0.25 / sampleSize)) * 100
        : 0

      return {
        variable,
        label, // ← NOVO: adicionar label
        stats: stats?.data || [],
        totalWeight: stats?.totalWeight || 0,
        totalResponses: sampleSize,
        originalSampleSize,
        marginOfError: Math.round(marginOfError * 100) / 100
      }
    })

    console.log('ChartData calculado:', results)
    return results
  }, [variables, filters, isReady, calculateVariableStats, variableLabels])

  // NOVO: Aplicar filtros unificados em ambas as ondas
  const unifiedFilteredData = useMemo(() => {
    if (!isReady) return { wave1Rows: [], wave2Rows: [] }

    const wave1Rows = hasWaveComparison && isWave1Ready ? getWave1Rows() : []
    const wave2Rows = getWave2Rows()

    // Aplicar filtros em ambas as ondas
    const filtered = applyUnifiedFilters(
      filters,
      { rows: wave1Rows },
      { rows: wave2Rows }
    )

    console.log('🔄 Filtros unificados aplicados:', {
      wave1Total: wave1Rows.length,
      wave1Filtered: filtered.wave1Rows.length,
      wave2Total: wave2Rows.length,
      wave2Filtered: filtered.wave2Rows.length,
      filtersApplied: Object.keys(filters).length
    })

    return filtered
  }, [filters, isReady, isWave1Ready, hasWaveComparison, getWave1Rows, getWave2Rows])

  // NOVO: Calcular estatísticas de comparação entre ondas COM FILTROS UNIFICADOS
  // IMPORTANTE: As variáveis podem ter nomes diferentes entre R13 e R16!
  // - `variables` contém as variáveis da Rodada 16 (ex: ['P06', 'T_P10_1'])
  // - `wave1Variables` contém as variáveis correspondentes da Rodada 13 (ex: ['P05', 'T_P09_1'])
  const waveComparisonData = useMemo(() => {
    console.log('🔄 Calculando waveComparisonData:', {
      hasWaveComparison,
      variables, // R16
      wave1Variables, // R13
      isWave1Ready,
      hasCalculateWave1StatsWithRows: !!calculateWave1StatsWithRows,
      isReady,
      hasCalculateVariableStatsWithRows: !!calculateVariableStatsWithRows
    })

    if (!hasWaveComparison || !isWave1Ready || !calculateWave1StatsWithRows || !isReady || !calculateVariableStatsWithRows) {
      console.log('❌ Condições não atendidas para calcular comparação')
      return []
    }

    // Para cada variável com correspondência entre as ondas
    // Iteramos sobre os índices para pegar a variável R16 e a R13 correspondente
    const results = wave1Variables.map((wave1Variable, index) => {
      // A variável da R16 correspondente está no mesmo índice do array `variables`
      const wave2Variable = variables[index]
      const label = variableLabels[wave2Variable] || ''

      console.log(`🔗 Mapeamento: R16[${wave2Variable}] ↔ R13[${wave1Variable}]`)

      // Estatísticas da Onda 1 (R13) COM FILTROS UNIFICADOS
      // Usa a variável da R13!
      const wave1Stats = calculateWave1StatsWithRows(wave1Variable, unifiedFilteredData.wave1Rows)

      // Estatísticas da Onda 2 (R16) COM FILTROS UNIFICADOS
      // Usa a variável da R16!
      const wave2Stats = calculateVariableStatsWithRows(wave2Variable, unifiedFilteredData.wave2Rows)

      // Calcular margem de erro para cada onda
      const wave1SampleSize = wave1Stats?.totalResponses || 0
      const wave2SampleSize = wave2Stats?.totalResponses || 0

      const wave1MarginOfError = wave1SampleSize > 0
        ? (1.96 * Math.sqrt(0.25 / wave1SampleSize)) * 100
        : 0

      const wave2MarginOfError = wave2SampleSize > 0
        ? (1.96 * Math.sqrt(0.25 / wave2SampleSize)) * 100
        : 0

      console.log(`📈 Comparação para R16[${wave2Variable}] ↔ R13[${wave1Variable}]:`, {
        wave1Stats: wave1Stats?.data?.length || 0,
        wave2Stats: wave2Stats?.data?.length || 0,
        wave1SampleSize,
        wave2SampleSize
      })

      return {
        variable: wave2Variable, // Usamos a variável R16 como referência principal
        wave1Variable, // Também guardamos a variável R13 para referência
        label,
        wave1Stats: wave1Stats?.data || [],
        wave2Stats: wave2Stats?.data || [],
        wave1SampleSize,
        wave2SampleSize,
        wave1MarginOfError: Math.round(wave1MarginOfError * 100) / 100,
        wave2MarginOfError: Math.round(wave2MarginOfError * 100) / 100,
      }
    })

    console.log('✅ waveComparisonData calculado:', results.length, 'variáveis')
    return results
  }, [hasWaveComparison, variables, wave1Variables, isWave1Ready, calculateWave1StatsWithRows, isReady, calculateVariableStatsWithRows, variableLabels, unifiedFilteredData])

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
          {(isLoading || (hasWaveComparison && isLoadingWave1)) && !error && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">
                {hasWaveComparison
                  ? "Carregando dados das pesquisas (Onda 1 e 2)..."
                  : "Carregando dados da pesquisa..."}
              </p>
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

              {/* Coluna de Gráficos - 75% */}
              <Col lg={9}>
                <div className="d-flex flex-column gap-4">
                  {/* NOVO: Gráficos de comparação entre ondas */}
                  {hasWaveComparison && waveComparisonData.length > 0 && (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #d1e7dd 0%, #badbcc 100%)',
                        borderRadius: '12px',
                        border: '1px solid #a3cfbb'
                      }}>
                        <TrendingUp size={24} color="#198754" />
                        <div>
                          <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#146c43' }}>
                            Comparativo entre Ondas
                          </h5>
                          <p style={{ margin: 0, fontSize: '13px', color: '#198754' }}>
                            Análise da variação das respostas entre a Onda 1 (Rodada 13) e Onda 2 (Rodada 16)
                          </p>
                        </div>
                      </div>

                      {waveComparisonData.map((data, idx) => (
                        <WaveComparisonChart
                          key={`wave-comparison-${idx}`}
                          wave1Stats={data.wave1Stats}
                          wave2Stats={data.wave2Stats}
                          questionText={questionText}
                          variableName={data.variable}
                          wave1VariableName={data.wave1Variable}
                          variableLabel={data.label}
                          wave1SampleSize={data.wave1SampleSize}
                          wave2SampleSize={data.wave2SampleSize}
                          wave1MarginOfError={data.wave1MarginOfError}
                          wave2MarginOfError={data.wave2MarginOfError}
                        />
                      ))}

                      <hr style={{ margin: '24px 0', borderColor: '#dee2e6' }} />

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        borderRadius: '12px',
                        border: '1px solid #90caf9'
                      }}>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1565c0' }}>
                            Dados da Onda 2 (Rodada 16)
                          </h5>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1976d2' }}>
                            Resultados detalhados da pesquisa atual com filtros demográficos
                          </p>
                        </div>
                      </div>
                    </>
                  )}

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
