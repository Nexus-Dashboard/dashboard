"use client"

import { useState, useMemo, useRef, useCallback } from "react"
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

  const questionCode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("question")
  }, [location.search])

  const {
    data: apiData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["questionData", questionCode],
    queryFn: () => ApiBase.get(`/api/data/question/${questionCode}/responses`).then((res) => res.data),
    enabled: !!questionCode, // A query só roda se houver um questionCode
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
      allFlatResponses: apiData.rawResponses || [], // Assumindo que a API retorna os dados brutos para o mapa
      availableDemographics: apiData.availableDemographics || [],
    }
  }, [apiData])

  const calculateChartData = useCallback(() => {
    if (!historicalData || historicalData.length === 0) return []

    const allActualResponses = new Set()
    historicalData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => allActualResponses.add(dist.response))
    })

    const useGrouping = shouldGroupResponses(Array.from(allActualResponses))
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
    const seriesMap = new Map()

    historicalData.forEach((rodada) => {
      // Aplicar filtros aqui se necessário
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
  }, [historicalData, filters, selectedState]) // Adicionar dependências de filtros

  const dashboardStats = useMemo(() => {
    // Lógica para calcular estatísticas com base em 'allFlatResponses'
    const filteredFlatResponses = allFlatResponses.filter((response) => {
      const passesDemo =
        Object.keys(filters).length === 0 ||
        Object.entries(filters).every(([key, values]) => !values.length || values.includes(response[key]))
      const passesState = !selectedState || response.UF === selectedState
      return passesDemo && passesState
    })

    return {
      totalRespondents: filteredFlatResponses.reduce((sum, r) => sum + extractWeight(r), 0),
      totalSurveys: new Set(historicalData.map((h) => h.period)).size,
      totalQuestions: 1, // Agora estamos vendo uma pergunta de cada vez
      activeFilters:
        Object.values(filters).reduce((count, values) => count + values.length, 0) + (selectedState ? 1 : 0),
    }
  }, [allFlatResponses, filters, selectedState, historicalData])

  const chartData = useMemo(() => {
    return calculateChartData()
  }, [calculateChartData])

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
        availableDemographics={[]} // This needs to be adapted if filters are to be used
        filters={{}}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
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
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 1 }}>
                <Typography variant="body1" fontWeight="medium" color="secondary.dark">
                  {questionInfo?.label || "Carregando pergunta..."}
                </Typography>
              </Box>
              <Box ref={chartRef} sx={{ height: 450 }}>
                <ResponsiveLine
                  data={chartData}
                  margin={{ top: 20, right: 110, bottom: 60, left: 60 }}
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
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -30,
                    legend: "Período",
                    legendOffset: 50,
                    legendPosition: "middle",
                  }}
                  axisLeft={{
                    orient: "left",
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
                      effects: [
                        {
                          on: "hover",
                          style: {
                            itemBackground: "rgba(0, 0, 0, .03)",
                            itemOpacity: 1,
                          },
                        },
                      ],
                    },
                  ]}
                />
              </Box>
            </Paper>
            <Paper elevation={3} sx={{ p: 2, mt: 2, borderRadius: 2 }}>
              <Button startIcon={<Assessment />}>Análise Demográfica</Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Mapa Interativo do Brasil
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visualização geográfica das respostas por estado
              </Typography>
              <InteractiveBrazilMap
                responses={allFlatResponses} // Passar os dados brutos
                selectedQuestion={questionInfo} // Passar as informações da pergunta
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
