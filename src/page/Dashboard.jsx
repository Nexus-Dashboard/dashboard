"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
  IconButton,
  Button,
  Chip,
  alpha,
  Slider,
} from "@mui/material"
import { Download, PictureAsPdf, Assessment } from "@mui/icons-material"
import MenuIcon from "@mui/icons-material/Menu"
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

// Helper to get icons for demographic filters
const getDemographicIcon = (key) => {
  if (key.toLowerCase().includes("sexo") || key.toLowerCase().includes("pf1")) return "🚻"
  if (key.toLowerCase().includes("renda") || key.toLowerCase().includes("pf10")) return "💰"
  // Add more icons as needed
  return "👤"
}

export default function Dashboard() {
  const theme = useTheme()
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [selectedState, setSelectedState] = useState(null)
  const [timeRange, setTimeRange] = useState([0, 0])

  const questionCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("question")
  }, [location.search])

  const {
    data: apiData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["questionData", questionCode],
    queryFn: () => ApiBase.get(`/api/data/question/${questionCode}/responses`).then((res) => res.data),
    enabled: !!questionCode,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { questionInfo, historicalData, allFlatResponses, availableDemographics } = useMemo(() => {
    if (!apiData || !apiData.success) {
      return { questionInfo: null, historicalData: [], allFlatResponses: [], availableDemographics: [] }
    }
    // Sort historical data by period to ensure consistency
    const sortedHistoricalData = [...apiData.historicalData].sort((a, b) => {
      // Basic sort, assuming "Month Year" format. This might need improvement for complex date formats.
      return new Date(a.period) - new Date(b.period)
    })

    return {
      questionInfo: apiData.questionInfo,
      historicalData: sortedHistoricalData,
      allFlatResponses: apiData.rawResponses || [],
      availableDemographics: apiData.availableDemographics || [],
    }
  }, [apiData])

  // Effect to set the initial time range for the slider
  useEffect(() => {
    if (historicalData.length > 0) {
      const max = historicalData.length - 1
      const min = Math.max(0, max - 9) // Show last 10 by default
      setTimeRange([min, max])
    }
  }, [historicalData])

  const handleTimeRangeChange = (event, newValue) => {
    setTimeRange(newValue)
  }

  const visibleHistoricalData = useMemo(() => {
    if (!historicalData.length) return []
    return historicalData.slice(timeRange[0], timeRange[1] + 1)
  }, [historicalData, timeRange])

  const mapResponses = useMemo(() => {
    if (!allFlatResponses.length || !historicalData.length) return []
    const lastTenPeriods = historicalData.slice(-10).map((h) => h.period)
    const periodSet = new Set(lastTenPeriods)
    return allFlatResponses.filter((response) => periodSet.has(response.period))
  }, [allFlatResponses, historicalData])

  const calculateChartData = useCallback(
    (dataToProcess) => {
      if (!dataToProcess || dataToProcess.length === 0) return []

      const allActualResponses = new Set()
      dataToProcess.forEach((rodada) => {
        rodada.distribution.forEach((dist) => allActualResponses.add(dist.response))
      })

      const useGrouping = shouldGroupResponses(Array.from(allActualResponses))
      const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
      const seriesMap = new Map()

      dataToProcess.forEach((rodada) => {
        rodada.distribution.forEach((dist) => {
          const finalResponse = useGrouping ? groupResponses(dist.response) : dist.response
          if (!finalResponse) return

          if (!seriesMap.has(finalResponse)) {
            seriesMap.set(finalResponse, { id: finalResponse, data: [] })
          }
          seriesMap.get(finalResponse).data.push({
            x: rodada.period,
            y: Number.parseFloat(dist.percentage),
            exactValue: Number.parseFloat(dist.percentage),
          })
        })
      })

      return Array.from(seriesMap.values()).sort((a, b) => {
        const indexA = responseOrder.indexOf(a.id)
        const indexB = responseOrder.indexOf(b.id)
        if (indexA > -1 && indexB > -1) return indexA - indexB
        if (indexA > -1) return -1
        if (indexB > -1) return 1
        return a.id.localeCompare(b.id)
      })
    },
    [filters, selectedState],
  )

  const chartData = useMemo(() => {
    return calculateChartData(visibleHistoricalData)
  }, [calculateChartData, visibleHistoricalData])

  const allResponsesForGroupingCheck = useMemo(() => {
    const responses = new Set()
    historicalData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => responses.add(dist.response))
    })
    return Array.from(responses)
  }, [historicalData])

  if (!questionCode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h5" color="text.secondary">
          Por favor, selecione uma pergunta para visualizar o dashboard.
        </Typography>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography ml={2} variant="h6" color="text.secondary">
          Carregando dados da pergunta...
        </Typography>
      </Box>
    )
  }

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h5" color="error">
          Erro ao carregar dados: {error.message}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ backgroundColor: "#f4f6f8", minHeight: "100vh" }}>
      <OffcanvasNavigation
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        availableDemographics={availableDemographics}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={() => setFilters({})}
      />
      <Paper
        square
        elevation={2}
        sx={{
          p: 2,
          backgroundColor: "grey.900",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton color="inherit" onClick={() => setShowOffcanvas(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
            {questionInfo?.questionText || "Dashboard"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" color="inherit" startIcon={<Download />}>
            Exportar CSV
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<PictureAsPdf />}>
            Exportar PDF
          </Button>
        </Box>
      </Paper>

      <Container maxWidth={false} sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Box sx={{ p: 1, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 1, mb: 2 }}>
                <Typography variant="body1" fontWeight="medium" color="secondary.dark">
                  Evolução Temporal
                </Typography>
              </Box>
              <Box ref={chartRef} sx={{ height: 400 }}>
                <ResponsiveLine
                  data={chartData}
                  margin={{ top: 10, right: 110, bottom: 50, left: 40 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                    stacked: false,
                    reverse: false,
                  }}
                  yFormat=" >-.1f"
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Período",
                    legendOffset: 36,
                    legendPosition: "middle",
                    format: () => "", // Hide labels to avoid clutter
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: " (%)",
                    legendOffset: -35,
                    legendPosition: "middle",
                  }}
                  pointSize={8}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  pointLabelYOffset={-12}
                  useMesh={true}
                  colors={(d) =>
                    shouldGroupResponses(allResponsesForGroupingCheck)
                      ? groupedResponseColorMap[d.id]
                      : getResponseColor(d.id)
                  }
                  legends={[
                    {
                      anchor: "bottom-right",
                      direction: "column",
                      justify: false,
                      translateX: 100,
                      translateY: 0,
                      itemsSpacing: 2,
                      itemDirection: "left-to-right",
                      itemWidth: 80,
                      itemHeight: 20,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: "circle",
                    },
                  ]}
                />
              </Box>
              {historicalData.length > 1 && (
                <Box sx={{ px: 3, mt: 2 }}>
                  <Typography gutterBottom variant="caption">
                    Controle de Período
                  </Typography>
                  <Slider
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    valueLabelDisplay="auto"
                    min={0}
                    max={historicalData.length - 1}
                    valueLabelFormat={(value) => historicalData[value]?.period}
                    sx={{
                      "& .MuiSlider-thumb": {
                        color: theme.palette.secondary.main,
                      },
                      "& .MuiSlider-track": {
                        color: theme.palette.secondary.light,
                      },
                      "& .MuiSlider-rail": {
                        color: alpha(theme.palette.secondary.light, 0.5),
                      },
                    }}
                  />
                </Box>
              )}
              <Button fullWidth startIcon={<Assessment />} sx={{ mt: 2 }}>
                Análise Demográfica
              </Button>
            </Paper>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Mapa Interativo do Brasil
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visualização geográfica das respostas por estado (últimas 10 rodadas)
              </Typography>
              <InteractiveBrazilMap
                responses={mapResponses}
                selectedQuestion={questionInfo}
                onStateClick={setSelectedState}
                selectedState={selectedState}
                filters={filters}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Filtros Demográficos
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {availableDemographics.map((demo) =>
                    demo.values.map((value) => (
                      <Chip
                        key={`${demo.key}-${value}`}
                        icon={<span>{getDemographicIcon(demo.key)}</span>}
                        label={value}
                        onClick={() => {
                          /* Filter logic to be implemented */
                        }}
                        variant="outlined"
                      />
                    )),
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

function extractWeight(r) {
  return 1
}
