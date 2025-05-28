"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import MenuIcon from "@mui/icons-material/Menu"
import { alpha } from "@mui/material/styles"
import OffcanvasNavigation from "../components/OffcanvasNavigation"
import DateRangeFilter from "../components/DateRangeFilter"
import ExportButtons from "../components/ExportButtons"
import InteractiveBrazilMap from "../components/InteractiveBrazilMap"
import {
  normalizeAnswer,
  getResponseColor,
  RESPONSE_ORDER,
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  GROUPED_RESPONSE_ORDER,
} from "../utils/chartUtils"

// Constantes
const DEFAULT_QUESTION_KEY = "P1"

// Função para detectar e extrair o peso de um objeto resposta
const extractWeight = (response) => {
  const weightKey = Object.keys(response).find((key) => key.includes("weights"))
  if (weightKey && response[weightKey]) {
    return Number.parseFloat(response[weightKey]) || 1
  }
  return 1
}

export default function EnhancedDashboard() {
  const theme = useTheme()
  const chartRef = useRef(null)

  // Estados
  const [surveyId, setSurveyId] = useState("")
  const [questionKey, setQuestionKey] = useState(DEFAULT_QUESTION_KEY)
  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [dateRange, setDateRange] = useState(null)
  const [selectedState, setSelectedState] = useState(null)
  const [availableDemographics, setAvailableDemographics] = useState([])

  // Busca lista de surveys
  const {
    data: surveys = [],
    isLoading: sLoading,
    refetch: refetchSurveys,
  } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => ApiBase.get("/api/surveys").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Busca todas as respostas
  const {
    data: allResponses = {},
    isLoading: rLoading,
    refetch: refetchResponses,
  } = useQuery({
    queryKey: ["all-responses"],
    queryFn: async () => {
      if (!surveys.length) return {}
      const responsesMap = {}
      for (const survey of surveys) {
        const flat = await ApiBase.get(`/api/responsesFlat/${survey._id}`).then((r) => r.data)
        responsesMap[survey._id] = flat
      }
      return responsesMap
    },
    enabled: Boolean(surveys.length),
    staleTime: 5 * 60 * 1000,
  })

  // Efeito para selecionar o questionKey padrão e primeiro survey
  useEffect(() => {
    if (surveys.length && !surveyId) {
      setSurveyId(surveys[0]._id)
      setQuestionKey(DEFAULT_QUESTION_KEY)
    }
  }, [surveys, surveyId])

  // Efeito para identificar perguntas demográficas disponíveis
  useEffect(() => {
    if (surveys.length && Object.keys(allResponses).length) {
      const demographicKeys = new Set()

      surveys.forEach((survey) => {
        const variables = survey.variables || []
        variables.forEach((variable) => {
          if (variable.key.startsWith("PF") && /^\d+$/.test(variable.key.substring(2))) {
            demographicKeys.add(variable.key)
          }
        })
      })

      const demographics = []

      demographicKeys.forEach((key) => {
        const uniqueValues = new Set()
        const surveyWithVar = surveys.find((s) => (s.variables || []).some((v) => v.key === key))

        if (surveyWithVar) {
          const variable = surveyWithVar.variables.find((v) => v.key === key)

          Object.values(allResponses).forEach((responses) => {
            responses.forEach((response) => {
              if (response[key]) {
                uniqueValues.add(response[key])
              }
            })
          })

          if (uniqueValues.size > 0) {
            demographics.push({
              key,
              label: variable?.label || key,
              values: Array.from(uniqueValues).sort(),
            })
          }
        }
      })

      setAvailableDemographics(demographics)
    }
  }, [surveys, allResponses])

  // Extrai todas as perguntas disponíveis
  const availableQuestions = useMemo(() => {
    if (!surveys.length) return []

    const sets = surveys.map((s) => new Set((s.variables || []).map((v) => v.key).filter((key) => /^P\d+/.test(key))))

    const commonKeys = [...sets[0]].filter((key) => sets.every((st) => st.has(key)))

    return commonKeys
      .map((key) => {
        for (const s of surveys) {
          const v = (s.variables || []).find((x) => x.key === key)
          if (v) return v
        }
      })
      .filter(Boolean)
  }, [surveys])

  // Encontra a pergunta selecionada
  const selectedQuestion = useMemo(() => {
    return availableQuestions.find((q) => q.key === questionKey) || {}
  }, [availableQuestions, questionKey])

  // Função para lidar com mudanças nos filtros
  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prev) => {
      const currentValues = prev[demographicKey] || []

      if (checked) {
        return {
          ...prev,
          [demographicKey]: [...currentValues, value],
        }
      } else {
        return {
          ...prev,
          [demographicKey]: currentValues.filter((v) => v !== value),
        }
      }
    })
  }

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setFilters({})
  }

  // Função para lidar com mudanças no filtro de data
  const handleDateRangeChange = (range) => {
    setDateRange(range)
  }

  // Função para lidar com clique no estado
  const handleStateClick = (stateName) => {
    setSelectedState(stateName)
  }

  // Função para calcular os dados do gráfico
  const calculateChartData = useCallback(() => {
    if (!surveys.length || !allResponses || !Object.keys(allResponses).length) return []

    // Filtrar surveys válidos
    const validSurveys = surveys.filter((survey) =>
      (survey.variables || []).some((v) => v.key === questionKey && v.label === selectedQuestion.label),
    )
    if (!validSurveys.length) return []

    // Aplicar filtro de data
    let filteredSurveys = validSurveys
    if (dateRange) {
      filteredSurveys = validSurveys.filter((survey) => {
        const month = survey.month || ""
        const year = survey.year || ""
        if (month && year) {
          const monthMap = {
            Janeiro: "01",
            Fevereiro: "02",
            Março: "03",
            Abril: "04",
            Maio: "05",
            Junho: "06",
            Julho: "07",
            Agosto: "08",
            Setembro: "09",
            Outubro: "10",
            Novembro: "11",
            Dezembro: "12",
          }
          const monthNum = monthMap[month] || "01"
          const surveyDate = `${year}-${monthNum}-01`
          return surveyDate >= dateRange.start && surveyDate <= dateRange.end
        }
        return true
      })
    }

    // Ordenação de surveys por data
    const orderedSurveys = [...filteredSurveys].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      const monthOrder = {
        Janeiro: 1,
        Fevereiro: 2,
        Março: 3,
        Abril: 4,
        Maio: 5,
        Junho: 6,
        Julho: 7,
        Agosto: 8,
        Setembro: 9,
        Outubro: 10,
        Novembro: 11,
        Dezembro: 12,
      }
      return (monthOrder[a.month] || 0) - (monthOrder[b.month] || 0)
    })

    // Coletar todas as respostas para determinar se deve agrupar
    const allActualResponses = new Set()
    orderedSurveys.forEach((survey) => {
      ;(allResponses[survey._id] || []).forEach((resp) => {
        const answer = normalizeAnswer(resp[questionKey])
        if (answer) {
          allActualResponses.add(answer)
        }
      })
    })

    // Verificar se deve usar agrupamento
    const useGrouping = shouldGroupResponses(Array.from(allActualResponses))

    // Determinar respostas finais (agrupadas ou não)
    const finalResponses = new Set()
    if (useGrouping) {
      Array.from(allActualResponses).forEach((response) => {
        finalResponses.add(groupResponses(response))
      })
    } else {
      allActualResponses.forEach((response) => finalResponses.add(response))
    }

    // Preparar estrutura para os dados do gráfico
    const chartData = []

    // Para cada resposta possível, criar uma série
    Array.from(finalResponses).forEach((responseValue) => {
      const series = {
        id: responseValue,
        color: useGrouping
          ? groupedResponseColorMap[responseValue] || getResponseColor(responseValue)
          : getResponseColor(responseValue),
        data: [],
      }

      // Para cada pesquisa, calcular a porcentagem desta resposta
      orderedSurveys.forEach((survey) => {
        const responses = allResponses[survey._id] || []
        const date = `${survey.month || ""} ${survey.year || ""}`.trim()

        // Aplicar filtros demográficos e de estado
        const filteredResponses = responses.filter((response) => {
          // Filtros demográficos
          const passesDemo =
            Object.keys(filters).length === 0 ||
            Object.entries(filters).every(([key, values]) => {
              if (!values.length) return true
              return values.includes(response[key])
            })

          // Filtro de estado
          const passesState = !selectedState || response.UF === selectedState

          return passesDemo && passesState
        })

        // Contar respostas e pesos
        let totalWeight = 0
        let responseWeight = 0

        filteredResponses.forEach((response) => {
          const weight = extractWeight(response)
          totalWeight += weight

          const normalizedAnswer = normalizeAnswer(response[questionKey])
          const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

          if (finalAnswer === responseValue) {
            responseWeight += weight
          }
        })

        // Calcular porcentagem
        const percentage = totalWeight > 0 ? (responseWeight / totalWeight) * 100 : 0

        series.data.push({
          x: date,
          y: Math.round(percentage * 10) / 10,
          exactValue: Math.round(percentage * 10) / 10,
        })
      })

      chartData.push(series)
    })

    // Ordenar as séries
    const orderToUse = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
    chartData.sort((a, b) => {
      const indexA = orderToUse.indexOf(a.id)
      const indexB = orderToUse.indexOf(b.id)

      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB
      }

      if (indexA >= 0) return -1
      if (indexB >= 0) return 1

      return a.id.localeCompare(b.id)
    })

    return chartData
  }, [surveys, allResponses, questionKey, selectedQuestion, filters, dateRange, selectedState])

  // Calcular estatísticas
  const dashboardStats = useMemo(() => {
    if (!allResponses || Object.keys(allResponses).length === 0) {
      return {
        totalRespondents: 0,
        totalSurveys: 0,
        totalQuestions: 0,
        activeFilters: 0,
        dateRange: null,
      }
    }

    // Combinar todas as respostas
    const allResponsesFlat = Object.values(allResponses).flat()

    // Aplicar filtros
    const filteredResponses = allResponsesFlat.filter((response) => {
      const passesDemo =
        Object.keys(filters).length === 0 ||
        Object.entries(filters).every(([key, values]) => {
          if (!values.length) return true
          return values.includes(response[key])
        })

      const passesState = !selectedState || response.UF === selectedState

      return passesDemo && passesState
    })

    const totalWeight = filteredResponses.reduce((sum, resp) => sum + extractWeight(resp), 0)

    return {
      totalRespondents: Math.round(totalWeight),
      totalSurveys: surveys.length,
      totalQuestions: availableQuestions.length,
      activeFilters: Object.values(filters).reduce((count, values) => count + values.length, 0),
      dateRange: dateRange ? `${dateRange.start} - ${dateRange.end}` : "Todos os períodos",
    }
  }, [allResponses, filters, selectedState, surveys.length, availableQuestions.length, dateRange])

  // Preparar dados do gráfico
  const chartData = useMemo(() => {
    return calculateChartData()
  }, [calculateChartData])

  // Loading state
  if (sLoading || (surveys.length > 0 && rLoading)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography ml={2} variant="h6" color="text.secondary">
          Carregando dashboard...
        </Typography>
      </Box>
    )
  }

  return (
    <>
      {/* Offcanvas Navigation */}
      <OffcanvasNavigation
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        availableDemographics={availableDemographics}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearAllFilters}
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header com menu */}
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            p: 3,
            mb: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton
                onClick={() => setShowOffcanvas(true)}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <MenuIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  Dashboard de Pesquisas
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                  Análise de tendências ao longo do tempo
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Atualizar dados">
              <IconButton
                onClick={() => {
                  refetchSurveys()
                  refetchResponses()
                }}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Cards de estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: "center", borderLeft: `4px solid ${theme.palette.info.main}` }}>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {dashboardStats.totalRespondents.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Entrevistados
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Todas as pesquisas
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{ p: 2, textAlign: "center", borderLeft: `4px solid ${theme.palette.success.main}` }}
            >
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {dashboardStats.totalSurveys}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pesquisas Realizadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Novembro 2024 - Jul 2025
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{ p: 2, textAlign: "center", borderLeft: `4px solid ${theme.palette.warning.main}` }}
            >
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {dashboardStats.totalQuestions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Perguntas Disponíveis
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Com histórico comparativo
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{ p: 2, textAlign: "center", borderLeft: `4px solid ${theme.palette.error.main}` }}
            >
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {dashboardStats.activeFilters}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filtros Ativos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Nenhum filtro aplicado
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filtro de data */}
        <DateRangeFilter surveys={surveys} onDateRangeChange={handleDateRangeChange} selectedRange={dateRange} />

        {/* Seleção de pergunta estilizada */}
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            p: 3,
            mb: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderLeft: `4px solid ${theme.palette.secondary.main}`,
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="secondary.main" sx={{ mb: 2 }}>
            Selecione uma pergunta:
          </Typography>

          <FormControl fullWidth variant="outlined">
            <InputLabel>Escolha uma pergunta</InputLabel>
            <Select
              value={questionKey}
              label="Escolha uma pergunta"
              onChange={(e) => setQuestionKey(e.target.value)}
              sx={{
                bgcolor: "background.paper",
                "& .MuiSelect-select": {
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 600,
                  },
                },
              }}
            >
              {availableQuestions.map((q) => (
                <MenuItem key={q.key} value={q.key} sx={{ whiteSpace: "normal", padding: "10px 16px" }}>
                  <Typography noWrap={false}>
                    <strong>{q.key}</strong> – {q.label}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedQuestion.label && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 1 }}>
              <Typography variant="body1" fontWeight="medium" color="secondary.dark">
                {selectedQuestion.label}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Gráfico principal */}
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            mb: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box
            sx={{
              px: 3,
              pt: 3,
              pb: 2,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(90deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.4)} 100%)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Evolução Temporal
            </Typography>
            <ExportButtons
              chartData={chartData}
              questionLabel={selectedQuestion.label || "Dashboard"}
              chartRef={chartRef}
            />
          </Box>

          <Box ref={chartRef} sx={{ height: 500, p: 3 }}>
            {chartData.length ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{
                  type: "linear",
                  min: 0,
                  max: 100,
                  stacked: false,
                  reverse: false,
                }}
                yFormat=" >-.1f"
                curve="monotoneX"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Pesquisa (Mês/Ano)",
                  legendOffset: 36,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Porcentagem (%)",
                  legendOffset: -40,
                  legendPosition: "middle",
                }}
                enableGridX={false}
                enableGridY={true}
                pointSize={10}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                pointLabelYOffset={-12}
                enablePointLabel={true}
                pointLabel={(d) => `${d.data.exactValue}%`}
                useMesh={true}
                legends={[
                  {
                    anchor: "right",
                    direction: "column",
                    justify: false,
                    translateX: 100,
                    translateY: 0,
                    itemsSpacing: 10,
                    itemDirection: "left-to-right",
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: "circle",
                    symbolBorderColor: "rgba(0, 0, 0, .5)",
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
                theme={{
                  axis: {
                    domain: {
                      line: {
                        stroke: theme.palette.text.secondary,
                        strokeWidth: 1,
                      },
                    },
                    ticks: {
                      line: {
                        stroke: theme.palette.text.secondary,
                        strokeWidth: 1,
                      },
                      text: {
                        fill: theme.palette.text.secondary,
                        fontSize: 11,
                      },
                    },
                    legend: {
                      text: {
                        fill: theme.palette.text.primary,
                        fontSize: 12,
                        fontWeight: 500,
                      },
                    },
                  },
                  grid: {
                    line: {
                      stroke: alpha(theme.palette.divider, 0.15),
                      strokeWidth: 1,
                    },
                  },
                  crosshair: {
                    line: {
                      stroke: theme.palette.primary.main,
                      strokeWidth: 1,
                      strokeOpacity: 0.35,
                    },
                  },
                  tooltip: {
                    container: {
                      background: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      fontSize: 12,
                      borderRadius: 4,
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                      padding: 12,
                    },
                  },
                }}
                motionConfig="gentle"
                sliceTooltip={({ slice }) => {
                  return (
                    <div
                      style={{
                        background: theme.palette.background.paper,
                        padding: "12px 16px",
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: "10px",
                          fontWeight: "bold",
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          paddingBottom: "6px",
                        }}
                      >
                        {slice.points[0].data.x}
                      </div>
                      {slice.points
                        .sort((a, b) => b.data.exactValue - a.data.exactValue)
                        .map((point) => (
                          <div
                            key={point.id}
                            style={{
                              padding: "4px 0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  backgroundColor: point.serieColor,
                                  marginRight: "8px",
                                  borderRadius: "50%",
                                }}
                              />
                              <div>{point.serieId}</div>
                            </div>
                            <div
                              style={{
                                marginLeft: "24px",
                                fontWeight: "bold",
                                color: point.serieColor,
                              }}
                            >
                              {point.data.exactValue}%
                            </div>
                          </div>
                        ))}
                    </div>
                  )
                }}
              />
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">
                  {Object.keys(allResponses).length === 0
                    ? "Nenhuma resposta disponível"
                    : "Selecione uma pergunta para visualizar os dados"}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Mapa do Brasil */}
        <InteractiveBrazilMap
          responses={Object.values(allResponses).flat()}
          selectedQuestion={selectedQuestion}
          onStateClick={handleStateClick}
          selectedState={selectedState}
          filters={filters}
        />
      </Container>
    </>
  )
}
