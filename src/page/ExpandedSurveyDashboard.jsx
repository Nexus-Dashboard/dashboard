"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, TrendingUp } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import HorizontalBarChart from "../components/dashboard/expanded-survey/HorizontalBarChart"
import StackedBarChart from "../components/dashboard/expanded-survey/StackedBarChart"
import WaveComparisonChart from "../components/dashboard/expanded-survey/WaveComparisonChart"
import StackedWaveComparisonChart from "../components/dashboard/expanded-survey/StackedWaveComparisonChart"
import DemographicFilters from "../components/dashboard/expanded-survey/DemographicFilters"
import P28ViolenceChart from "../components/dashboard/expanded-survey/P28ViolenceChart"
import PairedBarComparisonChart from "../components/dashboard/expanded-survey/PairedBarComparisonChart"
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

  // ESPECIAL: Detectar se é pergunta P28 (violência)
  const isP28Question = useMemo(() => {
    return variables.some(v => v.match(/^P28_O\d+$/) || v === 'P28_OUT')
  }, [variables])

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

  // Scroll para o topo ao carregar a página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
    politicalVariables,
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

  // Verificar se os rótulos indicam que devemos aglomerar (Primeiro, Segundo, Outros)
  // ou se devemos criar gráficos separados para cada variável
  const shouldAggregate = useMemo(() => {
    if (variables.length <= 1) return false

    // Rótulos que indicam aglomeração (perguntas de múltipla menção como P7_O1, P7_O2)
    const aggregationLabels = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto',
      'primeiro outros', 'segundo outros', 'terceiro outros', 'quarto outros', 'quinto outros']

    // Obter os labels das variáveis
    const labels = variables.map(v => (variableLabels[v] || '').toLowerCase().trim())

    // Se TODOS os labels forem do tipo agregação, aglomerar
    const allAreAggregationLabels = labels.every(label =>
      aggregationLabels.some(aggLabel => label === aggLabel || label.includes(aggLabel))
    )

    // Fallback: se todas as variáveis seguem padrões de múltipla menção
    // P##_A, P##_B (como P9_A, P9_B) ou P##_O1, P##_O2 (como P7_O1, P7_O2)
    const allAreABVariables = variables.every(v => /^P\d+_[A-B]$/.test(v))
    const allAreOVariables = variables.every(v => /^P\d+_O\d+$/.test(v))

    console.log('🔍 Verificando se deve aglomerar:', { labels, allAreAggregationLabels, allAreABVariables, allAreOVariables })
    return allAreAggregationLabels || allAreABVariables || allAreOVariables
  }, [variables, variableLabels])

  // Calcular estatísticas para cada variável
  // Se houver múltiplas variáveis com rótulos de aglomeração (ex: P7_O1 e P7_O2 com "Primeiro", "Segundo"),
  // aglomerar as respostas somando os pesos e dividindo pelo universo total
  // Caso contrário (ex: T_P10_1 com "À renda da sua família"), criar gráficos separados
  const chartData = useMemo(() => {
    console.log('Calculando chartData:', { isReady, hasCalculateFunc: !!calculateVariableStats, variables, shouldAggregate })

    if (!isReady || !calculateVariableStats) {
      console.log('Aguardando dados ficarem prontos...')
      return []
    }

    // Só aglomerar se shouldAggregate for true (rótulos como Primeiro, Segundo, etc.)
    // LÓGICA CORRETA: Somar weights das menções e dividir pelo N (count) do universo
    // Porcentagem = (soma dos weights das menções) / N * 100
    // Exemplo: Se N=1000 pessoas e soma dos weights de "TV" = 300, = 30%
    if (variables.length > 1 && shouldAggregate) {
      console.log('📊 Múltiplas variáveis com rótulos de aglomeração - aglomerando respostas:', variables)

      // Mapear para acumular menções de todas as variáveis
      const aggregatedResponses = new Map() // response -> { weightSum, count }

      // Primeiro, obter o universo (N = count real de respondentes) de UMA variável apenas
      // O universo é o mesmo para todas as variáveis (mesmo número de respondentes)
      const firstVarStats = calculateVariableStats(variables[0], filters)
      const universeCount = firstVarStats?.totalCount || firstVarStats?.totalResponses || 0

      // Normalizar nome de resposta: agrupar variantes de "Outros" e filtrar #NULO!
      const normalizeResponse = (response) => {
        if (!response) return null
        const trimmed = response.trim()
        // Filtrar respostas inválidas
        if (trimmed === '#NULO!' || trimmed === '#NULL!' || trimmed === '#NULL' || trimmed === '#null') return null
        // Agrupar variantes de "Outros" (ex: "Outros 1º (ANOTAR)", "Outros 2º (ANOTAR)")
        if (trimmed.toLowerCase().startsWith('outros') && trimmed.includes('(ANOTAR)')) return 'Outros'
        return trimmed
      }

      // Processar cada variável e somar as menções (weights)
      variables.forEach(variable => {
        const stats = calculateVariableStats(variable, filters)
        if (!stats?.data) return

        stats.data.forEach(item => {
          const normalizedResponse = normalizeResponse(item.response)
          if (!normalizedResponse) return // Pular #NULO! e respostas inválidas

          const existing = aggregatedResponses.get(normalizedResponse) || { weightSum: 0, count: 0 }
          aggregatedResponses.set(normalizedResponse, {
            weightSum: existing.weightSum + (item.weightSum || item.count || 0),
            count: existing.count + (item.count || 0)
          })
        })
      })

      // Calcular porcentagens: soma dos weights / N (universo count) * 100
      // Isso é o correto: dividir a soma ponderada pelo número real de respondentes
      const aggregatedStats = Array.from(aggregatedResponses.entries()).map(([response, data]) => ({
        response,
        count: data.count,
        weightSum: data.weightSum,
        percentage: universeCount > 0 ? (data.weightSum / universeCount) * 100 : 0
      }))

      // Calcular estatísticas sem filtros para margem de erro
      const firstVarStatsNoFilter = calculateVariableStats(variables[0], {})
      const originalUniverseCount = firstVarStatsNoFilter?.totalCount || firstVarStatsNoFilter?.totalResponses || 0

      // Calcular margem de erro baseado no universo
      const marginOfError = universeCount > 0
        ? (1.96 * Math.sqrt(0.25 / universeCount)) * 100
        : 0

      // Criar labels combinados
      const labels = variables.map(v => variableLabels[v]).filter(Boolean)
      const combinedLabel = labels.length > 0 ? labels.join(' / ') : ''

      console.log('📊 Respostas aglomeradas (weights / N):', {
        variables,
        universeCount,
        uniqueResponses: aggregatedStats.length,
        sample: aggregatedStats.slice(0, 3)
      })

      return [{
        variable: variables.join(' + '),
        label: combinedLabel,
        stats: aggregatedStats,
        totalWeight: universeCount, // Usar N como referência
        totalResponses: universeCount,
        originalSampleSize: originalUniverseCount,
        marginOfError: Math.round(marginOfError * 100) / 100
      }]
    }

    // Se for apenas uma variável, comportamento normal
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

    // Ordenar resultados: variáveis "Outros" (numéricas como P9_1, P9_2 ou com _OUT) devem vir após as principais
    // Ordem: P9_A (Primeiro), P9_B (Segundo), P9_1 (Primeiro Outros), P9_2 (Segundo Outros)
    results.sort((a, b) => {
      const varA = a.variable
      const varB = b.variable
      const labelA = (a.label || '').toLowerCase()
      const labelB = (b.label || '').toLowerCase()

      // Verificar se é uma variável "Outros" pelo label ou pelo padrão do nome
      const isOthersA = labelA.includes('outros') || /_\d+$/.test(varA) || /_OUT$/i.test(varA)
      const isOthersB = labelB.includes('outros') || /_\d+$/.test(varB) || /_OUT$/i.test(varB)

      // Se apenas A é "Outros", A vem depois
      if (isOthersA && !isOthersB) return 1
      // Se apenas B é "Outros", B vem depois
      if (!isOthersA && isOthersB) return -1

      // Caso contrário, ordenar alfabeticamente pela variável
      return varA.localeCompare(varB)
    })

    console.log('ChartData calculado:', results)
    return results
  }, [variables, filters, isReady, calculateVariableStats, variableLabels, shouldAggregate])

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
  // Se houver múltiplas variáveis (ex: P7_O1 e P7_O2), aglomerar as respostas
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

    // Só aglomerar se shouldAggregate for true (rótulos como Primeiro, Segundo, etc.)
    // LÓGICA CORRETA: Somar weights das menções e dividir pelo N (count) do universo
    // Porcentagem = (soma dos weights das menções) / N * 100
    if (variables.length > 1 && wave1Variables.length > 1 && shouldAggregate) {
      console.log('📊 Múltiplas variáveis com rótulos de aglomeração para comparação - aglomerando:', {
        r16: variables,
        r13: wave1Variables
      })

      // Primeiro, obter o UNIVERSO (N = count real de respondentes) de UMA variável apenas
      const firstWave1Stats = calculateWave1StatsWithRows(wave1Variables[0], unifiedFilteredData.wave1Rows)
      const wave1UniverseCount = firstWave1Stats?.totalCount || firstWave1Stats?.totalResponses || 0

      const firstWave2Stats = calculateVariableStatsWithRows(variables[0], unifiedFilteredData.wave2Rows)
      const wave2UniverseCount = firstWave2Stats?.totalCount || firstWave2Stats?.totalResponses || 0

      // Normalizar nome de resposta: agrupar variantes de "Outros" e filtrar #NULO!
      const normalizeResponse = (response) => {
        if (!response) return null
        const trimmed = response.trim()
        if (trimmed === '#NULO!' || trimmed === '#NULL!' || trimmed === '#NULL' || trimmed === '#null') return null
        if (trimmed.toLowerCase().startsWith('outros') && trimmed.includes('(ANOTAR)')) return 'Outros'
        return trimmed
      }

      // Aglomerar Onda 1 (R13) - somar weights das menções de todas as variáveis
      const wave1Aggregated = new Map()

      wave1Variables.forEach(wave1Variable => {
        const stats = calculateWave1StatsWithRows(wave1Variable, unifiedFilteredData.wave1Rows)
        if (!stats?.data) return

        stats.data.forEach(item => {
          const normalizedResponse = normalizeResponse(item.response)
          if (!normalizedResponse) return

          const existing = wave1Aggregated.get(normalizedResponse) || { weightSum: 0, count: 0 }
          wave1Aggregated.set(normalizedResponse, {
            weightSum: existing.weightSum + (item.weightSum || item.count || 0),
            count: existing.count + (item.count || 0)
          })
        })
      })

      // Aglomerar Onda 2 (R16) - somar weights das menções de todas as variáveis
      const wave2Aggregated = new Map()

      variables.forEach(wave2Variable => {
        const stats = calculateVariableStatsWithRows(wave2Variable, unifiedFilteredData.wave2Rows)
        if (!stats?.data) return

        stats.data.forEach(item => {
          const normalizedResponse = normalizeResponse(item.response)
          if (!normalizedResponse) return

          const existing = wave2Aggregated.get(normalizedResponse) || { weightSum: 0, count: 0 }
          wave2Aggregated.set(normalizedResponse, {
            weightSum: existing.weightSum + (item.weightSum || item.count || 0),
            count: existing.count + (item.count || 0)
          })
        })
      })

      // Converter para formato de stats: soma dos weights / N (count) * 100
      const wave1Stats = Array.from(wave1Aggregated.entries()).map(([response, data]) => ({
        response,
        count: data.count,
        weightSum: data.weightSum,
        percentage: wave1UniverseCount > 0 ? (data.weightSum / wave1UniverseCount) * 100 : 0
      }))

      const wave2Stats = Array.from(wave2Aggregated.entries()).map(([response, data]) => ({
        response,
        count: data.count,
        weightSum: data.weightSum,
        percentage: wave2UniverseCount > 0 ? (data.weightSum / wave2UniverseCount) * 100 : 0
      }))

      // Calcular margem de erro baseado no N (count de respondentes)
      const wave1MarginOfError = wave1UniverseCount > 0
        ? (1.96 * Math.sqrt(0.25 / wave1UniverseCount)) * 100
        : 0

      const wave2MarginOfError = wave2UniverseCount > 0
        ? (1.96 * Math.sqrt(0.25 / wave2UniverseCount)) * 100
        : 0

      // Criar labels combinados
      const labels = variables.map(v => variableLabels[v]).filter(Boolean)
      const combinedLabel = labels.length > 0 ? labels.join(' / ') : ''

      console.log('📊 Comparação aglomerada (weights / N):', {
        wave1: { universeCount: wave1UniverseCount, responses: wave1Stats.length },
        wave2: { universeCount: wave2UniverseCount, responses: wave2Stats.length }
      })

      return [{
        variable: variables.join(' + '),
        wave1Variable: wave1Variables.join(' + '),
        label: combinedLabel,
        wave1Stats,
        wave2Stats,
        wave1SampleSize: wave1UniverseCount,
        wave2SampleSize: wave2UniverseCount,
        wave1MarginOfError: Math.round(wave1MarginOfError * 100) / 100,
        wave2MarginOfError: Math.round(wave2MarginOfError * 100) / 100,
      }]
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
  }, [hasWaveComparison, variables, wave1Variables, isWave1Ready, calculateWave1StatsWithRows, isReady, calculateVariableStatsWithRows, variableLabels, unifiedFilteredData, shouldAggregate])

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
                    politicalVariables={politicalVariables}
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
                        marginBottom: '12px'
                      }}>
                        Filtros Ativos
                      </p>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {Object.entries(filters).map(([filterKey, filterValues]) => {
                          // Encontrar o label do filtro nas variáveis demográficas
                          const demographicVar = demographicVariables.find(d => d.key === filterKey)
                          const filterLabel = demographicVar?.label || filterKey

                          return (
                            <div
                              key={filterKey}
                              style={{
                                background: 'rgba(255,255,255,0.7)',
                                borderRadius: '8px',
                                padding: '8px 10px'
                              }}
                            >
                              <p style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#1565c0',
                                margin: 0,
                                marginBottom: '4px'
                              }}>
                                {filterLabel}:
                              </p>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '4px'
                              }}>
                                {filterValues.map(value => (
                                  <span
                                    key={value}
                                    style={{
                                      background: '#1976d2',
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontWeight: '500'
                                    }}
                                  >
                                    {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p style={{
                        fontSize: '10px',
                        color: '#1976d2',
                        margin: 0,
                        marginTop: '10px',
                        fontStyle: 'italic'
                      }}>
                        {Object.values(filters).reduce((sum, arr) => sum + arr.length, 0)} valor(es) selecionado(s)
                      </p>
                    </div>
                  )}
                </div>
              </Col>

              {/* Coluna de Gráficos - 75% */}
              <Col lg={9}>
                <div className="d-flex flex-column gap-4">
                  {/* Gráficos de dados da Onda 2 (primeiro) */}
                  {isP28Question ? (
                    <P28ViolenceChart
                      data={chartData}
                      questionText={questionText}
                      sampleSize={chartData[0]?.totalResponses}
                      originalSampleSize={chartData[0]?.originalSampleSize}
                      marginOfError={chartData[0]?.marginOfError}
                    />
                  ) : (
                    <>
                      {!shouldAggregate && chartData.length > 1 ? (
                        <StackedBarChart
                          data={chartData}
                          questionText={questionText}
                          sampleSize={chartData[0]?.totalResponses}
                          originalSampleSize={chartData[0]?.originalSampleSize}
                          marginOfError={chartData[0]?.marginOfError}
                        />
                      ) : (
                        chartData.map((data, idx) => (
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
                        ))
                      )}
                    </>
                  )}

                  {chartData.length === 0 && (
                    <div className="empty-state">
                      <h4>Nenhum gráfico disponível</h4>
                      <p>Não há dados para exibir com os filtros selecionados.</p>
                    </div>
                  )}

                  {/* Comparativo entre ondas (abaixo do gráfico principal) */}
                  {hasWaveComparison && waveComparisonData.length > 0 && (
                    <>
                      <hr style={{ margin: '24px 0', borderColor: '#dee2e6' }} />

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
                            Análise da variação das respostas entre a Onda 1 (Mai/25) e Onda 2 (Nov/25)
                          </p>
                        </div>
                      </div>

                      {!shouldAggregate && waveComparisonData.length > 1 ? (
                        <StackedWaveComparisonChart
                          wave1Data={waveComparisonData.map(d => ({
                            variable: d.wave1Variable,
                            label: d.label,
                            stats: d.wave1Stats
                          }))}
                          wave2Data={waveComparisonData.map(d => ({
                            variable: d.variable,
                            label: d.label,
                            stats: d.wave2Stats
                          }))}
                          questionText={questionText}
                          wave1SampleSize={waveComparisonData[0]?.wave1SampleSize}
                          wave2SampleSize={waveComparisonData[0]?.wave2SampleSize}
                          wave1MarginOfError={waveComparisonData[0]?.wave1MarginOfError}
                          wave2MarginOfError={waveComparisonData[0]?.wave2MarginOfError}
                        />
                      ) : shouldAggregate ? (
                        waveComparisonData.map((data, idx) => (
                          <PairedBarComparisonChart
                            key={`paired-comparison-${idx}`}
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
                        ))
                      ) : (
                        waveComparisonData.map((data, idx) => (
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
                        ))
                      )}
                    </>
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
