"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { Box } from "@mui/material"
import OffcanvasNavigation from "../components/OffcanvasNavigation"
import DashboardHeader from "../components/DashboardHeader"
import {
  normalizeAnswer,
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
import { 
  STATES_BY_REGION, 
  getStatesFromRegion, 
  isStateInSelectedRegions 
} from "../utils/regionMapping"

const FULL_MONTH_TO_SHORT = {
  "Janeiro": "jan",
  "Fevereiro": "fev",
  "Março": "mar",
  "Abril": "abr",
  "Maio": "mai",
  "Junho": "jun",
  "Julho": "jul",
  "Agosto": "ago",
  "Setembro": "set",
  "Outubro": "out",
  "Novembro": "nov",
  "Dezembro": "dez"
}

const convertToShortFormat = (dateLabel) => {
  if (!dateLabel) return ""
  
  if (dateLabel.includes('/')) {
    const [month, year] = dateLabel.split('/')
    const shortMonth = FULL_MONTH_TO_SHORT[month] || month.substring(0, 3).toLowerCase()
    return `${shortMonth}./${year}`
  }
  
  return dateLabel
}

export const fetchGroupedQuestionData = async ({ queryKey }) => {
  const [, theme, questionText, surveyType] = queryKey

  try {
    const { data: groupedData } = await ApiBase.post(
      `/api/data/question/grouped/responses`,
      {
        theme: theme,
        questionText: questionText,
      },
      { params: { type: surveyType } },
    )

    if (!groupedData.success) {
      throw new Error("Erro ao buscar dados agrupados")
    }

    return groupedData
  } catch (error) {
    console.error("💥 Erro ao buscar dados agrupados:", error.message)
    throw error
  }
}

export const fetchAllQuestions = async ({ queryKey }) => {
  const [, surveyType] = queryKey

  try {
    const firstResponse = await ApiBase.get(`/api/data/questions/all?page=1&limit=50`)

    if (!firstResponse.data?.success) {
      throw new Error("API returned an error")
    }

    const { totalPages } = firstResponse.data.data.pagination

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

const UF_DEMOGRAPHIC_KEY = "UF"

export default function Dashboard() {
  const pageRef = useRef(null)
  const chartRef = useRef(null)
  const location = useLocation()

  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [filters, setFilters] = useState({})
  const [numberOfRoundsToShow, setNumberOfRoundsToShow] = useState(10)
  const [selectedMapRoundIndex, setSelectedMapRoundIndex] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
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
    enabled: !!theme && !!questionText && !!allQuestionsData,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const surveyDateMap = useMemo(() => {
    if (!allQuestionsData?.data?.questions) {
      return new Map()
    }

    const map = new Map()
    const questions = allQuestionsData.data.questions

    questions.forEach((q) => {
      if (q.surveyNumber && q.date) {
        const key = q.surveyNumber.toString()
        if (!map.has(key)) {
          const formattedDate = formatApiDateForDisplay(q.date)
          map.set(key, formattedDate)
        }
      }
    })

    return map
  }, [allQuestionsData])

  const formatChartXAxis = useCallback(
    (period, dateLabel) => {
      const roundNumber = period ? period.split("-R")[1] : ""

      if (dateLabel && roundNumber) {
        const shortDate = convertToShortFormat(dateLabel)
        return `R${roundNumber.padStart(2, "0")} - ${shortDate}`
      }

      if (period) {
        const parts = period.split("-R")
        if (parts.length === 2) {
          const year = parts[0]
          const round = parts[1]

          const dateFromMap = surveyDateMap.get(round)
          if (dateFromMap) {
            const shortDate = convertToShortFormat(dateFromMap)
            return `R${round.padStart(2, "0")} - ${shortDate}`
          }

          return `R${round.padStart(2, "0")}/${year.slice(-2)}`
        }
      }

      return period || ""
    },
    [surveyDateMap],
  )

  const { questionInfo, allHistoricalData, availableDemographics } = useMemo(() => {
    if (!data) {
      return { questionInfo: null, allHistoricalData: [], availableDemographics: [] }
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
      if (key !== UF_DEMOGRAPHIC_KEY && key !== "PF10" && key !== "REGIAO" && key !== "Regiao") {
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

    demographics.push({
      key: "REGIAO_VIRTUAL",
      label: "Região",
      values: Object.keys(STATES_BY_REGION).sort()
    });

    if (demographicsMap.has("PF2_FAIXAS")) {
      demographics = demographics.filter((d) => d.key !== "PF2" && d.key !== "Faixa de idade")
    }  

    // ... dentro do seu useMemo, depois da criação do array 'demographics'

  // Início do NOVO trecho de tratamento para PF13
  const pf13Index = demographics.findIndex((d) => d.key === "PF13");

  if (pf13Index > -1) {
    const pf13Data = demographics[pf13Index];
    const processedValues = new Set();
    let hasNonStandardValues = false;

    pf13Data.values.forEach((value) => {
      // A expressão regular /\((.*?)\)/ captura o texto dentro dos parênteses.
      const match = value.match(/\((.*?)\)/);

      if (match && match[1]) {
        // Se encontrou, adiciona o conteúdo capturado (match[1]) ao Set.
        processedValues.add(match[1]);
      } else {
        // Se não encontrou, marca que existe um valor não padrão.
        hasNonStandardValues = true;
      }
    });

    // Se encontramos valores não padrão (como #NULL!, Sim, Não), adicionamos a categoria NS/NR.
    if (hasNonStandardValues) {
      processedValues.add("NS/NR");
    }

    // Atualiza o array 'values' do PF13 com os valores processados e ordenados.
    demographics[pf13Index] = {
      ...pf13Data,
      values: Array.from(processedValues).sort((a, b) => {
        if (a === 'NS/NR') return 1; // Coloca NS/NR no final
        if (b === 'NS/NR') return -1;
        return a.localeCompare(b);
      }),
    };
  }
  // Fim do NOVO trecho
    return {
      questionInfo: questionInfo,
      allHistoricalData: sortedRounds,
      availableDemographics: demographics,
    }
  }, [data, questionText])

  const availableMapResponses = useMemo(() => {
    if (!allHistoricalData || allHistoricalData.length === 0) return []

    const allNormalizedAnswers = allHistoricalData.flatMap(
      (r) => r.distribution.map((d) => normalizeAndGroupNSNR(d.response)).filter((answer) => answer !== null),
    )

    const useGrouping = shouldGroupResponses(Array.from(allNormalizedAnswers))

    const allAnswers = new Set()
    allHistoricalData.forEach((round) => {
      round.distribution.forEach((dist) => {
        const answer = dist.response
        if (answer) {
          const normalizedAnswer = normalizeAndGroupNSNR(answer)

          if (normalizedAnswer === null) return

          const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

          if (finalAnswer !== null && finalAnswer !== undefined) {
            allAnswers.add(finalAnswer)
          }
        }
      })
    })

    const validAnswers = Array.from(allAnswers).filter((answer) => answer !== null && answer !== undefined)

    return sortMapResponses(validAnswers)
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

  const handlePeriodChange = (periodData) => {
    setSelectedPeriod(periodData)
  }

  const filteredHistoricalData = useMemo(() => {
    let filtered = allHistoricalData

    if (selectedPeriod) {
      if (selectedPeriod.type === "relative") {
        filtered = filtered.filter((round) => selectedPeriod.periods.includes(round.period))
      } else if (selectedPeriod.type === "specific") {
        filtered = filtered.filter((round) => round.period === selectedPeriod.period)
      }
    }

    if (Object.keys(filters).length === 0) {
      return filtered
    }

    return filtered.map((round) => {
      let totalForFilter = 0
      const distributionForFilter = {}

      round.distribution.forEach((dist) => {
        Object.entries(filters).forEach(([filterKey, filterValues]) => {
          if (filterValues && filterValues.length > 0) {
            
            if (filterKey === "REGIAO_VIRTUAL") {
              const ufDemoGroup = dist.demographics?.[UF_DEMOGRAPHIC_KEY] || dist.demographics?.["PF10"]
              if (ufDemoGroup) {
                ufDemoGroup.forEach((ufValue) => {
                  if (isStateInSelectedRegions(ufValue.response, filterValues)) {
                    totalForFilter += ufValue.weightedCount
                    distributionForFilter[dist.response] =
                      (distributionForFilter[dist.response] || 0) + ufValue.weightedCount
                  }
                })
              }
            } else {
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
            }
          }
        })
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

  const mapRoundsWithData = useMemo(() => {
    return filteredHistoricalData.filter((round) =>
      round.distribution.some(
        (dist) => dist.demographics?.[UF_DEMOGRAPHIC_KEY]?.length > 0 || dist.demographics?.["PF10"]?.length > 0,
      ),
    )
  }, [filteredHistoricalData])

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
      const normalizedResponse = normalizeAnswer(responseValue)
      if (normalizedResponse === null || dist.weightedCount === 0) return

      const ufDemographics = dist.demographics?.[UF_DEMOGRAPHIC_KEY] || dist.demographics?.["PF10"]
      if (!ufDemographics) return

      // Calcular o total de peso para estados que passam pelos filtros
      let totalFilteredWeight = 0
      const filteredUfData = []

      ufDemographics.forEach((ufDemo) => {
        let shouldInclude = true

        // Verificar filtro de região
        if (filters["REGIAO_VIRTUAL"] && filters["REGIAO_VIRTUAL"].length > 0) {
          if (!isStateInSelectedRegions(ufDemo.response, filters["REGIAO_VIRTUAL"])) {
            shouldInclude = false
          }
        }

        // Verificar outros filtros demográficos
        if (shouldInclude && Object.keys(filters).length > 0) {
          Object.entries(filters).forEach(([filterKey, filterValues]) => {
            if (filterKey !== "REGIAO_VIRTUAL" && filterValues && filterValues.length > 0) {
              // Para cada estado, verificar se tem dados demográficos que correspondem ao filtro
              const demoGroup = dist.demographics?.[filterKey]
              if (demoGroup) {
                const totalWeightForDemo = demoGroup.reduce((sum, d) => sum + d.weightedCount, 0)
                const matchingWeight = demoGroup
                  .filter(d => filterValues.includes(d.response))
                  .reduce((sum, d) => sum + d.weightedCount, 0)
                
                // Se não há correspondência neste filtro, excluir este estado
                if (matchingWeight === 0) {
                  shouldInclude = false
                }
              } else {
                shouldInclude = false
              }
            }
          })
        }

        if (shouldInclude) {
          filteredUfData.push({
            state: ufDemo.response,
            originalWeight: ufDemo.weightedCount
          })
          totalFilteredWeight += ufDemo.weightedCount
        }
      })

      // Se há estados que passaram pelos filtros, distribuir o weightedCount filtrado proporcionalmente
      if (filteredUfData.length > 0 && totalFilteredWeight > 0) {
        filteredUfData.forEach((ufData) => {
          // Calcular quantas respostas este estado deve ter baseado na proporção
          const proportion = ufData.originalWeight / totalFilteredWeight
          const responsesForState = Math.round(dist.weightedCount * proportion)

          for (let i = 0; i < responsesForState; i++) {
            mapResponses.push({
              [questionInfo.variable]: responseValue,
              UF: ufData.state,
            })
          }
        })
      }
    })
    
    return mapResponses
  }, [mapRoundsWithData, selectedMapRoundIndex, questionInfo, filters])

  const chartData = useMemo(() => {
    if (!selectedChartData || selectedChartData.length === 0) {
      return []
    }

    const dataByPeriod = new Map(selectedChartData.map((d) => [d.period, d]))
    const allPeriods = Array.from(dataByPeriod.keys())

    const allNormalizedResponses = selectedChartData.flatMap(
      (r) => r.distribution.map((d) => normalizeAndGroupNSNR(d.response)).filter((response) => response !== null),
    )
    const uniqueNormalizedResponses = new Set(allNormalizedResponses)

    const useGrouping = shouldGroupResponses(allNormalizedResponses)
    const responseOrder = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

    const allSeriesIds = new Set()
    selectedChartData.forEach((rodada) => {
      rodada.distribution.forEach((dist) => {
        const normalizedResponse = normalizeAndGroupNSNR(dist.response)

        if (normalizedResponse === null) {
          return
        }

        const finalResponse = useGrouping ? groupResponses(normalizedResponse) : normalizedResponse
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
          let totalValidResponses = 0

          rodada.distribution.forEach((dist) => {
            const normalizedResponse = normalizeAndGroupNSNR(dist.response)

            if (normalizedResponse === null) {
              return
            }

            totalValidResponses += dist.weightedCount

            const finalResponse = useGrouping ? groupResponses(normalizedResponse) : normalizedResponse

            if (finalResponse === seriesId) {
              weightedCount += dist.weightedCount
            }
          })

          if (totalValidResponses > 0) {
            yValue = (weightedCount / totalValidResponses) * 100
          }
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

    const uniqueSeries = new Map()
    series.forEach((serie) => {
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
  }, [selectedChartData, surveyDateMap, formatChartXAxis])

  const pageTitle = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("pageTitle")
  }, [location.search])

  const getCardPeriodLabel = useCallback(
    (rodada) => {
      if (!rodada || !surveyDateMap) return "N/A"

      const roundNumber = rodada.period.split("-R")[1]
      const dateLabel = surveyDateMap.get(roundNumber)

      if (dateLabel && roundNumber) {
        const shortDate = convertToShortFormat(dateLabel)
        return `R${roundNumber} - ${shortDate}`
      }

      const parts = rodada.period.split("-R")
      if (parts.length === 2) {
        const year = parts[0]
        const round = parts[1]
        return `R${round}/${year.slice(-2)}`
      }

      return rodada.period || "N/A"
    },
    [surveyDateMap],
  )

  const getXAxisLabel = (rodada) => {
    if (!rodada || !surveyDateMap) return "N/A"
    const roundNumber = rodada.period.split("-R")[1]
    const dateLabel = surveyDateMap.get(roundNumber)
    return formatChartXAxis(rodada.period, dateLabel)
  }

  if (isLoadingAllQuestions) {
    return <LoadingWithProgress loadingProgress={30} loadingStage="Carregando informações de datas..." />
  }

  if (status === "loading" || !data) {
    return <LoadingWithProgress loadingProgress={loadingProgress} loadingStage={loadingStage} />
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
        questionInfo={{ ...questionInfo, label: pageTitle || questionInfo?.label || questionInfo?.questionText }}
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
            getXAxisLabel={getCardPeriodLabel}
            availableMapResponses={availableMapResponses}
            selectedMapResponse={selectedMapResponse}
            onMapResponseChange={setSelectedMapResponse}
          />
        </div>
      </div>
    </Box>
  )
}