"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import ApiBase, { ApiMethods } from "../service/ApiBase"
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

// Updated fetch function for the new API structure
const fetchQuestionData = async ({ queryKey }) => {
  const [, questionCode] = queryKey
  console.log(`Iniciando busca para pergunta: ${questionCode}`)

  try {
    const { data } = await ApiBase.get(`/api/data/question/${questionCode}/responses`)
    console.log("Dados recebidos com sucesso")

    if (!data.success) {
      throw new Error("API returned an error")
    }
    return data
  } catch (error) {
    console.error("Erro na busca de dados:", error.message)
    throw error
  }
}



// UF demographic key - adjust this if your API uses a different key for states
const UF_DEMOGRAPHIC_KEY = "UF"

const formatChartXAxis = (period, dateLabel) => {
  const roundNumber = period ? period.split("-R")[1] : ""
  if (dateLabel && roundNumber) {
    return `${dateLabel} - R${roundNumber.padStart(2, '0')}`
  }

  if (period) {
    const parts = period.split("-R")
    if (parts.length === 2) {
      const year = parts[0].slice(-2)
      const round = parts[1].padStart(2, '0')
      return `R${round}/${year}`
    }
  }
  return period || ""
}

export default function Dashboard() {
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [chartRangeStart, setChartRangeStart] = useState(0)
  const [chartRangeEnd, setChartRangeEnd] = useState(9)
  const [selectedMapRoundIndex, setSelectedMapRoundIndex] = useState(0)

  const questionCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("question")
  }, [location.search])

  const { data, error, status } = useQuery({
    queryKey: ["questionData", questionCode],
    queryFn: fetchQuestionData,
    enabled: !!questionCode,
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Query atualizada para buscar todas as questões
  const { data: allQuestionsData, isLoading: isLoadingAllQuestions } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: ApiMethods.getAllQuestionsComplete,
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const surveyDateMap = useMemo(() => {
    if (!allQuestionsData?.data?.questions) return new Map()
    const map = new Map()
    allQuestionsData.data.questions.forEach((q) => {
      if (q.surveyNumber && q.date && !map.has(q.surveyNumber.toString())) {
        map.set(q.surveyNumber.toString(), q.date)
      }
    })
    console.log("Survey Date Map criado:", map)
    return map
  }, [allQuestionsData])

  const { questionInfo, allHistoricalData, availableDemographics, mapRoundsWithData } = useMemo(() => {
    if (!data) {
      return { questionInfo: null, allHistoricalData: [], availableDemographics: [], mapRoundsWithData: [] }
    }

    const sortedRounds = [...(data.historicalData || [])].sort((a, b) => {
      const [yearA, roundA] = a.period.split("-R").map(Number)
      const [yearB, roundB] = b.period.split("-R").map(Number)
      if (yearA !== yearB) return yearB - yearA
      return roundB - roundA
    })

    const roundsWithMapData = sortedRounds.filter((round) =>
      round.distribution.some((dist) => dist.demographics?.[UF_DEMOGRAPHIC_KEY]?.length > 0),
    )

    const demographicsMap = new Map()
    ;(data.demographicFields || []).forEach((key) => {
      if (key !== UF_DEMOGRAPHIC_KEY) {
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
      questionInfo: data.questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: demographics,
      mapRoundsWithData: roundsWithMapData,
    }
  }, [data])

  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prevFilters) => {
      // This logic allows multi-selection within a single demographic category.
      // If a filter from a new category is selected, it clears the old one.
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
    if (allHistoricalData.length > 0) {
      const maxIndex = Math.max(0, allHistoricalData.length - 1)
      setChartRangeStart(0)
      setChartRangeEnd(Math.min(9, maxIndex))
    }
  }, [allHistoricalData])

  useEffect(() => {
    if (mapRoundsWithData.length > 0) {
      setSelectedMapRoundIndex(0)
    }
  }, [mapRoundsWithData])

  const selectedChartData = useMemo(() => {
    if (!filteredHistoricalData.length) return []
    return filteredHistoricalData.slice(chartRangeStart, chartRangeEnd + 1).reverse()
  }, [filteredHistoricalData, chartRangeStart, chartRangeEnd])

  const mapData = useMemo(() => {
    if (!mapRoundsWithData.length || selectedMapRoundIndex >= mapRoundsWithData.length || !questionInfo) {
      return []
    }

    const selectedRound = mapRoundsWithData[selectedMapRoundIndex]
    const mapResponses = []

    selectedRound.distribution.forEach((dist) => {
      const responseValue = dist.response
      const ufDemographics = dist.demographics?.[UF_DEMOGRAPHIC_KEY]

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
    if (!selectedChartData || selectedChartData.length === 0) return []

    const dataByPeriod = new Map(selectedChartData.map((d) => [d.period, d]))
    const allPeriods = Array.from(dataByPeriod.keys())

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

        return {
          x: formatChartXAxis(period, dateLabel),
          y: Number.isFinite(yValue) ? yValue : 0,
        }
      }),
    }))

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

  if (status === "loading" || !data) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
          Carregando dados da pergunta...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Esta operação pode levar até 2 minutos devido ao volume de dados
        </Typography>
        <Box sx={{ width: "300px", mt: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Processando dados históricos e demográficos...
        </Typography>
      </Box>
    )
  }

  if (isLoadingAllQuestions) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
          Carregando informações de datas...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Buscando dados de todas as rodadas para formatação correta dos rótulos
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
          Erro ao carregar dados
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
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                    Período: {getXAxisLabel(allHistoricalData[chartRangeEnd])} até{" "}
                    {getXAxisLabel(allHistoricalData[chartRangeStart])}
                  </Typography>

                  <Box sx={{ position: "relative", height: "40px", mb: 1 }}>
                    <Box
                      sx={{
                        position: "absolute",
                        top: "17px",
                        left: "0",
                        right: "0",
                        height: "6px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "3px",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: "17px",
                        height: "6px",
                        backgroundColor: "#1976d2",
                        borderRadius: "3px",
                        left: `${(chartRangeStart / Math.max(1, allHistoricalData.length - 1)) * 100}%`,
                        width: `${
                          ((chartRangeEnd - chartRangeStart) / Math.max(1, allHistoricalData.length - 1)) * 100
                        }%`,
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, allHistoricalData.length - 1)}
                      value={chartRangeStart}
                      onChange={(e) => {
                        const newStart = Number.parseInt(e.target.value)
                        if (newStart <= chartRangeEnd) {
                          setChartRangeStart(newStart)
                        }
                      }}
                      className="range-slider range-slider-start"
                    />
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, allHistoricalData.length - 1)}
                      value={chartRangeEnd}
                      onChange={(e) => {
                        const newEnd = Number.parseInt(e.target.value)
                        if (newEnd >= chartRangeStart) {
                          setChartRangeEnd(newEnd)
                        }
                      }}
                      className="range-slider range-slider-end"
                    />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Mais antiga
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mais recente
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
                    max={mapRoundsWithData.length - 1}
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