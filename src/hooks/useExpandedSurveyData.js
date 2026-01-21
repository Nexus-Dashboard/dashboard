import { useMemo, useCallback } from "react"
import { UNIFIED_DEMOGRAPHIC_COLUMNS } from "../utils/demographicUtils"

/**
 * Hook para processar dados da pesquisa ampliada
 * Otimizado para evitar reprocessamento desnecessário
 */
export const useExpandedSurveyData = (rawData) => {
  // Processar dados brutos uma única vez e manter em cache
  const processedData = useMemo(() => {
    if (!rawData?.data?.values) {
      console.log('Dados brutos não disponíveis ainda')
      return null
    }

    const values = rawData.data.values
    const headers = values[0]

    console.log('Processando dados brutos:', {
      totalRows: values.length,
      totalColumns: headers.length,
      sampleHeaders: headers.slice(0, 10)
    })

    // Criar mapa de índices para acesso rápido
    const headerIndexMap = new Map()
    headers.forEach((header, index) => {
      if (header) {
        headerIndexMap.set(header, index)
      }
    })

    // Processar todas as linhas (exceto header)
    const rows = []
    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      const rowObject = {}

      headers.forEach((header, index) => {
        if (header) {
          rowObject[header] = row[index]
        }
      })

      rows.push(rowObject)
    }

    console.log('Dados processados:', {
      totalRows: rows.length,
      totalHeaders: headers.length,
      sampleRow: rows[0]
    })

    return {
      headers,
      headerIndexMap,
      rows,
      rowCount: rows.length
    }
  }, [rawData])

  // Função para calcular estatísticas de uma variável específica
  const calculateVariableStats = useMemo(() => {
    if (!processedData) return null

    return (variableName, filters = {}) => {
      const { rows, headerIndexMap } = processedData

      if (!headerIndexMap.has(variableName)) {
        console.warn(`Variável ${variableName} não encontrada nos dados`)
        return null
      }

      // Aplicar filtros
      let filteredRows = rows

      // Aplicar filtros demográficos
      if (Object.keys(filters).length > 0) {
        filteredRows = rows.filter(row => {
          return Object.entries(filters).every(([filterKey, filterValues]) => {
            if (!filterValues || filterValues.length === 0) return true
            const rowValue = row[filterKey]
            return filterValues.includes(rowValue)
          })
        })
      }

      // Calcular estatísticas com pesos
      const responseCounts = new Map()  // Soma de pesos por resposta
      const responseRawCounts = new Map() // Contagem bruta (N) por resposta
      let totalWeight = 0
      let totalCount = 0 // Contagem real de respostas (N)

      // Buscar a coluna de peso EXATA: "weights (16 casas decimais do spss)"
      const allKeys = Object.keys(filteredRows[0] || {})
      const exactWeightKey = "weights (16 casas decimais do spss)"
      const weightKey = allKeys.includes(exactWeightKey) ? exactWeightKey : allKeys.find(key => {
        const lowerKey = key.toLowerCase()
        return lowerKey === 'weights' ||
               lowerKey === 'weight' ||
               lowerKey.includes('16 casas')
      })

      if (!weightKey && filteredRows.length > 0) {
        console.warn('⚠️ Coluna de pesos não encontrada!')
        console.warn('Todas as colunas disponíveis:', allKeys.filter(k => k.toLowerCase().includes('weight')))
      } else if (weightKey) {
        console.log(`✅ Usando coluna de pesos: "${weightKey}"`)
      }

      filteredRows.forEach(row => {
        const response = row[variableName]

        // Ignorar respostas vazias, nulas ou #NULL!
        if (!response || response.trim() === '') return

        let trimmedResponse = response.trim()
        if (trimmedResponse === '#NULL!' || trimmedResponse === '#NULL' || trimmedResponse === '#null') return

        // Ignorar respostas com valor "-1"
        if (trimmedResponse === '-1') return

        // Normalizar respostas "Não sabe" e "Não respondeu" para "NS/NR"
        const lowerResponse = trimmedResponse.toLowerCase()
        if (lowerResponse.includes('não sabe') || lowerResponse.includes('não respondeu')) {
          trimmedResponse = 'NS/NR'
        }

        // Obter peso - converter vírgula em ponto e parsear
        let weight = 1
        if (weightKey && row[weightKey]) {
          const weightStr = String(row[weightKey]).replace(',', '.')
          weight = parseFloat(weightStr) || 1
        }

        // Acumular contagens usando pesos (para porcentagem)
        const currentWeightSum = responseCounts.get(trimmedResponse) || 0
        responseCounts.set(trimmedResponse, currentWeightSum + weight)
        totalWeight += weight

        // Acumular contagem bruta (para N)
        const currentRawCount = responseRawCounts.get(trimmedResponse) || 0
        responseRawCounts.set(trimmedResponse, currentRawCount + 1)
        totalCount += 1
      })

      // Converter para array com porcentagens baseadas em WEIGHTS
      const stats = Array.from(responseCounts.entries()).map(([response, weightSum]) => ({
        response,
        count: responseRawCounts.get(response) || 0, // Contagem bruta (N real)
        weightSum, // Soma dos pesos para esta resposta
        percentage: totalWeight > 0 ? (weightSum / totalWeight) * 100 : 0
      }))

      console.log(`Estatísticas para ${variableName}:`, {
        totalCount,      // N real (contagem de respostas)
        totalWeight,     // Soma total dos weights (para porcentagem)
        uniqueResponses: stats.length,
        stats: stats.slice(0, 3)
      })

      return {
        data: stats,
        totalWeight,     // Soma total dos weights (para cálculo de porcentagem)
        totalCount,      // N real - contagem de respostas
        totalResponses: totalCount // N = contagem real de respostas
      }
    }
  }, [processedData])

  // Função para obter variáveis demográficas unificadas
  // Usa as colunas agrupadas que existem em ambas as rodadas R13 e R16
  const getDemographicVariables = useMemo(() => {
    if (!processedData) return []

    const { headers, rows } = processedData

    // Usar apenas as colunas demográficas unificadas
    const demographicList = []

    UNIFIED_DEMOGRAPHIC_COLUMNS.forEach(config => {
      // Verificar qual coluna usar (R16 por padrão, mas pode ser diferente como Raça/Cor)
      // Precisamos encontrar a coluna que existe neste dataset
      const possibleColumns = [config.r16Column, config.r13Column, config.column]
      const foundColumn = possibleColumns.find(col => headers.includes(col))

      if (foundColumn) {
        const uniqueValues = new Set()

        rows.forEach(row => {
          const value = row[foundColumn]
          if (value && value.trim() !== '' && value.trim() !== '#NULL!' && value.trim() !== '-1') {
            uniqueValues.add(value.trim())
          }
        })

        if (uniqueValues.size > 0) {
          demographicList.push({
            key: foundColumn,
            label: config.label,
            values: Array.from(uniqueValues).sort()
          })
        }
      }
    })

    console.log('📊 Variáveis demográficas encontradas:', demographicList.map(d => d.label))

    return demographicList
  }, [processedData])

  // NOVO: Função para calcular estatísticas com rows pré-filtradas
  // Útil para filtros unificados entre ondas
  const calculateVariableStatsWithRows = useCallback((variableName, filteredRows) => {
    if (!processedData) return null

    const { headerIndexMap } = processedData

    if (!headerIndexMap.has(variableName)) {
      console.warn(`Variável ${variableName} não encontrada nos dados`)
      return null
    }

    // Calcular estatísticas com pesos
    const responseCounts = new Map()  // Soma de pesos por resposta
    const responseRawCounts = new Map() // Contagem bruta (N) por resposta
    let totalWeight = 0
    let totalCount = 0 // Contagem real de respostas (N)

    // Buscar a coluna de peso EXATA: "weights (16 casas decimais do spss)"
    const allKeys = Object.keys(filteredRows[0] || {})
    const exactWeightKey = "weights (16 casas decimais do spss)"
    const weightKey = allKeys.includes(exactWeightKey) ? exactWeightKey : allKeys.find(key => {
      const lowerKey = key.toLowerCase()
      return lowerKey === 'weights' ||
             lowerKey === 'weight' ||
             lowerKey.includes('16 casas')
    })

    filteredRows.forEach(row => {
      const response = row[variableName]

      if (!response || response.trim() === '') return

      let trimmedResponse = response.trim()
      if (trimmedResponse === '#NULL!' || trimmedResponse === '#NULL' || trimmedResponse === '#null') return
      if (trimmedResponse === '-1') return

      const lowerResponse = trimmedResponse.toLowerCase()
      if (lowerResponse.includes('não sabe') || lowerResponse.includes('não respondeu')) {
        trimmedResponse = 'NS/NR'
      }

      let weight = 1
      if (weightKey && row[weightKey]) {
        const weightStr = String(row[weightKey]).replace(',', '.')
        weight = parseFloat(weightStr) || 1
      }

      // Acumular contagens usando pesos (para porcentagem)
      const currentWeightSum = responseCounts.get(trimmedResponse) || 0
      responseCounts.set(trimmedResponse, currentWeightSum + weight)
      totalWeight += weight

      // Acumular contagem bruta (para N)
      const currentRawCount = responseRawCounts.get(trimmedResponse) || 0
      responseRawCounts.set(trimmedResponse, currentRawCount + 1)
      totalCount += 1
    })

    const stats = Array.from(responseCounts.entries()).map(([response, weightSum]) => ({
      response,
      count: responseRawCounts.get(response) || 0, // Contagem bruta (N real)
      weightSum, // Soma dos pesos para esta resposta
      percentage: totalWeight > 0 ? (weightSum / totalWeight) * 100 : 0
    }))

    return {
      data: stats,
      totalWeight,     // Soma total dos weights (para cálculo de porcentagem)
      totalCount,      // N real - contagem de respostas
      totalResponses: totalCount // N = contagem real de respostas
    }
  }, [processedData])

  // NOVO: Retornar os rows processados para uso em filtros unificados
  const getProcessedRows = useCallback(() => {
    return processedData?.rows || []
  }, [processedData])

  return {
    processedData,
    calculateVariableStats,
    calculateVariableStatsWithRows,
    demographicVariables: getDemographicVariables,
    getProcessedRows,
    isReady: !!processedData
  }
}
