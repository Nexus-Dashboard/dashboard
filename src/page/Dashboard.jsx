"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useInfiniteQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import { Box, Typography, CircularProgress, IconButton, Button } from "@mui/material"
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

const fetchQuestionData = async ({ queryKey, pageParam = 1 }) => {
  const [, questionCode] = queryKey
  const { data } = await ApiBase.get(`/api/data/question/${questionCode}/responses?page=${pageParam}&limit=5`)
  return data
}

export default function Dashboard() {
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [chartRangeStart, setChartRangeStart] = useState(0) // Start from most recent
  const [chartRangeEnd, setChartRangeEnd] = useState(9) // Show last 10 rounds
  const [selectedMapRoundIndex, setSelectedMapRoundIndex] = useState(0) // Most recent round

  const questionCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("question")
  }, [location.search])

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ["questionData", questionCode],
    queryFn: fetchQuestionData,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNextPage) {
        return lastPage.pagination.currentPage + 1
      }
      return undefined
    },
    enabled: !!questionCode,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

  // Auto-fetch remaining pages in background after first page loads
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && data?.pages?.length >= 1) {
      const timer = setTimeout(() => {
        fetchNextPage()
      }, 100) // Small delay to not block UI
      return () => clearTimeout(timer)
    }
  }, [hasNextPage, fetchNextPage, isFetchingNextPage, data?.pages?.length])

  const { questionInfo, allHistoricalData, availableDemographics, mapRoundsWithData } = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) {
      return { questionInfo: null, allHistoricalData: [], availableDemographics: [], mapRoundsWithData: [] }
    }

    // Properly append all historical data from all pages
    const allHistoricalData = []
    data.pages.forEach((page) => {
      if (page.historicalData && Array.isArray(page.historicalData)) {
        allHistoricalData.push(...page.historicalData)
      }
    })

    const firstPage = data.pages[0]

    // Sort all rounds by period (most recent first)
    const sortedRounds = [...allHistoricalData].sort((a, b) => {
      const [yearA, roundA] = a.period.split("-R").map(Number)
      const [yearB, roundB] = b.period.split("-R").map(Number)
      if (yearA !== yearB) return yearB - yearA // Most recent first
      return roundB - roundA
    })

    // Filter rounds that have UF data for the map
    const roundsWithMapData = sortedRounds.filter((round) => {
      return round.distribution.some(
        (dist) => dist.demographics && dist.demographics.UF && dist.demographics.UF.length > 0,
      )
    })

    return {
      questionInfo: firstPage.questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: firstPage.availableDemographics || [],
      mapRoundsWithData: roundsWithMapData,
    }
  }, [data])

  // Update range when data changes - start from most recent
  useEffect(() => {
    if (allHistoricalData.length > 0) {
      const maxIndex = Math.max(0, allHistoricalData.length - 1)
      setChartRangeStart(0) // Start from most recent (index 0)
      setChartRangeEnd(Math.min(9, maxIndex)) // Show up to 10 rounds or all available
    }
  }, [allHistoricalData])

  // Update selected map round index - always start with most recent
  useEffect(() => {
    if (mapRoundsWithData.length > 0) {
      setSelectedMapRoundIndex(0) // Most recent round with data
    }
  }, [mapRoundsWithData])

  // Get the selected rounds for the chart (slice from sorted array)
  const selectedChartData = useMemo(() => {
    if (!allHistoricalData.length) return []
    return allHistoricalData.slice(chartRangeStart, chartRangeEnd + 1)
  }, [allHistoricalData, chartRangeStart, chartRangeEnd])

  // Extract map data for the selected round
  const mapData = useMemo(() => {
    if (!mapRoundsWithData.length || selectedMapRoundIndex >= mapRoundsWithData.length) {
      return []
    }

    const selectedRound = mapRoundsWithData[selectedMapRoundIndex]
    const mapResponses = []

    if (selectedRound && questionInfo) {
      // Process each response type in the distribution
      selectedRound.distribution.forEach((dist) => {
        const responseValue = dist.response

        // Get UF demographics for this response
        if (dist.demographics && dist.demographics.UF) {
          dist.demographics.UF.forEach((ufDemo) => {
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
    }

    return mapResponses
  }, [mapRoundsWithData, selectedMapRoundIndex, questionInfo])

  const chartData = useMemo(() => {
    if (!selectedChartData || selectedChartData.length === 0) return []

    // 1. Get all unique periods from the selected data and sort them chronologically
    const allPeriods = [...new Set(selectedChartData.map((d) => d.period))].filter(Boolean)
    allPeriods.sort((a, b) => {
      const [yearA, roundA] = a.split("-R").map(Number)
      const [yearB, roundB] = b.split("-R").map(Number)
      if (yearA !== yearB) return yearA - yearB // Chronological order for X-axis
      return roundA - roundB
    })

    if (allPeriods.length === 0) return []

    // 2. Create a lookup map for faster data access
    const dataByPeriod = new Map(selectedChartData.map((d) => [d.period, d]))

    // 3. Determine if responses should be grouped
    const allActualResponses = new Set(selectedChartData.flatMap((r) => r.distribution.map((d) => d.response)))
    const useGrouping = shouldGroupResponses(Array.from(allActualResponses))
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

    // 4. Identify all unique series IDs
    const allSeriesIds = new Set()
    selectedChartData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => {
        const finalResponse = useGrouping ? groupResponses(dist.response) : dist.response
        if (finalResponse) allSeriesIds.add(finalResponse)
      })
    })

    if (allSeriesIds.size === 0) return []

    // 5. Build the series data, ensuring every series has a point for every period
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

    // 6. Sort the final series array according to the CORRECT order (best to worst)
    const sortedSeries = series.sort((a, b) => {
      const indexA = responseOrder.indexOf(a.id)
      const indexB = responseOrder.indexOf(b.id)
      if (indexA > -1 && indexB > -1) return indexA - indexB
      if (indexA > -1) return -1
      if (indexB > -1) return 1
      return a.id.localeCompare(b.id)
    })

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

  // Show loading only for initial first page load
  if (status === "loading") {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          Carregando dados da pergunta...
        </Typography>
      </Box>
    )
  }

  if (status === "error") {
    return (
      <Box className="error-container">
        <Typography variant="h5" color="error">
          Erro ao carregar dados: {error.message}
        </Typography>
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

              {/* Chart Range Selection - Corrected Logic */}
              {allHistoricalData.length > 1 && (
                <Box sx={{ mb: 3, px: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                    Período: {allHistoricalData[chartRangeEnd]?.period || "N/A"} até{" "}
                    {allHistoricalData[chartRangeStart]?.period || "N/A"}
                  </Typography>

                  <Box sx={{ position: "relative", height: "40px", mb: 1 }}>
                    {/* Background track */}
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

                    {/* Active range */}
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

                    {/* Start handle slider (most recent) */}
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, allHistoricalData.length - 1)}
                      value={chartRangeStart}
                      onChange={(e) => {
                        const newStart = Number.parseInt(e.target.value)
                        setChartRangeStart(newStart)
                        if (newStart > chartRangeEnd) {
                          setChartRangeEnd(newStart)
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

                    {/* End handle slider (oldest in selection) */}
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, allHistoricalData.length - 1)}
                      value={chartRangeEnd}
                      onChange={(e) => setChartRangeEnd(Number.parseInt(e.target.value))}
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
                    yScale={{ type: "linear", min: 0, max: 50 }}
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

              {/* Loading indicator for background fetching */}
              {isFetching && hasNextPage && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 1 }}>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Carregando mais dados...
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

              {/* Map Round Selection Slider - Only for rounds with data */}
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
                <InteractiveBrazilMap responses={mapData} selectedQuestion={questionInfo} onStateClick={() => {}} />
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
