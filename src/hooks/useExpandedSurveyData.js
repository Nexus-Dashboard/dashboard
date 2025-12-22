import { useMemo } from "react"
import { DEMOGRAPHIC_R16 } from "../utils/demographicUtils"

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
      const responseCounts = new Map()
      let totalWeight = 0

      // Buscar a coluna de peso (weights) - procurar por várias variações
      const allKeys = Object.keys(filteredRows[0] || {})
      const weightKey = allKeys.find(key => {
        const lowerKey = key.toLowerCase()
        return lowerKey === 'weights' ||
               lowerKey === 'weight' ||
               lowerKey === 'peso' ||
               lowerKey === 'pesos' ||
               lowerKey.includes('weight') ||
               lowerKey.includes('peso')
      })

      if (!weightKey && filteredRows.length > 0) {
        console.warn('⚠️ Coluna de pesos não encontrada!')
        console.warn('Todas as colunas disponíveis:', allKeys)
        console.warn('Primeira linha de exemplo:', filteredRows[0])
      } else if (weightKey) {
        console.log(`✅ Usando coluna de pesos: "${weightKey}"`)
        console.log(`Exemplo de peso da primeira linha: ${filteredRows[0][weightKey]}`)
      }

      filteredRows.forEach(row => {
        const response = row[variableName]

        // Ignorar respostas vazias, nulas ou #NULL!
        if (!response || response.trim() === '') return

        let trimmedResponse = response.trim()
        if (trimmedResponse === '#NULL!' || trimmedResponse === '#NULL' || trimmedResponse === '#null') return

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

        // Acumular contagens usando pesos
        const currentCount = responseCounts.get(trimmedResponse) || 0
        responseCounts.set(trimmedResponse, currentCount + weight)
        totalWeight += weight
      })

      // Converter para array com porcentagens baseadas em WEIGHTS
      const stats = Array.from(responseCounts.entries()).map(([response, weightSum]) => ({
        response,
        count: weightSum, // count é na verdade a soma dos weights
        percentage: totalWeight > 0 ? (weightSum / totalWeight) * 100 : 0
      }))

      console.log(`Estatísticas para ${variableName}:`, {
        totalRowsFiltered: filteredRows.length,
        totalWeight, // Soma total dos weights
        uniqueResponses: stats.length,
        stats: stats.slice(0, 3)
      })

      return {
        data: stats,
        totalWeight, // Soma total dos weights
        totalResponses: totalWeight // MUDANÇA: retornar totalWeight em vez de filteredRows.length
      }
    }
  }, [processedData])

  // Função para obter variáveis demográficas (PF...)
  const getDemographicVariables = useMemo(() => {
    if (!processedData) return []

    const { headers, rows } = processedData

    // Filtrar apenas variáveis que começam com PF
    const demographicHeaders = headers.filter(header =>
      header && header.startsWith('PF')
    )

    // Para cada variável demográfica, extrair valores únicos
    return demographicHeaders.map(header => {
      const uniqueValues = new Set()

      rows.forEach(row => {
        const value = row[header]
        // Filtrar valores vazios e #NULL!
        if (value && value.trim() !== '' && value.trim() !== '#NULL!') {
          uniqueValues.add(value.trim())
        }
      })

      return {
        key: header,
        label: DEMOGRAPHIC_R16[header] || header, // Usar mapeamento de labels da Rodada 16
        values: Array.from(uniqueValues).sort()
      }
    }).filter(demo => demo.values.length > 0)
  }, [processedData])

  return {
    processedData,
    calculateVariableStats,
    demographicVariables: getDemographicVariables,
    isReady: !!processedData
  }
}
