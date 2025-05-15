"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { ResponsiveLine } from "@nivo/line"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"
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
  Chip,
  useTheme,
  IconButton,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Button,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import FilterListIcon from "@mui/icons-material/FilterList"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { alpha } from "@mui/material/styles"

// Constantes
const DEFAULT_QUESTION_KEY = "P1"

// Ordem fixa para as respostas
const RESPONSE_ORDER = [
  "Ótimo",
  "Bom",
  "Regular mais para positivo",
  "Regular",
  "Regular mais para negativo",
  "Ruim",
  "Péssimo",
  "Aprova",
  "Desaprova",
  "Não sabe",
  "Não respondeu",
]

// Função para detectar e extrair o peso de um objeto resposta
const extractWeight = (response) => {
  // Busca uma chave que contenha 'weights'
  const weightKey = Object.keys(response).find((key) => key.includes("weights"))
  if (weightKey && response[weightKey]) {
    return Number.parseFloat(response[weightKey]) || 1 // Valor padrão 1 se não puder ser convertido
  }
  return 1 // Padrão se não encontrar peso
}

// Mapas de cores para diferentes tipos de respostas - Cores padronizadas
const responseColorMap = {
  // Respostas positivas (cores frias)
  Ótimo: "#0088FE", // Azul forte
  Bom: "#00C49F", // Verde-água
  "Regular mais para positivo": "#4CAF50", // Verde

  // Respostas neutras
  Regular: "#FFBB28", // Amarelo

  // Respostas negativas (cores quentes)
  "Regular mais para negativo": "#FF9800", // Laranja
  Ruim: "#FF5722", // Laranja escuro
  Péssimo: "#F44336", // Vermelho

  // Outros
  "Não sabe": "#9E9E9E", // Cinza
  "Não respondeu": "#607D8B", // Azul acinzentado

  Aprova: "#3F51B5", // Azul índigo (positivo)
  Desaprova: "#E91E63", // Rosa (negativo)
}

// Função para obter cor com base na resposta
const getResponseColor = (response) => {
  return responseColorMap[response] || "#9c27b0" // Roxo para respostas não mapeadas
}

export default function EnhancedDashboard() {
  const theme = useTheme()

  // Estados
  const [surveyId, setSurveyId] = useState("")
  const [questionKey, setQuestionKey] = useState(DEFAULT_QUESTION_KEY)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({})
  const [availableDemographics, setAvailableDemographics] = useState([])

  // Busca lista de surveys
  const {
    data: surveys = [],
    isLoading: sLoading,
    refetch: refetchSurveys,
  } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => ApiBase.get("/api/surveys").then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Busca todas as respostas de todas as surveys
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
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Efeito para selecionar o questionKey padrão e primeiro survey quando carregado
  useEffect(() => {
    if (surveys.length && !surveyId) {
      setSurveyId(surveys[0]._id)
      setQuestionKey(DEFAULT_QUESTION_KEY)
    }
  }, [surveys, surveyId])

  // Efeito para identificar perguntas demográficas disponíveis
  useEffect(() => {
    if (surveys.length && Object.keys(allResponses).length) {
      // Identificar todas as perguntas demográficas (PFnn)
      const demographicKeys = new Set()

      surveys.forEach((survey) => {
        const variables = survey.variables || []
        variables.forEach((variable) => {
          if (variable.key.startsWith("PF") && /^\d+$/.test(variable.key.substring(2))) {
            demographicKeys.add(variable.key)
          }
        })
      })

      // Para cada pergunta demográfica, coletar valores únicos
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

  // Extrai todas as perguntas disponíveis (não demográficas),
  // mas só as que mantêm o mesmo label em **todas** as surveys que as têm:
  const availableQuestions = useMemo(() => {
    if (!surveys.length) return []

    // 1) Para cada survey, monta um Set só com keys /^P\d+/
    const sets = surveys.map(
      (s) =>
        new Set(
          (s.variables || [])
            .map((v) => v.key)
            .filter((key) => /^P\d+/.test(key)), // só P1, P2, P12#1 etc.
        ),
    )

    // 2) Interseção: pega só as keys que estão em todos os sets
    const commonKeys = [...sets[0]].filter((key) => sets.every((st) => st.has(key)))

    // 3) Monta array de { key,label,type } a partir da primeira survey que tiver
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

  // Função para calcular os dados do gráfico com base nas respostas
  const calculateChartData = useCallback(() => {
    if (!surveys.length || !allResponses || !Object.keys(allResponses).length) return []

    // Filtra apenas surveys que contêm a pergunta com o mesmo label
    const validSurveys = surveys.filter((survey) =>
      (survey.variables || []).some((v) => v.key === questionKey && v.label === selectedQuestion.label),
    )
    if (!validSurveys.length) return []

    const normalizeAnswer = (raw) => {
      const s = String(raw || "").trim()
      if (/^não sabe/i.test(s)) return "Não sabe"
      if (/^não respond/i.test(s)) return "Não respondeu"
      return s || "Não respondeu"
    }

    // Ordenação de surveys por data
    const orderedSurveys = [...validSurveys].sort((a, b) => {
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

    // Colete os valores distintos só de validSurveys:
    const allActualResponses = new Set()
    validSurveys.forEach((survey) => {
      ;(allResponses[survey._id] || []).forEach((resp) => {
        const answer = normalizeAnswer(resp[questionKey])
        if (answer) {
          allActualResponses.add(answer)
        }
      })
    })
    if (!allActualResponses.has("Não respondeu")) {
      allActualResponses.add("Não respondeu")
    }

    // Preparar estrutura para os dados do gráfico
    const chartData = []

    // Para cada resposta possível, criar uma série
    Array.from(allActualResponses).forEach((responseValue) => {
      const series = {
        id: responseValue,
        color: getResponseColor(responseValue),
        data: [],
      }

      // Para cada pesquisa, calcular a porcentagem desta resposta
      orderedSurveys.forEach((survey) => {
        const responses = allResponses[survey._id] || []
        const date = `${survey.month || ""} ${survey.year || ""}`.trim()

        // Aplicar filtros demográficos
        const filteredResponses = responses.filter((response) => {
          // Se não há filtros ativos, incluir todas as respostas
          if (Object.keys(filters).length === 0) return true

          // Verificar cada filtro demográfico
          return Object.entries(filters).every(([key, values]) => {
            // Se não há valores selecionados para este filtro, considerar como "não filtrado"
            if (!values.length) return true

            // Verificar se a resposta tem o valor do filtro
            return values.includes(response[key])
          })
        })

        // Contar respostas e pesos
        let totalWeight = 0
        let responseWeight = 0

        filteredResponses.forEach((response) => {
          const weight = extractWeight(response)
          totalWeight += weight

          if (normalizeAnswer(response[questionKey]) === responseValue) {
            responseWeight += weight
          }
        })

        // Calcular porcentagem com precisão
        const percentage = totalWeight > 0 ? (responseWeight / totalWeight) * 100 : 0

        // Adicionar ponto ao gráfico com valor exato (1 casa decimal)
        series.data.push({
          x: date,
          y: Math.round(percentage * 10) / 10, // Arredondar para 1 casa decimal
          exactValue: Math.round(percentage * 10) / 10, // Valor exato para exibição
        })
      })

      chartData.push(series)
    })

    // Ordenar as séries de acordo com a ordem fixa definida
    chartData.sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a.id)
      const indexB = RESPONSE_ORDER.indexOf(b.id)

      // Se ambos estão na lista de ordem, usar essa ordem
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB
      }

      // Se apenas um está na lista, priorizar o que está
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1

      // Se nenhum está na lista, manter a ordem alfabética
      return a.id.localeCompare(b.id)
    })

    return chartData
  }, [surveys, allResponses, questionKey, selectedQuestion, filters])

  // Calcular estatísticas demográficas
  const demographicStats = useMemo(() => {
    if (!allResponses || Object.keys(allResponses).length === 0)
      return {
        totalRespondents: 0,
        gender: [],
        ageGroups: [],
        marginOfError: 1.8, // Valor padrão para margem de erro
      }

    // Combinar todas as respostas
    const allResponsesFlat = Object.values(allResponses).flat()

    // Aplicar filtros demográficos
    const filteredResponses = allResponsesFlat.filter((response) => {
      // Se não há filtros ativos, incluir todas as respostas
      if (Object.keys(filters).length === 0) return true

      // Verificar cada filtro demográfico
      return Object.entries(filters).every(([key, values]) => {
        // Se não há valores selecionados para este filtro, considerar como "não filtrado"
        if (!values.length) return true

        // Verificar se a resposta tem o valor do filtro
        return values.includes(response[key])
      })
    })

    // Total de respondentes (considerando pesos)
    const totalWeight = filteredResponses.reduce((sum, resp) => sum + extractWeight(resp), 0)

    // Gênero (PF1 é tipicamente gênero)
    const genderData = {}
    filteredResponses.forEach((resp) => {
      const gender = resp.PF1 || "Não informado"
      const weight = extractWeight(resp)
      genderData[gender] = (genderData[gender] || 0) + weight
    })

    const genderChart = Object.entries(genderData).map(([gender, weight]) => ({
      id: gender,
      label: gender,
      value: Math.round((weight / totalWeight) * 1000) / 10,
      color: gender === "Masculino" ? "#3182CE" : gender === "Feminino" ? "#D53F8C" : "#718096",
    }))

    // Faixa etária (PF2_faixas é tipicamente faixa etária)
    const ageData = {}
    filteredResponses.forEach((resp) => {
      const age = resp.PF2_faixas || "Não informado"
      const weight = extractWeight(resp)
      ageData[age] = (ageData[age] || 0) + weight
    })

    // Ordenar faixas etárias
    const ageOrder = ["16-24", "25-34", "35-44", "45-59", "60+", "Não informado"]

    const ageChart = Object.entries(ageData)
      .sort((a, b) => {
        const indexA = ageOrder.indexOf(a[0])
        const indexB = ageOrder.indexOf(b[0])
        return indexA - indexB
      })
      .map(([age, weight]) => ({
        age,
        percentage: Math.round((weight / totalWeight) * 1000) / 10,
      }))

    return {
      totalRespondents: Math.round(totalWeight),
      gender: genderChart,
      ageGroups: ageChart,
      marginOfError: 1.8, // Valor típico para pesquisas
    }
  }, [allResponses, filters])

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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho com visual melhorado */}
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
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Dashboard de Pesquisas
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
              Análise interativa de dados de opinião pública
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Select para escolha da pergunta - TAMANHO FIXO */}
            <FormControl variant="outlined" sx={{ width: 300 }}>
              <InputLabel>Escolha uma pergunta</InputLabel>
              <Select
                value={questionKey}
                label="Escolha uma pergunta"
                onChange={(e) => setQuestionKey(e.target.value)}
                sx={{
                  width: "100%",
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
                      width: 500, // Largura fixa para o menu dropdown
                    },
                  },
                }}
              >
                {availableQuestions.map((q) => (
                  <MenuItem
                    key={q.key}
                    value={q.key}
                    sx={{
                      whiteSpace: "normal", // Permite quebra de linha no menu
                      padding: "10px 16px",
                    }}
                  >
                    <Typography noWrap={false}>
                      <strong>{q.key}</strong> – {q.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Botão de filtros */}
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderColor: showFilters ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.5),
                backgroundColor: showFilters ? alpha(theme.palette.primary.main, 0.1) : "transparent",
              }}
            >
              Filtros
            </Button>

            <Tooltip title="Atualizar dados">
              <IconButton
                onClick={() => {
                  refetchSurveys()
                  refetchResponses()
                }}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Painel de filtros demográficos */}
      {showFilters && (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="primary.dark">
              Filtros Demográficos
            </Typography>
            <Button
              variant="text"
              color="primary"
              onClick={clearAllFilters}
              disabled={Object.keys(filters).length === 0}
            >
              Limpar Filtros
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            {availableDemographics.map((demographic) => (
              <Grid item xs={12} md={6} lg={4} key={demographic.key}>
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    "&:before": { display: "none" },
                    borderRadius: 1,
                    mb: 1,
                    overflow: "hidden",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      "&.Mui-expanded": {
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      },
                    }}
                  >
                    <Typography fontWeight="medium">
                      {demographic.label}
                      {filters[demographic.key]?.length > 0 && (
                        <Chip
                          size="small"
                          label={filters[demographic.key].length}
                          color="primary"
                          sx={{ ml: 1, height: 20 }}
                        />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ maxHeight: 200, overflow: "auto", p: 1 }}>
                    <FormGroup>
                      {demographic.values.map((value) => (
                        <FormControlLabel
                          key={value}
                          control={
                            <Checkbox
                              size="small"
                              checked={(filters[demographic.key] || []).includes(value)}
                              onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                            />
                          }
                          label={<Typography variant="body2">{value}</Typography>}
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Pergunta em destaque */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.info.light, 0.1),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" fontWeight="bold" color="info.dark">
          {selectedQuestion.label || "Selecione uma pergunta para análise"}
        </Typography>

        {/* Indicador de filtros ativos */}
        {Object.keys(filters).length > 0 && (
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Filtros ativos:
            </Typography>
            {Object.entries(filters).map(([key, values]) => {
              if (values.length === 0) return null

              const demographic = availableDemographics.find((d) => d.key === key)
              return (
                <Chip
                  key={key}
                  size="small"
                  label={`${demographic?.label || key}: ${values.length} selecionado${values.length > 1 ? "s" : ""}`}
                  color="primary"
                  variant="outlined"
                  onDelete={() =>
                    setFilters((prev) => {
                      const newFilters = { ...prev }
                      delete newFilters[key]
                      return newFilters
                    })
                  }
                />
              )
            })}
          </Box>
        )}
      </Paper>

      {/* Gráfico principal redesenhado */}
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
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Evolução Temporal
          </Typography>
        </Box>

        <Box sx={{ height: 500, p: 3 }}>
          {chartData.length ? (
            <ResponsiveLine
              data={chartData}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{
                type: "linear",
                min: 0,
                max: 100, // Limitando o eixo Y a 100%
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
              pointLabel={(d) => `${d.data.exactValue}%`} // Usando o valor exato armazenado
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
                      .sort((a, b) => b.data.exactValue - a.data.exactValue) // Ordenar por valor decrescente
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

      {/* Cards de informações demográficas redesenhados */}
      <Grid
        container
        spacing={3}
        sx={{
          mb: 4,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: (theme) => theme.spacing(3),
        }}
      >
        {/* Card 1: Total de Respondentes */}
        <Grid item sx={{ display: "flex" }}>
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              height: 260, // altura fixa em px
              borderRadius: 2,
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-5px)",
              },
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
              Total de Respondentes
            </Typography>
            <Typography variant="h2" fontWeight="bold" color="primary.main" align="center" sx={{ my: 2 }}>
              {demographicStats.totalRespondents.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              pessoas entrevistadas
            </Typography>
          </Paper>
        </Grid>

        {/* Card 2: Distribuição por Sexo */}
        <Grid item sx={{ display: "flex" }}>
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              height: 260, // altura fixa em px
              borderRadius: 2,
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
              Distribuição por Sexo
            </Typography>
            <Box
              sx={{
                height: 160, // altura fixa para o gráfico
                width: "100%", // ocupa toda a largura do card
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              {demographicStats.gender.length > 0 ? (
                <React.Fragment>
                  <Box sx={{ height: "100%", width: "100%" }}>
                    <ResponsivePie
                      data={demographicStats.gender}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      innerRadius={0.6}
                      padAngle={0.5}
                      cornerRadius={3}
                      colors={{ datum: "data.color" }}
                      borderWidth={1}
                      borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
                      enableArcLinkLabels={false}
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor="#fff"
                      arcLabel={(d) => `${d.value}%`}
                      motionConfig="gentle"
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 1, gap: 2 }}>
                    {demographicStats.gender.map((item) => (
                      <Chip
                        key={item.id}
                        label={`${item.label}: ${item.value}%`}
                        sx={{
                          bgcolor: alpha(item.color, 0.1),
                          color: item.color,
                          border: `1px solid ${alpha(item.color, 0.3)}`,
                          fontWeight: "medium",
                        }}
                      />
                    ))}
                  </Box>
                </React.Fragment>
              ) : (
                <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">Dados não disponíveis</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Card 3: Distribuição por Faixa Etária */}
        <Grid item sx={{ display: "flex" }}>
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              height: 260, // altura fixa em px
              borderRadius: 2,
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-5px)",
              },
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
              Faixa Etária
            </Typography>
            <Box sx={{ height: 200 }}>
              {demographicStats.ageGroups.length > 0 ? (
                <ResponsiveBar
                  data={demographicStats.ageGroups}
                  keys={["percentage"]}
                  indexBy="age"
                  margin={{ top: 10, right: 10, bottom: 30, left: 35 }}
                  padding={0.3}
                  valueScale={{ type: "linear" }}
                  indexScale={{ type: "band", round: true }}
                  colors={["#3182CE"]}
                  borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 5,
                    tickRotation: -45,
                    fontSize: 10,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: 5,
                    format: (v) => `${v}%`,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#ffffff"
                  label={(d) => `${d.value}%`}
                  role="application"
                  barAriaLabel={(e) => e.id + ": " + e.formattedValue + " in age: " + e.indexValue}
                />
              ) : (
                <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">Dados não disponíveis</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Card 4: Margem de Erro */}
        <Grid item sx={{ display: "flex" }}>
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              height: 260, // altura fixa em px
              borderRadius: 2,
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-5px)",
              },
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
              Margem de Erro
            </Typography>
            <Typography variant="h2" fontWeight="bold" color="warning.main" align="center" sx={{ my: 2 }}>
              ±{demographicStats.marginOfError}%
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Intervalo de confiança de 95%
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
