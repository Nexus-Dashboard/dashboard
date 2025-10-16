"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import { useQuery } from "@tanstack/react-query"
import { Box, Alert, AlertTitle } from "@mui/material"
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
// formatApiDateForDisplay não é mais necessário - as datas já vêm formatadas da API
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

// ❌ DEPRECATED: fetchAllQuestions não é mais necessário!
// A API agora retorna as datas das rodadas diretamente no historicalData
// Mantido comentado para referência histórica
/*
export const fetchAllQuestions = async ({ queryKey }) => {
  const [, surveyType] = queryKey

  try {
    console.log("📥 Iniciando carregamento de todas as questões...")
    const firstResponse = await ApiBase.get(`/api/data/questions/all?page=1&limit=50`)

    if (!firstResponse.data?.success) {
      throw new Error("API returned an error")
    }

    const { totalPages } = firstResponse.data.data.pagination
    console.log(`📊 Total de páginas a carregar: ${totalPages}`)

    let allQuestions = [...firstResponse.data.data.questions]

    if (totalPages > 1) {
      const promises = []
      for (let page = 2; page <= totalPages; page++) {
        promises.push(
          ApiBase.get(`/api/data/questions/all?page=${page}&limit=50`)
            .then((response) => {
              console.log(`✅ Página ${page}/${totalPages} carregada`)
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
    }

    console.log(`✅ Total de questões carregadas: ${allQuestions.length}`)

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
*/

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
  
  // NOVO: Estado para mapeamento PF13
  const [pf13ValueMapping, setPf13ValueMapping] = useState({})

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
    // OTIMIZADO: Não depende mais de allQuestionsData!
    enabled: !!theme && !!questionText,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // OTIMIZADO: surveyDateMap agora é criado a partir do historicalData da API
  // Isso elimina a necessidade de fazer múltiplas requisições para /api/data/questions/all
  const surveyDateMap = useMemo(() => {
    if (!data?.historicalData) {
      console.warn("⚠️ surveyDateMap: historicalData não está disponível ainda")
      return new Map()
    }

    const map = new Map()

    // Extrair rodadas e datas do historicalData que já vem na resposta da API
    data.historicalData.forEach((round) => {
      if (round.rodada && round.date) {
        const key = round.rodada.toString()
        map.set(key, round.date) // A data já vem formatada (ex: "jul./25")
      }
    })

    console.log(`✅ surveyDateMap criado com ${map.size} rodadas mapeadas a partir do historicalData`)
    return map
  }, [data])

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

          // ⚠️ FALLBACK: Se não encontrou a data no mapa, é um problema!
          console.warn(`⚠️ Data não encontrada para rodada ${round}. surveyDateMap tem ${surveyDateMap.size} entradas.`)
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

    // INÍCIO DO TRATAMENTO MELHORADO PARA PF13
    const pf13Index = demographics.findIndex((d) => d.key === "PF13");
    let localPf13Mapping = {};

    if (pf13Index > -1) {
      const pf13Data = demographics[pf13Index];
      const valueMapping = {}; // Mapeamento: processado -> original
      const reverseMapping = {}; // Mapeamento reverso: original -> processado
      const nonStandardValues = [];

      // Grupos de valores permitidos
      const allowedGroups = {
        "Até 1 S.M.": [],
        "De 1 até 2 S.M.": [],
        "De 2 até 5 S.M.": [],
        "Mais de 5 S.M.": []
      };

      pf13Data.values.forEach((value) => {
        const match = value.match(/\((.*?)\)/);
        const processed = match && match[1] ? match[1] : value;

        // Mapear cada valor original para um dos 4 grupos permitidos
        if (processed.toLowerCase().includes("até 1 sm") ||
            processed.toLowerCase().includes("ate 1 sm")) {
          allowedGroups["Até 1 S.M."].push(value);
          reverseMapping[value] = "Até 1 S.M.";
        } else if (processed.toLowerCase().includes("mais de 1 até 2 sm") ||
                   processed.toLowerCase().includes("mais de 1 ate 2 sm") ||
                   (processed.toLowerCase().includes("1") && processed.toLowerCase().includes("2"))) {
          allowedGroups["De 1 até 2 S.M."].push(value);
          reverseMapping[value] = "De 1 até 2 S.M.";
        } else if (processed.toLowerCase().includes("mais de 2 até 5 sm") ||
                   processed.toLowerCase().includes("mais de 2 ate 5 sm") ||
                   processed.toLowerCase().includes("mais de 2 até 3 sm") ||
                   processed.toLowerCase().includes("mais de 3 até 5 sm") ||
                   (processed.toLowerCase().includes("2") && processed.toLowerCase().includes("5")) ||
                   (processed.toLowerCase().includes("2") && processed.toLowerCase().includes("3")) ||
                   (processed.toLowerCase().includes("3") && processed.toLowerCase().includes("5"))) {
          allowedGroups["De 2 até 5 S.M."].push(value);
          reverseMapping[value] = "De 2 até 5 S.M.";
        } else if (processed.toLowerCase().includes("mais de 5") ||
                   processed.toLowerCase().includes("mais de 10")) {
          allowedGroups["Mais de 5 S.M."].push(value);
          reverseMapping[value] = "Mais de 5 S.M.";
        } else {
          // Valores não padrão
          nonStandardValues.push(value);
        }
      });

      // Criar o mapeamento de processado para original
      Object.entries(allowedGroups).forEach(([groupName, originalValues]) => {
        if (originalValues.length > 0) {
          valueMapping[groupName] = originalValues;
        }
      });

      // Se há valores não padrão, mapeá-los para NS/NR (mas não mostrar no filtro)
      if (nonStandardValues.length > 0) {
        nonStandardValues.forEach(val => {
          reverseMapping[val] = "NS/NR";
        });
      }

      // Atualizar demographics com apenas os 4 valores permitidos
      demographics[pf13Index] = {
        ...pf13Data,
        values: ["Até 1 S.M.", "De 1 até 2 S.M.", "De 2 até 5 S.M.", "Mais de 5 S.M."]
      };

      // Salvar o mapeamento para uso posterior
      localPf13Mapping = {
        toOriginal: valueMapping,
        toProcessed: reverseMapping
      };
    }
    // FIM DO TRATAMENTO MELHORADO PARA PF13

    // Atualizar o estado do mapeamento
    if (Object.keys(localPf13Mapping).length > 0) {
      setPf13ValueMapping(localPf13Mapping);
    }

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

  // FUNÇÃO handleFilterChange MODIFICADA PARA PF13
  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prevFilters) => {
      // IMPORTANTE: Manter todos os filtros anteriores
      const newFilters = { ...prevFilters };
      const currentValues = prevFilters[demographicKey]
        ? [...prevFilters[demographicKey]]
        : [];

      // Para PF13, precisamos converter o valor processado de volta para o original
      let actualValue = value;
      if (demographicKey === "PF13" && pf13ValueMapping.toOriginal) {
        const originalValue = pf13ValueMapping.toOriginal[value];
        if (originalValue) {
          // Se é NS/NR, é um array de valores
          if (Array.isArray(originalValue)) {
            // Tratamento especial para NS/NR - adiciona todos os valores mapeados
            if (checked) {
              originalValue.forEach(val => {
                if (!currentValues.includes(val)) {
                  currentValues.push(val);
                }
              });
            } else {
              originalValue.forEach(val => {
                const index = currentValues.indexOf(val);
                if (index > -1) {
                  currentValues.splice(index, 1);
                }
              });
            }
            
            if (currentValues.length > 0) {
              newFilters[demographicKey] = currentValues;
            }
            
            return newFilters;
          } else {
            actualValue = originalValue;
          }
        }
      }

      if (checked) {
        if (!currentValues.includes(actualValue)) {
          currentValues.push(actualValue);
        }
      } else {
        const index = currentValues.indexOf(actualValue);
        if (index > -1) {
          currentValues.splice(index, 1);
        }
      }

      if (currentValues.length > 0) {
        newFilters[demographicKey] = currentValues;
      } else {
        // Se não há valores, remover a chave do filtro
        delete newFilters[demographicKey];
      }

      return newFilters;
    });
  };

  // FUNÇÃO handleQuickFilterToggle MODIFICADA PARA SELEÇÃO MÚLTIPLA
  const handleQuickFilterToggle = (demographicKey, value) => {
    setFilters((prevFilters) => {
      const newFilters = { ...prevFilters };
      const currentValues = prevFilters[demographicKey] ? [...prevFilters[demographicKey]] : [];

      // Para PF13, converter o valor processado para original(is)
      let actualValues = [value];
      if (demographicKey === "PF13" && pf13ValueMapping.toOriginal) {
        const originalValue = pf13ValueMapping.toOriginal[value];
        if (originalValue) {
          actualValues = Array.isArray(originalValue) ? originalValue : [originalValue];
        }
      }

      // Verificar se algum dos valores já está selecionado
      const isAlreadySelected = actualValues.some(val => currentValues.includes(val));

      if (isAlreadySelected) {
        // Remover todos os valores correspondentes
        actualValues.forEach(val => {
          const index = currentValues.indexOf(val);
          if (index > -1) {
            currentValues.splice(index, 1);
          }
        });
      } else {
        // Adicionar todos os valores
        actualValues.forEach(val => {
          if (!currentValues.includes(val)) {
            currentValues.push(val);
          }
        });
      }

      if (currentValues.length > 0) {
        newFilters[demographicKey] = currentValues;
      } else {
        delete newFilters[demographicKey];
      }

      return newFilters;
    });
  };

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
        // Para cada distribuição, precisamos verificar se passa por TODOS os filtros
        // Vamos acumular os weightedCounts que passam por todos os filtros simultaneamente

        if (!dist.demographics) return

        // Coletar todos os registros demográficos que precisam passar pelos filtros
        const filterKeys = Object.keys(filters)

        // Map para armazenar registros por combinação de demographics
        // Chave: JSON stringify das demographics, Valor: weightedCount
        const demographicCombinations = new Map()

        // Para cada registro demográfico, verificar se passa por TODOS os filtros
        const firstFilterKey = filterKeys[0]
        const firstFilterValues = filters[firstFilterKey]

        if (!firstFilterValues || firstFilterValues.length === 0) return

        // Começar com o primeiro filtro
        let candidateRecords = []

        if (firstFilterKey === "REGIAO_VIRTUAL") {
          const ufDemoGroup = dist.demographics?.[UF_DEMOGRAPHIC_KEY] || dist.demographics?.["PF10"]
          if (ufDemoGroup) {
            candidateRecords = ufDemoGroup.filter(ufValue =>
              isStateInSelectedRegions(ufValue.response, firstFilterValues)
            )
          }
        } else {
          const demoGroup = dist.demographics?.[firstFilterKey]
          if (demoGroup) {
            candidateRecords = demoGroup.filter(demoValue =>
              firstFilterValues.includes(demoValue.response)
            )
          }
        }

        // Agora verificar se os candidatos também passam pelos outros filtros
        candidateRecords.forEach((candidate) => {
          let passesAllFilters = true

          // Verificar os outros filtros (a partir do segundo)
          for (let i = 1; i < filterKeys.length; i++) {
            const filterKey = filterKeys[i]
            const filterValues = filters[filterKey]

            if (!filterValues || filterValues.length === 0) continue

            // Para cada candidato, verificar se há overlap com este filtro
            let passesThisFilter = false

            if (filterKey === "REGIAO_VIRTUAL") {
              // Se o candidato já passou pelo filtro de região no primeiro passo,
              // não precisamos verificar novamente
              passesThisFilter = true
            } else {
              const demoGroup = dist.demographics?.[filterKey]
              if (demoGroup) {
                // Verificar se algum valor deste grupo demográfico corresponde ao filtro
                passesThisFilter = demoGroup.some(demoValue =>
                  filterValues.includes(demoValue.response)
                )
              }
            }

            if (!passesThisFilter) {
              passesAllFilters = false
              break
            }
          }

          if (passesAllFilters) {
            totalForFilter += candidate.weightedCount
            distributionForFilter[dist.response] =
              (distributionForFilter[dist.response] || 0) + candidate.weightedCount
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

  // Calcular margem de erro baseado no total de respostas filtradas
  const marginOfErrorData = useMemo(() => {
    // Calcular total original (sem filtros)
    const originalTotal = allHistoricalData.reduce((sum, round) => {
      return sum + round.totalWeightedResponses
    }, 0)

    // Calcular total filtrado
    const filteredTotal = filteredHistoricalData.reduce((sum, round) => {
      return sum + (round.totalWeightedResponses || 0)
    }, 0)

    // Calcular margem de erro usando a mesma fórmula do InteractiveMap
    // Fórmula: sqrt(1 / n) * 100
    const calculateMarginOfError = (n) => {
      if (!n || n === 0) return 0
      return Math.sqrt(1 / n) * 100
    }

    const marginOfError = calculateMarginOfError(filteredTotal)
    const hasFilters = Object.keys(filters).length > 0

    return {
      originalTotal,
      filteredTotal,
      marginOfError: marginOfError.toFixed(1),
      hasFilters,
      isHighMargin: marginOfError > 10
    }
  }, [allHistoricalData, filteredHistoricalData, filters])

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
          const weightForState = dist.weightedCount * proportion

          // IMPORTANTE: Adicionar UMA entrada por estado com _weight, não múltiplas entradas
          // Isso permite que o mapa calcule corretamente o total de entrevistas
          mapResponses.push({
            [questionInfo.variable]: responseValue,
            UF: ufData.state,
            _weight: weightForState, // Peso REAL (não arredondado)
          })
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
        pf13ValueMapping={pf13ValueMapping} // PASSAR O MAPEAMENTO
      />

      <DashboardHeader
        questionInfo={{ ...questionInfo, label: pageTitle || questionInfo?.label || questionInfo?.questionText }}
        allHistoricalData={allHistoricalData}
        pageRef={pageRef}
        onMenuClick={() => setShowOffcanvas(true)}
      />

      {/* Alerta de margem de erro */}
      {marginOfErrorData.hasFilters && marginOfErrorData.isHighMargin && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="warning">
            <AlertTitle>Atenção: Margem de erro elevada</AlertTitle>
            A margem de erro atual é de <strong>±{marginOfErrorData.marginOfError}pp</strong> (amostra: {marginOfErrorData.filteredTotal.toLocaleString()} de {marginOfErrorData.originalTotal.toLocaleString()} respostas).
            <br />
            Isso pode afetar a precisão dos resultados. Considere remover alguns filtros para aumentar a amostra.
          </Alert>
        </Box>
      )}

      {/* Info de amostra quando margem <= 10% e há filtros */}
      {marginOfErrorData.hasFilters && !marginOfErrorData.isHighMargin && marginOfErrorData.filteredTotal > 0 && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="info">
            Amostra filtrada: <strong>{marginOfErrorData.filteredTotal.toLocaleString()}</strong> de {marginOfErrorData.originalTotal.toLocaleString()} respostas | Margem de erro: <strong>±{marginOfErrorData.marginOfError}pp</strong>
          </Alert>
        </Box>
      )}

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
            surveyType={surveyType}
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
            pf13ValueMapping={pf13ValueMapping}
          />
        </div>
      </div>
    </Box>
  )
}