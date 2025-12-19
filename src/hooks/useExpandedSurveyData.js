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

      filteredRows.forEach(row => {
        const response = row[variableName]

        // Ignorar respostas vazias ou nulas
        if (!response || response.trim() === '') return

        // Obter peso (assumindo que existe uma coluna 'weights' ou 'weight')
        const weightKey = Object.keys(row).find(key =>
          key.toLowerCase().includes('weight')
        )
        const weight = weightKey ? parseFloat(row[weightKey]) || 1 : 1

        // Acumular contagens
        const trimmedResponse = response.trim()
        const currentCount = responseCounts.get(trimmedResponse) || 0
        responseCounts.set(trimmedResponse, currentCount + weight)
        totalWeight += weight
      })

      // Converter para array com porcentagens
      const stats = Array.from(responseCounts.entries()).map(([response, count]) => ({
        response,
        count,
        percentage: totalWeight > 0 ? (count / totalWeight) * 100 : 0
      }))

      console.log(`Estatísticas para ${variableName}:`, {
        totalResponses: filteredRows.length,
        totalWeight,
        uniqueResponses: stats.length,
        stats: stats.slice(0, 3)
      })

      return {
        data: stats,
        totalWeight,
        totalResponses: filteredRows.length
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
