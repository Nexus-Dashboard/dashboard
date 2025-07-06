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
import DemographicFilters from "../components/DemographicFilters"
import {
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  getResponseColor,
  GROUPED_RESPONSE_ORDER,
  RESPONSE_ORDER,
} from "../utils/chartUtils"
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

  // Enhanced query with better timeout handling
  const { data, error, status, isFetching } = useQuery({
    queryKey: ["questionData", questionCode],
    queryFn: fetchQuestionData,
    enabled: !!questionCode,
    staleTime: 1000 * 60 * 10, // 10 minutes - dados grandes não mudam frequentemente
    cacheTime: 1000 * 60 * 15, // 15 minutes cache
    refetchOnWindowFocus: false,
    retry: 2, // Retry 2 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  const { questionInfo, allHistoricalData, availableDemographics, mapRoundsWithData } = useMemo(() => {
    if (!data) {
      return { questionInfo: null, allHistoricalData: [], availableDemographics: [], mapRoundsWithData: [] }
    }

    console.log("Processando dados históricos:", data.historicalData?.length || 0, "rodadas")

    // Sort all rounds by period (most recent first)
    const sortedRounds = [...(data.historicalData || [])].sort((a, b) => {
      const [yearA, roundA] = a.period.split("-R").map(Number)
      const [yearB, roundB] = b.period.split("-R").map(Number)
      if (yearA !== yearB) return yearB - yearA
      return roundB - roundA
    })

    // Filter rounds that have UF data for the map
    const roundsWithMapData = sortedRounds.filter((round) => {
      return round.distribution.some(
        (dist) =>
          dist.demographics &&
          dist.demographics[UF_DEMOGRAPHIC_KEY] &&
          dist.demographics[UF_DEMOGRAPHIC_KEY].length > 0,
      )
    })

    console.log("Rodadas com dados de mapa:", roundsWithMapData.length)

    // Generate availableDemographics from demographicFields
    const demographics = (data.demographicFields || []).map((field) => {
      return { key: field, label: field, values: [] }
    })

    return {
      questionInfo: data.questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: demographics,
      mapRoundsWithData: roundsWithMapData,
    }
  }, [data])

  // Update range when data changes
  useEffect(() => {
    if (allHistoricalData.length > 0) {
      const maxIndex = Math.max(0, allHistoricalData.length - 1)
      setChartRangeStart(0)
      setChartRangeEnd(Math.min(9, maxIndex))
      console.log(`Configurando range do gráfico: ${0} a ${Math.min(9, maxIndex)}`)
    }
  }, [allHistoricalData])

  // Update selected map round index
  useEffect(() => {
    if (mapRoundsWithData.length > 0) {
      setSelectedMapRoundIndex(0)
      console.log("Selecionando rodada mais recente para o mapa")
    }
  }, [mapRoundsWithData])

  const selectedChartData = useMemo(() => {
    if (!allHistoricalData.length) return []
    return allHistoricalData.slice(chartRangeStart, chartRangeEnd + 1)
  }, [allHistoricalData, chartRangeStart, chartRangeEnd])

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
          // Create individual response entries for each count
          for (let i = 0; i < ufDemo.count; i++) {
            mapResponses.push({
              [questionInfo.variable]: responseValue,
              UF: ufDemo.response, // This is the state name from API
            })
          }
        })
      }
    })

    console.log("Dados do mapa processados:", mapResponses.length, "respostas")
    return mapResponses
  }, [mapRoundsWithData, selectedMapRoundIndex, questionInfo])

  const chartData = useMemo(() => {
    if (!selectedChartData || selectedChartData.length === 0) return []

    const allPeriods = [...new Set(selectedChartData.map((d) => d.period))].filter(Boolean)
    allPeriods.sort((a, b) => {
      const [yearA, roundA] = a.split("-R").map(Number)
      const [yearB, roundB] = b.split("-R").map(Number)
      if (yearA !== yearB) return yearA - yearB
      return roundA - roundB
    })

    if (allPeriods.length === 0) return []

    const dataByPeriod = new Map(selectedChartData.map((d) => [d.period, d]))

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
      data: allPeriods
        .map((period) => {
          const rodada = dataByPeriod.get(period)
          let yValue = 0

          if (rodada && rodada.totalResponses > 0) {
            let count = 0
            if (useGrouping) {
              rodada.distribution.forEach((dist) => {
                if (groupResponses(dist.response) === seriesId) {
                  count += dist.count
                }
              })
            } else {
              const dist = rodada.distribution.find((d) => d.response === seriesId)
              if (dist) {
                count = dist.count
              }
            }
            yValue = (count / rodada.totalResponses) * 100
          }

          return {
            x: period,
            y: Number.isFinite(yValue) ? yValue : 0,
          }
        })
        .filter((point) => point.x && point.x !== ""),
    }))

    const sortedSeries = series.sort((a, b) => {
      const indexA = responseOrder.indexOf(a.id)
      const indexB = responseOrder.indexOf(b.id)
      if (indexA > -1 && indexB > -1) return indexA - indexB
      if (indexA > -1) return -1
      if (indexB > -1) return 1
      return a.id.localeCompare(b.id)
    })

    console.log("Dados do gráfico processados:", sortedSeries.length, "séries")
    return sortedSeries.filter((serie) => serie.data && serie.data.length > 0)
  }, [selectedChartData])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      if (newFilters[key] === value) {
        delete newFilters[key]
      } else {
        newFilters[key] = value
      }
      return newFilters
    })
  }

  // Enhanced loading state with progress indication
  if (status === "loading") {
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

  if (status === "error") {
    const isTimeout = error?.code === "ECONNABORTED" || error?.message?.includes("timeout")

    return (
      <Box className="error-container">
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>
          {isTimeout ? "Timeout na Requisição" : "Erro ao carregar dados"}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {isTimeout
            ? "A resposta da API está demorando mais que o esperado. Isso pode acontecer com grandes volumes de dados."
            : `Erro: ${error.message}`}
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
        onFilterChange={() => {}}
        onClearFilters={() => setFilters({})}
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
          {/* Left Column - Chart */}
          <div className="chart-card">
            <div className="chart-card-content">
              <Typography className="card-title-custom">
                {questionInfo?.label || questionInfo?.questionText || "Análise Temporal"}
              </Typography>

              {allHistoricalData.length > 1 && (
                <Box sx={{ mb: 3, px: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                    Período: {allHistoricalData[chartRangeEnd]?.period || "N/A"} até{" "}
                    {allHistoricalData[chartRangeStart]?.period || "N/A"}
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
                        width: `${((chartRangeEnd - chartRangeStart) / Math.max(1, allHistoricalData.length - 1)) * 100}%`,
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
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: "100%",
                        height: "40px",
                        background: "transparent",
                        outline: "none",
                        cursor: "pointer",
                        zIndex: 2,
                      }}
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
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: "100%",
                        height: "40px",
                        background: "transparent",
                        outline: "none",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Mais recente
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mais antiga
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
                      Nenhum dado disponível para o período selecionado
                    </Typography>
                  </Box>
                )}
              </div>

              {isFetching && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 1 }}>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Atualizando dados...
                  </Typography>
                </Box>
              )}
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="map-card">
            <div className="map-card-content">
              <Typography className="card-title-custom">Mapa Interativo do Brasil</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visualização geográfica das respostas por estado
              </Typography>

              {mapRoundsWithData.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Rodada: {mapRoundsWithData[selectedMapRoundIndex]?.period || "N/A"}
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
              <DemographicFilters
                availableDemographics={availableDemographics}
                onFilterChange={handleFilterChange}
                activeFilters={filters}
              />
              <Typography variant="caption" color="text.secondary" align="center" component="p" sx={{ mt: 2 }}>
                Clique em um estado para filtrar | Passe o mouse para detalhes
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </Box>
  )
}
