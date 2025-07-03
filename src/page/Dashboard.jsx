"use client"

import { useState, useMemo, useRef } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import { Box, Container, Grid, Paper, Typography, CircularProgress, IconButton, Button } from "@mui/material"
import { Download, PictureAsPdf, Assessment, Menu as MenuIcon } from "@mui/icons-material"
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
import "./dashboard.css"

export default function Dashboard() {
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})

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
    return {
      questionInfo: apiData.questionInfo,
      historicalData: apiData.historicalData,
      allFlatResponses: apiData.rawResponses || [],
      availableDemographics: apiData.availableDemographics || [],
    }
  }, [apiData])

  const latestResponses = useMemo(() => {
    if (!allFlatResponses.length || !historicalData.length) return []
    const latestPeriod = historicalData[historicalData.length - 1]?.period
    return allFlatResponses.filter((r) => r.period === latestPeriod)
  }, [allFlatResponses, historicalData])

  const filteredLatestResponses = useMemo(() => {
    if (Object.keys(filters).length === 0) return latestResponses

    return latestResponses.filter((response) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        return response[key] === value
      })
    })
  }, [latestResponses, filters])

  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return []

    const allActualResponses = new Set()
    historicalData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => allActualResponses.add(dist.response))
    })

    const useGrouping = shouldGroupResponses(Array.from(allActualResponses))
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
    const seriesMap = new Map()

    historicalData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => {
        const finalResponse = useGrouping ? groupResponses(dist.response) : dist.response
        if (!finalResponse) return

        if (!seriesMap.has(finalResponse)) {
          seriesMap.set(finalResponse, { id: finalResponse, data: [] })
        }
        seriesMap.get(finalResponse).data.push({
          x: rodada.period,
          y: Number.parseFloat(dist.percentage),
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
  }, [historicalData])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      if (newFilters[key] === value) {
        delete newFilters[key] // Toggle off
      } else {
        newFilters[key] = value // Set new filter
      }
      return newFilters
    })
  }

  if (!questionCode) {
    return (
      <Box className="loading-container">
        <Typography variant="h5" color="text.secondary">
          Por favor, selecione uma pergunta para visualizar o dashboard.
        </Typography>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box className="loading-container">
        <CircularProgress />
        <Typography ml={2} variant="h6" color="text.secondary">
          Carregando dados da pergunta...
        </Typography>
      </Box>
    )
  }

  if (isError) {
    return (
      <Box className="error-container">
        <Typography variant="h5" color="error">
          Erro ao carregar dados: {error.message}
        </Typography>
      </Box>
    )
  }

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
          <h2>{questionInfo?.questionText || "Dashboard"}</h2>
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

      <Container maxWidth={false} className="dashboard-content">
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={7}>
            <Paper className="chart-card" elevation={0}>
              <Box p={3}>
                <Typography className="card-title-custom">{questionInfo?.label}</Typography>
                <Box ref={chartRef} sx={{ height: 450 }}>
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
                    colors={(d) => (shouldGroupResponses([]) ? groupedResponseColorMap[d.id] : getResponseColor(d.id))}
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
                </Box>
                <Button variant="outlined" startIcon={<Assessment />} sx={{ mt: 2 }}>
                  Análise Demográfica
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} lg={5}>
            <Paper className="map-card" elevation={0}>
              <Box p={3}>
                <Typography className="card-title-custom">Mapa Interativo do Brasil</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Visualização geográfica das respostas por estado (rodada mais recente)
                </Typography>
                <InteractiveBrazilMap responses={filteredLatestResponses} selectedQuestion={questionInfo} />
                <DemographicFilters
                  availableDemographics={availableDemographics}
                  onFilterChange={handleFilterChange}
                  activeFilters={filters}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
