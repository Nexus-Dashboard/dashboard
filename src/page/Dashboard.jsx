"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { Box } from "@mui/material"
import OffcanvasNavigation from "../components/OffcanvasNavigation"
import DashboardHeader from "../components/DashboardHeader"
import {
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  getResponseColor,
  GROUPED_RESPONSE_ORDER,
  RESPONSE_ORDER,
  normalizeAndGroupNSNR,
} from "../utils/chartUtils"
import { sortMapResponses } from "../utils/questionGrouping"
import { DEMOGRAPHIC_LABELS } from "../utils/demographicUtils"
import LoadingWithProgress from "./dashboard/loading-with-progress"
import ErrorState from "./dashboard/error-state"
import ChartCard from "./dashboard/chart-card"
import MapCard from "./dashboard/map-card"
import "./Dashboard.css"
import { formatApiDateForDisplay } from "../hooks/dateUtils"

// Função para buscar dados agrupados
export const fetchGroupedQuestionData = async ({ queryKey }) => {
  const [, theme, questionText, surveyType] = queryKey

  console.log(`🔄 Buscando dados agrupados para tema: ${theme}, questão: ${questionText}, tipo: ${surveyType}`)

  try {
    const { data: groupedData } = await ApiBase.post(
      `/api/data/question/grouped/responses`,
      {
        theme: theme,
        questionText: questionText,
      },
      { params: { type: surveyType } },
    )

    console.log("📊 Dados recebidos:", groupedData)

    if (!groupedData.success) {
      throw new Error("Erro ao buscar dados agrupados")
    }

    console.log("✅ Dados agrupados recebidos:", groupedData)
    return groupedData
  } catch (error) {
    console.error("💥 Erro ao buscar dados agrupados:", error.message)
    throw error
  }
}

// Função para buscar todas as questões
export const fetchAllQuestions = async ({ queryKey }) => {
  const [, surveyType] = queryKey
  console.log(`🔍 Iniciando busca COMPLETA de todas as questões...`)

  try {
    const firstResponse = await ApiBase.get(`/api/data/questions/all?page=1&limit=50`)

    if (!firstResponse.data?.success) {
      throw new Error("API returned an error")
    }

    const { totalPages, totalQuestions } = firstResponse.data.data.pagination
    console.log(`📊 Total de páginas: ${totalPages}, Total de questões: ${totalQuestions}`)

    let allQuestions = [...firstResponse.data.data.questions]

    const promises = []
    for (let page = 2; page <= totalPages; page++) {
      promises.push(
        ApiBase.get(`/api/data/questions/all?page=${page}&limit=50`)
          .then((response) => {
            return response.data?.success ? response.data.data.questions : []
          })
          .catch((error) => {
            console.error(`❌ Erro na página ${page}:`, error.message)
            return []
          }),
      )
    }

    const additionalPages = await Promise.all(promises)
    additionalPages.forEach((pageQuestions) => {
      allQuestions = [...allQuestions, ...pageQuestions]
    })

    console.log(`🎉 SUCESSO! Total de questões carregadas: ${allQuestions.length}`)

    return {
      success: true,
      data: {
        questions: allQuestions,
        pagination: firstResponse.data.data.pagination,
      },
    }
  } catch (error) {
    console.error("💥 Erro na busca completa:", error.message)
    throw error
  }
}

// Função para formatar eixo X do gráfico
const formatChartXAxis = (period, dateLabel) => {
  console.log(`🔧 Formatando eixo X - period: ${period}, dateLabel: ${dateLabel}`)

  const roundNumber = period ? period.split("-R")[1] : ""

  if (dateLabel && roundNumber) {
    const formatted = `R${roundNumber.padStart(2, "0")} - ${dateLabel}`
    console.log(`✅ Formato com data: ${formatted}`)
    return formatted
  }

  if (period) {
    const parts = period.split("-R")
    if (parts.length === 2) {
      const year = parts[0].slice(-2)
      const round = parts[1].padStart(2, "0")
      const formatted = `R${round}/${year}`
      console.log(`⚠️ Formato sem data: ${formatted}`)
      return formatted
    }
  }

  console.log(`❌ Formato padrão: ${period}`)
  return period || ""
}

// UF demographic key
const UF_DEMOGRAPHIC_KEY = "UF"

export default function Dashboard() {
  const pageRef = useRef(null)
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [numberOfRoundsToShow, setNumberOfRoundsToShow] = useState(10)
  const [selectedMapRoundIndex, setSelectedMapRoundIndex] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState(null) // NOVO: Estado para período específico
  const [selectedMapResponse, setSelectedMapResponse] = useState(null)

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("")
  const [startTime, setStartTime] = useState(null)

  const theme = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("theme")
  }, [location.search])

  const questionText = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("questionText")
  }, [location.search])

  const groupId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("groupId")
  }, [location.search])

  const surveyType = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("type")
  }, [location.search])

  const { data, error, status } = useQuery({
    queryKey: ["groupedQuestionData", theme, questionText, surveyType],
    queryFn: async (queryKey) => {
      setStartTime(Date.now())
      setLoadingProgress(5)
      setLoadingStage("Iniciando busca de dados...")

      try {
        const progressInterval = setInterval(() => {
          setLoadingProgress((prev) => {
            if (prev < 90) {
              return prev + Math.random() * 15
            }
            return prev
          })
        }, 200)

        setLoadingStage("Conectando com a API...")
        setLoadingProgress(15)

        const result = await fetchGroupedQuestionData(queryKey)

        clearInterval(progressInterval)
        setLoadingStage("Processando dados históricos...")
        setLoadingProgress(95)

        await new Promise((resolve) => setTimeout(resolve, 300))
        setLoadingProgress(100)
        setLoadingStage("Dados carregados com sucesso!")

        return result
      } catch (error) {
        setLoadingStage("Erro no carregamento")
        throw error
      }
    },
    enabled: !!theme && !!questionText,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const {
    data: allQuestionsData,
    isLoading: isLoadingAllQuestions,
    error: allQuestionsError,
  } = useQuery({
    queryKey: ["allQuestions", surveyType],
    queryFn: fetchAllQuestions,
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const surveyDateMap = useMemo(() => {
    console.log("🗺️ Criando Survey Date Map...")

    if (!allQuestionsData?.data?.questions) {
      console.log("❌ Sem dados de questões para criar o mapa")
      return new Map()
    }

    const map = new Map()
    const questions = allQuestionsData.data.questions

    console.log(`📊 Processando ${questions.length} questões...`)

    questions.forEach((q) => {
      if (q.surveyNumber && q.date) {
        const key = q.surveyNumber.toString()
        if (!map.has(key)) {
          const formattedDate = formatApiDateForDisplay(q.date)
          map.set(key, formattedDate)
        }
      }
    })

    console.log("🎯 Survey Date Map final:", Array.from(map.entries()))
    console.log(`📈 Total de mapeamentos: ${map.size}`)

    return map
  }, [allQuestionsData])

  const { questionInfo, allHistoricalData, availableDemographics, mapRoundsWithData } = useMemo(() => {
    if (!data) {
      return { questionInfo: null, allHistoricalData: [], availableDemographics: [], mapRoundsWithData: [] }
    }

    const questionInfo = {
      questionText: questionText,
      label: questionText,
      variable: data.questionInfo?.variables?.[0] || "GROUPED",
      variables: data.questionInfo?.variables || [],
      rounds: data.questionInfo?.rounds || [],
      totalVariations: data.questionInfo?.totalVariations || 0,
      variablesByRound: data.questionInfo?.variablesByRound || {},
    }

    const sortedRounds = [...(data.historicalData || [])].sort((a, b) => {
      const [yearA, roundA] = a.period.split("-R").map(Number)
      const [yearB, roundB] = b.period.split("-R").map(Number)
      if (yearA !== yearB) return yearB - yearA
      return roundB - roundA
    })

    const roundsWithMapData = sortedRounds.filter((round) =>
      round.distribution.some(
        (dist) => dist.demographics?.[UF_DEMOGRAPHIC_KEY]?.length > 0 || dist.demographics?.["PF10"]?.length > 0,
      ),
    )

    const demographicsMap = new Map()
    const normalizeRegion = (region) => {
      const r = String(region || "")
        .toUpperCase()
        .trim()
      if (r.includes("CENTRO-OESTE")) return "Centro-Oeste"
      if (r.includes("NORDESTE")) return "Nordeste"
      if (r.includes("NORTE")) return "Norte"
      if (r.includes("SUDESTE")) return "Sudeste"
      if (r.includes("SUL")) return "Sul"
      return region
    }
    ;(data.demographicFields || []).forEach((key) => {
      if (key !== UF_DEMOGRAPHIC_KEY && key !== "PF10") {
        demographicsMap.set(key, {
          key,
          label: DEMOGRAPHIC_LABELS[key] || key,
          values: new Set(),
        })
      }
    })

    sortedRounds.forEach((round) => {
      round.distribution.forEach((dist) => {
        if (dist.demographics) {
          Object.entries(dist.demographics).forEach(([key, values]) => {
            if (demographicsMap.has(key)) {
              values.forEach((v) => {
                const valueToAdd = key === "REGIAO" ? normalizeRegion(v.response) : v.response
                if (valueToAdd) {
                  demographicsMap.get(key).values.add(valueToAdd)
                }
              })
            }
          })
        }
      })
    })

    let demographics = Array.from(demographicsMap.values()).map((d) => ({
      ...d,
      values: Array.from(d.values).sort((a, b) => a.localeCompare(b)),
    }))

    if (demographicsMap.has("PF2_FAIXAS")) {
      demographics = demographics.filter((d) => d.key !== "PF2" && d.key !== "Faixa de idade")
    }

    return {
      questionInfo: questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: demographics,
      mapRoundsWithData: roundsWithMapData,
    }
  }, [data, questionText])

  const availableMapResponses = useMemo(() => {
    if (!allHistoricalData || allHistoricalData.length === 0) return []

    // SEMPRE aplicar normalização NS/NR primeiro
    const allNormalizedAnswers = allHistoricalData.flatMap((r) => 
      r.distribution.map((d) => normalizeAndGroupNSNR(d.response))
    )
    const useGrouping = shouldGroupResponses(allNormalizedAnswers)

    const allAnswers = new Set()
    allHistoricalData.forEach((round) => {
      round.distribution.forEach((dist) => {
        const answer = dist.response
        if (answer) {
          // SEMPRE aplicar normalização NS/NR primeiro
          const normalizedAnswer = normalizeAndGroupNSNR(answer)
          // Depois aplicar agrupamento se necessário
          const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer
          allAnswers.add(finalAnswer)
        }
      })
    })

    return sortMapResponses(Array.from(allAnswers))
  }, [allHistoricalData])

  useEffect(() => {
    if (availableMapResponses.length > 0 && !selectedMapResponse) {
      setSelectedMapResponse(availableMapResponses[0])
    }
  }, [availableMapResponses, selectedMapResponse])

  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prevFilters) => {
      const newFilters = {}
      const currentValues =
        prevFilters[demographicKey] && Object.keys(prevFilters)[0] === demographicKey
          ? [...prevFilters[demographicKey]]
          : []

      if (checked) {
        if (!currentValues.includes(value)) {
          currentValues.push(value)
        }
      } else {
        const index = currentValues.indexOf(value)
        if (index > -1) {
          currentValues.splice(index, 1)
        }
      }

      if (currentValues.length > 0) {
        newFilters[demographicKey] = currentValues
      }

      return newFilters
    })
  }

  const handleQuickFilterToggle = (demographicKey, value) => {
    setFilters((prevFilters) => {
      if (prevFilters[demographicKey] && prevFilters[demographicKey][0] === value) {
        return {}
      }
      return { [demographicKey]: [value] }
    })
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  // NOVA FUNÇÃO: Handle mudança de período específico
  const handlePeriodChange = (periodData) => {
    setSelectedPeriod(periodData)
  }

  // NOVA LÓGICA: Filtrar dados históricos por período específico
  const filteredHistoricalData = useMemo(() => {
    let filtered = allHistoricalData

    // 1. Aplicar filtro de período específico PRIMEIRO
    if (selectedPeriod) {
      if (selectedPeriod.type === 'relative') {
        // Para períodos relativos, filtrar por array de períodos
        filtered = filtered.filter((round) => selectedPeriod.periods.includes(round.period))
      } else if (selectedPeriod.type === 'specific') {
        // Para período específico, filtrar por período único
        filtered = filtered.filter((round) => round.period === selectedPeriod.period)
      }
    }

    // 2. Aplicar filtros demográficos
    if (Object.keys(filters).length === 0) {
      return filtered
    }

    const filterKey = Object.keys(filters)[0]
    const filterValues = filters[filterKey]

    if (!filterKey || !filterValues || filterValues.length === 0) {
      return filtered
    }

    return filtered.map((round) => {
      let totalForFilter = 0
      const distributionForFilter = {}

      round.distribution.forEach((dist) => {
        const demoGroup = dist.demographics?.[filterKey]
        if (demoGroup) {
          demoGroup.forEach((demoValue) => {
            if (filterValues.includes(demoValue.response)) {
              totalForFilter += demoValue.weightedCount
              distributionForFilter[dist.response] =
                (distributionForFilter[dist.response] || 0) + demoValue.weightedCount
            }
          })
        }
      })

      const newDistribution = round.distribution.map((dist) => ({
        ...dist,
        weightedCount: distributionForFilter[dist.response] || 0,
      }))

      return {
        ...round,
        distribution: newDistribution,
        totalWeightedResponses: totalForFilter,
      }
    })
  }, [allHistoricalData, filters, selectedPeriod])

  useEffect(() => {
    if (mapRoundsWithData.length > 0) {
      setSelectedMapRoundIndex(0)
    }
  }, [mapRoundsWithData])

  const selectedChartData = useMemo(() => {
    if (!filteredHistoricalData.length) return []
    const recentRounds = filteredHistoricalData.slice(0, numberOfRoundsToShow)
    return recentRounds.reverse()
  }, [filteredHistoricalData, numberOfRoundsToShow])

  const mapData = useMemo(() => {
    if (!mapRoundsWithData.length || selectedMapRoundIndex >= mapRoundsWithData.length || !questionInfo) {
      return []
    }

    const selectedRound = mapRoundsWithData[selectedMapRoundIndex]
    const mapResponses = []

    selectedRound.distribution.forEach((dist) => {
      const responseValue = dist.response
      const ufDemographics = dist.demographics?.[UF_DEMOGRAPHIC_KEY] || dist.demographics?.["PF10"]

      if (ufDemographics) {
        ufDemographics.forEach((ufDemo) => {
          for (let i = 0; i < ufDemo.count; i++) {
            mapResponses.push({
              [questionInfo.variable]: responseValue,
              UF: ufDemo.response,
            })
          }
        })
      }
    })
    return mapResponses
  }, [mapRoundsWithData, selectedMapRoundIndex, questionInfo])

  const chartData = useMemo(() => {
    console.log("🎨 Criando dados do gráfico...")

    if (!selectedChartData || selectedChartData.length === 0) {
      console.log("❌ Sem dados selecionados para o gráfico")
      return []
    }

    console.log(`📊 Processando ${selectedChartData.length} rodadas para o gráfico`)

    const dataByPeriod = new Map(selectedChartData.map((d) => [d.period, d]))
    const allPeriods = Array.from(dataByPeriod.keys())

    console.log("🕐 Períodos encontrados:", allPeriods)

    // SEMPRE aplicar normalização NS/NR primeiro
    const allNormalizedResponses = selectedChartData.flatMap((r) => 
      r.distribution.map((d) => normalizeAndGroupNSNR(d.response))
    )
    const uniqueNormalizedResponses = new Set(allNormalizedResponses)
    
    // Verificar se deve usar agrupamento completo
    const useGrouping = shouldGroupResponses(allNormalizedResponses)
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

    const allSeriesIds = new Set()
    selectedChartData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => {
        // SEMPRE aplicar normalização NS/NR primeiro
        const normalizedResponse = normalizeAndGroupNSNR(dist.response)
        // Depois aplicar agrupamento se necessário
        const finalResponse = useGrouping ? groupResponses(normalizedResponse) : normalizedResponse
        if (finalResponse) allSeriesIds.add(finalResponse)
      })
    })

    if (allSeriesIds.size === 0) return []

    console.log("🏷️ Séries identificadas:", Array.from(allSeriesIds))

    const series = Array.from(allSeriesIds).map((seriesId) => ({
      id: seriesId,
      data: allPeriods.map((period) => {
        const rodada = dataByPeriod.get(period)
        let yValue = 0

        if (rodada && rodada.totalWeightedResponses > 0) {
          let weightedCount = 0
          
          rodada.distribution.forEach((dist) => {
            // SEMPRE aplicar normalização NS/NR primeiro
            const normalizedResponse = normalizeAndGroupNSNR(dist.response)
            // Depois aplicar agrupamento se necessário
            const finalResponse = useGrouping ? groupResponses(normalizedResponse) : normalizedResponse
            
            if (finalResponse === seriesId) {
              weightedCount += dist.weightedCount
            }
          })
          
          yValue = (weightedCount / rodada.totalWeightedResponses) * 100
        }

        const roundNumber = period.split("-R")[1]
        const dateLabel = surveyDateMap.get(roundNumber)
        const xLabel = formatChartXAxis(period, dateLabel)

        return {
          x: xLabel,
          y: Number.isFinite(yValue) ? yValue : 0,
        }
      }),
    }))

    console.log("📈 Dados finais do gráfico:", series)

    // Filtrar séries duplicadas e ordenar
    const uniqueSeries = new Map()
    series.forEach(serie => {
      if (!uniqueSeries.has(serie.id)) {
        uniqueSeries.set(serie.id, serie)
      }
    })

    return Array.from(uniqueSeries.values())
      .sort((a, b) => {
        const indexA = responseOrder.indexOf(a.id)
        const indexB = responseOrder.indexOf(b.id)
        if (indexA > -1 && indexB > -1) return indexA - indexB
        if (indexA > -1) return -1
        if (indexB > -1) return 1
        return a.id.localeCompare(b.id)
      })
      .filter((serie) => serie.data && serie.data.length > 0)
  }, [selectedChartData, surveyDateMap])

  const getXAxisLabel = (rodada) => {
    if (!rodada || !surveyDateMap) return "N/A"
    const roundNumber = rodada.period.split("-R")[1]
    const dateLabel = surveyDateMap.get(roundNumber)
    return formatChartXAxis(rodada.period, dateLabel)
  }

  useEffect(() => {
    if (allQuestionsError) {
      console.error("💥 Erro ao carregar todas as questões:", allQuestionsError)
    }
  }, [allQuestionsError])

  if (status === "loading" || !data) {
    return <LoadingWithProgress loadingProgress={loadingProgress} loadingStage={loadingStage} />
  }

  if (isLoadingAllQuestions) {
    return <LoadingWithProgress loadingProgress={30} loadingStage="Carregando informações de datas..." />
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Erro ao carregar dados agrupados"
        message={`Erro: ${error.message}`}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (allQuestionsError) {
    return (
      <ErrorState
        title="Erro ao carregar informações de datas"
        message={`Erro: ${allQuestionsError.message}`}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const useGroupingForChart = shouldGroupResponses(
    selectedChartData.flatMap((h) => h.distribution.map((d) => normalizeAndGroupNSNR(d.response))),
  )
  const chartColorFunc = (d) => (useGroupingForChart ? groupedResponseColorMap[d.id] : getResponseColor(d.id))

  return (
    <Box className="dashboard-page" ref={pageRef}>
      <OffcanvasNavigation
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        availableDemographics={availableDemographics}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <DashboardHeader
        questionInfo={questionInfo}
        allHistoricalData={allHistoricalData}
        pageRef={pageRef}
        onMenuClick={() => setShowOffcanvas(true)}
      />

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <ChartCard
            title={questionInfo?.label || questionInfo?.questionText}
            allHistoricalData={allHistoricalData}
            selectedChartData={selectedChartData}
            numberOfRoundsToShow={numberOfRoundsToShow}
            onRoundsChange={setNumberOfRoundsToShow}
            chartData={chartData}
            chartRef={chartRef}
            chartColorFunc={chartColorFunc}
            getXAxisLabel={getXAxisLabel}
            // NOVAS PROPS para o dropdown de período
            surveyDateMap={surveyDateMap}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            formatChartXAxis={formatChartXAxis}
          />

          <MapCard
            mapRoundsWithData={mapRoundsWithData}
            selectedMapRoundIndex={selectedMapRoundIndex}
            onRoundIndexChange={setSelectedMapRoundIndex}
            mapData={mapData}
            questionInfo={questionInfo}
            availableDemographics={availableDemographics}
            activeFilters={filters}
            onFilterToggle={handleQuickFilterToggle}
            getXAxisLabel={getXAxisLabel}
            availableMapResponses={availableMapResponses}
            selectedMapResponse={selectedMapResponse}
            onMapResponseChange={setSelectedMapResponse}
          />
        </div>
      </div>
    </Box>
  )
}