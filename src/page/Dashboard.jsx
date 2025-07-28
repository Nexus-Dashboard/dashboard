"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import { Box, Typography, CircularProgress, IconButton, Button, LinearProgress } from "@mui/material"
import { Download, PictureAsPdf, Menu as MenuIcon } from "@mui/icons-material"
import OffcanvasNavigation from "../components/OffcanvasNavigation"
import InteractiveBrazilMap from "../components/InteractiveBrazilMap"
import {
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  getResponseColor,
  GROUPED_RESPONSE_ORDER,
  RESPONSE_ORDER,
} from "../utils/chartUtils"
import { DEMOGRAPHIC_LABELS } from "../utils/demographicUtils"
import "./Dashboard.css"

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

// Função temporária para buscar dados usando a API individual até a API agrupada estar disponível
export const fetchQuestionDataFallback = async ({ queryKey }) => {
  const [, theme, questionText] = queryKey
  console.log(`🔄 Usando fallback - buscando dados individuais para tema: ${theme}`)
  console.log(`Question Text: ${questionText}`)

  try {
    // Primeiro, buscar todas as perguntas do tema para encontrar as variáveis relacionadas
    const { data: themeData } = await ApiBase.get(`/api/data/themes/${encodeURIComponent(theme)}/questions-grouped`)

    if (!themeData.success) {
      throw new Error("Erro ao buscar dados do tema")
    }

    // Encontrar o grupo de perguntas correspondente
    const questionGroup = themeData.questionGroups.find((group) => group.questionText === questionText)

    if (!questionGroup) {
      throw new Error("Grupo de perguntas não encontrado")
    }

    console.log("📊 Grupo encontrado:", questionGroup)

    // Buscar dados para cada variável do grupo
    const allHistoricalData = []
    const demographicFieldsSet = new Set()

    for (const variable of questionGroup.variables) {
      try {
        console.log(`🔍 Buscando dados para variável: ${variable}`)
        const { data: variableData } = await ApiBase.post(`/api/data/question/${variable}/responses`, {
          theme: theme,
          questionText: questionText,
        })

        if (variableData.success && variableData.historicalData) {
          // Adicionar dados históricos
          variableData.historicalData.forEach((round) => {
            // Verificar se já existe uma rodada com o mesmo período
            const existingRound = allHistoricalData.find((r) => r.period === round.period)

            if (existingRound) {
              // Combinar distribuições
              round.distribution.forEach((dist) => {
                const existingDist = existingRound.distribution.find((d) => d.response === dist.response)
                if (existingDist) {
                  existingDist.weightedCount += dist.weightedCount
                  existingDist.count += dist.count

                  // Combinar demographics
                  if (dist.demographics) {
                    Object.entries(dist.demographics).forEach(([key, values]) => {
                      if (!existingDist.demographics[key]) {
                        existingDist.demographics[key] = []
                      }
                      existingDist.demographics[key] = [...existingDist.demographics[key], ...values]
                    })
                  }
                } else {
                  existingRound.distribution.push({ ...dist })
                }
              })

              existingRound.totalWeightedResponses += round.totalWeightedResponses
              existingRound.totalResponses += round.totalResponses
            } else {
              allHistoricalData.push({
                ...round,
                variable: variable, // Adicionar referência da variável
              })
            }
          })

          // Adicionar campos demográficos
          if (variableData.demographicFields) {
            variableData.demographicFields.forEach((field) => demographicFieldsSet.add(field))
          }
        }
      } catch (variableError) {
        console.warn(`⚠️ Erro ao buscar dados para variável ${variable}:`, variableError.message)
      }
    }

    // Ordenar dados históricos por período
    allHistoricalData.sort((a, b) => {
      const [yearA, roundA] = a.period.split("-R").map(Number)
      const [yearB, roundB] = b.period.split("-R").map(Number)
      if (yearA !== yearB) return yearA - yearB
      return roundA - roundB
    })

    console.log(`✅ Dados combinados: ${allHistoricalData.length} rodadas`)

    return {
      success: true,
      searchMethod: "Dados agrupados via fallback",
      theme: theme,
      questionInfo: {
        variables: questionGroup.variables,
        rounds: questionGroup.rounds,
        totalVariations: questionGroup.totalVariations,
        variablesByRound:
          questionGroup.variations?.reduce((acc, variation) => {
            acc[variation.surveyNumber] = variation.variable
            return acc
          }, {}) || {},
      },
      historicalData: allHistoricalData,
      demographicFields: Array.from(demographicFieldsSet),
    }
  } catch (error) {
    console.error("💥 Erro no fallback:", error.message)
    throw error
  }
}

// Função para buscar TODAS as questões de forma mais robusta
export const fetchAllQuestions = async ({ queryKey }) => {
  const [, surveyType] = queryKey
  console.log(`🔍 Iniciando busca COMPLETA de todas as questões para o tipo: ${surveyType}...`)

  try {
    const firstResponse = await ApiBase.get(`/api/data/questions/all?page=1&limit=50`, { params: { type: surveyType } })
    console.log("📋 Resposta da primeira página:", firstResponse.data)

    if (!firstResponse.data?.success) {
      throw new Error("API returned an error")
    }

    const { totalPages, totalQuestions } = firstResponse.data.data.pagination
    console.log(`📊 Total de páginas: ${totalPages}, Total de questões: ${totalQuestions}`)

    let allQuestions = [...firstResponse.data.data.questions]
    console.log(`✅ Primeira página carregada: ${allQuestions.length} questões`)

    const promises = []
    for (let page = 2; page <= totalPages; page++) {
      promises.push(
        ApiBase.get(`/api/data/questions/all?page=${page}&limit=50`, { params: { type: surveyType } })
          .then((response) => {
            return response.data?.success ? response.data.data.questions : []
          })
          .catch((error) => {
            console.error(`❌ Erro na página ${page}:`, error.message)
            return []
          }),
      )
    }

    console.log(`⏳ Aguardando ${promises.length} requisições...`)
    const additionalPages = await Promise.all(promises)

    additionalPages.forEach((pageQuestions) => {
      allQuestions = [...allQuestions, ...pageQuestions]
    })

    console.log(`🎉 SUCESSO! Total de questões carregadas: ${allQuestions.length}`)

    console.log(
      "📋 Primeiros 3 exemplos:",
      allQuestions.slice(0, 3).map((q) => ({
        surveyNumber: q.surveyNumber,
        date: q.date,
        variable: q.variable,
      })),
    )

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

// UF demographic key - adjust this if your API uses a different key for states
const UF_DEMOGRAPHIC_KEY = "UF"

const formatChartXAxis = (period, dateLabel) => {
  console.log(`🔧 Formatando eixo X - period: ${period}, dateLabel: ${dateLabel}`)

  const roundNumber = period ? period.split("-R")[1] : ""

  if (dateLabel && roundNumber) {
    const formatted = `${dateLabel} - R${roundNumber.padStart(2, "0")}`
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

export default function Dashboard() {
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [numberOfRoundsToShow, setNumberOfRoundsToShow] = useState(10)
  const [selectedMapRoundIndex, setSelectedMapRoundIndex] = useState(0)

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
    queryFn: fetchGroupedQuestionData,
    enabled: !!theme && !!questionText,
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
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
    staleTime: 1000 * 60 * 60, // 1 hour
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

    questions.forEach((q, index) => {
      if (q.surveyNumber && q.date) {
        const key = q.surveyNumber.toString()
        if (!map.has(key)) {
          map.set(key, q.date)
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

    // Adaptar para a nova estrutura de dados agrupados
    const questionInfo = {
      questionText: questionText,
      label: questionText,
      variable: data.questionInfo?.variables?.[0] || "GROUPED", // Usar primeira variável ou placeholder
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
              values.forEach((v) => demographicsMap.get(key).values.add(v.response))
            }
          })
        }
      })
    })

    const demographics = Array.from(demographicsMap.values()).map((d) => ({
      ...d,
      values: Array.from(d.values).sort((a, b) => a.localeCompare(b)),
    }))

    return {
      questionInfo: questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: demographics,
      mapRoundsWithData: roundsWithMapData,
    }
  }, [data, questionText])

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

  const handleClearFilters = () => {
    setFilters({})
  }

  const filteredHistoricalData = useMemo(() => {
    if (!allHistoricalData || Object.keys(filters).length === 0) {
      return allHistoricalData
    }

    const filterKey = Object.keys(filters)[0]
    const filterValues = filters[filterKey]

    if (!filterKey || !filterValues || filterValues.length === 0) {
      return allHistoricalData
    }

    return allHistoricalData.map((round) => {
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
  }, [allHistoricalData, filters])

  useEffect(() => {
    if (mapRoundsWithData.length > 0) {
      setSelectedMapRoundIndex(0) // Default to the most recent round with map data
    }
  }, [mapRoundsWithData])

  const selectedChartData = useMemo(() => {
    if (!filteredHistoricalData.length) return []
    // Get the N most recent rounds from the data (which is sorted newest to oldest)
    const recentRounds = filteredHistoricalData.slice(0, numberOfRoundsToShow)
    // Reverse them to be in chronological order for the chart's X-axis
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
      // Primeiro tenta UF, se não existir, usa PF10
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

    const allActualResponses = new Set(selectedChartData.flatMap((r) => r.distribution.map((d) => d.response)))
    const useGrouping = shouldGroupResponses(Array.from(allActualResponses))
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

    const allSeriesIds = new Set()
    selectedChartData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => {
        const finalResponse = useGrouping ? groupResponses(dist.response) : dist.response
        if (finalResponse) allSeriesIds.add(finalResponse)
      })
    })

    if (allSeriesIds.size === 0) return []

    const series = Array.from(allSeriesIds).map((seriesId) => ({
      id: seriesId,
      data: allPeriods.map((period) => {
        const rodada = dataByPeriod.get(period)
        let yValue = 0

        if (rodada && rodada.totalWeightedResponses > 0) {
          let weightedCount = 0
          if (useGrouping) {
            rodada.distribution.forEach((dist) => {
              if (groupResponses(dist.response) === seriesId) {
                weightedCount += dist.weightedCount
              }
            })
          } else {
            const dist = rodada.distribution.find((d) => d.response === seriesId)
            if (dist) {
              weightedCount = dist.weightedCount
            }
          }
          yValue = (weightedCount / rodada.totalWeightedResponses) * 100
        }

        const roundNumber = period.split("-R")[1]
        const dateLabel = surveyDateMap.get(roundNumber)

        console.log(`🔍 Buscando data para rodada ${roundNumber}:`, dateLabel)

        const xLabel = formatChartXAxis(period, dateLabel)

        return {
          x: xLabel,
          y: Number.isFinite(yValue) ? yValue : 0,
        }
      }),
    }))

    console.log("📈 Dados finais do gráfico:", series)

    return series
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

  // Debug dos erros
  useEffect(() => {
    if (allQuestionsError) {
      console.error("💥 Erro ao carregar todas as questões:", allQuestionsError)
    }
  }, [allQuestionsError])

  if (status === "loading" || !data) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
          Carregando dados agrupados da pergunta...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Usando método de fallback para combinar dados de múltiplas variáveis
        </Typography>
        <Box sx={{ width: "300px", mt: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Processando dados históricos e demográficos agrupados...
        </Typography>
      </Box>
    )
  }

  if (isLoadingAllQuestions) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
          🔄 Carregando informações de datas...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Buscando dados de todas as {allQuestionsData?.data?.pagination?.totalQuestions || "1883"} questões para
          formatação correta dos rótulos
        </Typography>
        <Box sx={{ width: "300px", mt: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Isso pode levar alguns segundos...
        </Typography>
      </Box>
    )
  }

  if (status === "error") {
    return (
      <Box className="error-container">
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          Erro ao carregar dados agrupados
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {`Erro: ${error.message}`}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Tentar Novamente
        </Button>
      </Box>
    )
  }

  if (allQuestionsError) {
    return (
      <Box className="error-container">
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          Erro ao carregar informações de datas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {`Erro: ${allQuestionsError.message}`}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Tentar Novamente
        </Button>
      </Box>
    )
  }

  const useGroupingForChart = shouldGroupResponses(
    selectedChartData.flatMap((h) => h.distribution.map((d) => d.response)),
  )
  const chartColorFunc = (d) => (useGroupingForChart ? groupedResponseColorMap[d.id] : getResponseColor(d.id))

  return (
    <Box className="dashboard-page">
      <OffcanvasNavigation
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        availableDemographics={availableDemographics}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <header className="dashboard-header">
        <Box className="header-left">
          <IconButton color="inherit" onClick={() => setShowOffcanvas(true)}>
            <MenuIcon />
          </IconButton>
          <h2>{questionInfo?.questionText || questionInfo?.label || "Dashboard"}</h2>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" color="inherit" startIcon={<Download />}>
            Exportar CSV
          </Button>
          <Button variant="contained" className="export-btn-pdf" startIcon={<PictureAsPdf />}>
            Exportar PDF
          </Button>
        </Box>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="chart-card-content">
              <Typography className="card-title-custom">
                {questionInfo?.label || questionInfo?.questionText || "Análise Temporal"}
              </Typography>

              {allHistoricalData.length > 1 && (
                <Box sx={{ mb: 3, px: 1 }}>
                  {selectedChartData.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                      Período: {getXAxisLabel(selectedChartData[0])} até{" "}
                      {getXAxisLabel(selectedChartData[selectedChartData.length - 1])}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Exibindo as últimas {numberOfRoundsToShow} de {allHistoricalData.length} rodadas
                  </Typography>
                  <input
                    type="range"
                    min={1}
                    max={allHistoricalData.length || 1}
                    value={numberOfRoundsToShow}
                    onChange={(e) => setNumberOfRoundsToShow(Number(e.target.value))}
                    className="single-range-slider"
                    style={{ direction: "rtl" }} // Inverte a direção do slider
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mais rodadas
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Menos rodadas
                    </Typography>
                  </Box>
                </Box>
              )}

              <div ref={chartRef} className="chart-container">
                {chartData.length > 0 ? (
                  <ResponsiveLine
                    data={chartData}
                    margin={{ top: 20, right: 110, bottom: 60, left: 60 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: "auto" }}
                    yFormat=" >-.1f"
                    curve="monotoneX"
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -15,
                      legend: "Período",
                      legendOffset: 50,
                      legendPosition: "middle",
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Porcentagem (%)",
                      legendOffset: -50,
                      legendPosition: "middle",
                    }}
                    pointSize={8}
                    pointColor={{ theme: "background" }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    pointLabelYOffset={-12}
                    useMesh={true}
                    colors={chartColorFunc}
                    legends={[
                      {
                        anchor: "right",
                        direction: "column",
                        justify: false,
                        translateX: 100,
                        translateY: 0,
                        itemsSpacing: 2,
                        itemDirection: "left-to-right",
                        itemWidth: 80,
                        itemHeight: 20,
                        itemOpacity: 0.85,
                        symbolSize: 12,
                        symbolShape: "circle",
                      },
                    ]}
                  />
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <Typography variant="body1" color="text.secondary">
                      Nenhum dado disponível para o período ou filtros selecionados
                    </Typography>
                  </Box>
                )}
              </div>
            </div>
          </div>

          <div className="map-card">
            <div className="map-card-content">
              <Typography className="card-title-custom">Mapa Interativo do Brasil</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visualização geográfica das respostas por estado
              </Typography>

              {mapRoundsWithData.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Rodada: {getXAxisLabel(mapRoundsWithData[selectedMapRoundIndex]) || "N/A"}
                  </Typography>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, mapRoundsWithData.length - 1)}
                    value={selectedMapRoundIndex}
                    onChange={(e) => setSelectedMapRoundIndex(Number.parseInt(e.target.value))}
                    className="single-range-slider"
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mais recente
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mais antiga
                    </Typography>
                  </Box>
                </Box>
              )}

              <div className="map-container">
                {mapData.length > 0 ? (
                  <InteractiveBrazilMap responses={mapData} selectedQuestion={questionInfo} onStateClick={() => {}} />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      color: "text.secondary",
                    }}
                  >
                    <Typography>Nenhum dado geográfico para a rodada selecionada.</Typography>
                  </Box>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  )
}
