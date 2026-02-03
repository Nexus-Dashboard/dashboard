import { useMemo, useCallback } from "react"
import { UNIFIED_DEMOGRAPHIC_COLUMNS, POLITICAL_ATTITUDINAL_FILTERS } from "../utils/demographicUtils"

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

    // DEBUG: Encontrar e listar todas as colunas de peso
    const weightColumns = headers.filter(h => h && h.toLowerCase().includes('weight'))
    console.log('🔍 Colunas de WEIGHT no dataset:', weightColumns)
    console.log('🔍 Nomes EXATOS das colunas de weight:')
    weightColumns.forEach((col, i) => {
      console.log(`  [${i}] "${col}" (length: ${col.length})`)
    })

    console.log('Processando dados brutos:', {
      totalRows: values.length,
      totalColumns: headers.length,
      sampleHeaders: headers.slice(0, 10),
      weightColumns: weightColumns
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

    // DEBUG: Verificar soma total dos weights de TODAS as linhas
    const weightColName = weightColumns.find(c => c.toLowerCase().includes('16 casas') || c.toLowerCase().includes('spss')) || weightColumns[0]
    if (weightColName) {
      let totalWeightAllRows = 0
      rows.forEach(row => {
        const val = parseFloat(String(row[weightColName]).replace(',', '.')) || 0
        totalWeightAllRows += val
      })
      console.log(`📊 SOMA TOTAL DE WEIGHTS (todas as ${rows.length} linhas): ${totalWeightAllRows.toFixed(4)} usando coluna "${weightColName}"`)
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

      // ========== DEBUG PROFUNDO: ANÁLISE DE FILTROS ==========
      console.log('═══════════════════════════════════════════════════════')
      console.log('🔬 ANÁLISE PROFUNDA DE CÁLCULO')
      console.log('═══════════════════════════════════════════════════════')
      console.log('📌 Variável:', variableName)
      console.log('📌 Filtros aplicados:', JSON.stringify(filters))
      console.log('📌 Total de linhas ANTES do filtro:', rows.length)

      // Aplicar filtros
      let filteredRows = rows

      // Aplicar filtros demográficos
      if (Object.keys(filters).length > 0) {
        // DEBUG PRÉ-FILTRO: Verificar valores únicos na coluna de filtro
        Object.entries(filters).forEach(([filterKey, filterValues]) => {
          const uniqueInData = new Set()
          rows.forEach(row => {
            const val = row[filterKey]
            if (val !== undefined && val !== null) {
              uniqueInData.add(val)
            }
          })
          console.log(`📌 PRÉ-FILTRO - Coluna "${filterKey}":`)
          console.log(`   Valores únicos na base (${uniqueInData.size}): [${Array.from(uniqueInData).slice(0, 10).join(', ')}${uniqueInData.size > 10 ? '...' : ''}]`)
          console.log(`   Valores do filtro: [${filterValues?.join(', ')}]`)

          // Verificar se algum valor do filtro existe na base
          const matchingValues = filterValues?.filter(fv => uniqueInData.has(fv)) || []
          console.log(`   Valores com match: [${matchingValues.join(', ')}]`)
          if (matchingValues.length !== filterValues?.length) {
            console.warn(`   ⚠️ ATENÇÃO: Alguns valores do filtro NÃO existem na base!`)
          }
        })

        filteredRows = rows.filter(row => {
          return Object.entries(filters).every(([filterKey, filterValues]) => {
            if (!filterValues || filterValues.length === 0) return true
            const rowValue = row[filterKey]
            return filterValues.includes(rowValue)
          })
        })

        // DEBUG: Mostrar quantas linhas passaram pelo filtro
        console.log('📌 Total de linhas APÓS filtro demográfico:', filteredRows.length)

        // DEBUG: Mostrar amostra das linhas filtradas
        if (filteredRows.length > 0) {
          const sampleRow = filteredRows[0]
          Object.entries(filters).forEach(([filterKey, filterValues]) => {
            console.log(`   → Filtro "${filterKey}": valores aceitos = [${filterValues?.join(', ')}]`)
            console.log(`     Valor na amostra: "${sampleRow[filterKey]}"`)
          })
        }
      } else {
        console.log('📌 Nenhum filtro aplicado - usando todas as linhas')
      }

      // Calcular estatísticas com pesos
      const responseCounts = new Map()  // Soma de pesos por resposta
      const responseRawCounts = new Map() // Contagem bruta (N) por resposta
      let totalWeight = 0
      let totalCount = 0 // Contagem real de respostas (N)

      // Buscar a coluna de peso EXATA: "weights (16 casas decimais do spss)"
      // IMPORTANTE: Priorizar a coluna com 16 casas decimais, não a coluna "weights" genérica
      const allKeys = Object.keys(filteredRows[0] || {})

      // DEBUG: Mostrar TODAS as colunas que contêm "weight" para diagnóstico
      const allWeightColumns = allKeys.filter(k => k.toLowerCase().includes('weight'))
      console.log('📋 TODAS as colunas de weight encontradas:', allWeightColumns)

      // DEBUG AVANÇADO: Calcular soma de TODAS as colunas de weight para comparar
      // Primeiro: soma de TODAS as linhas filtradas (sem filtrar por resposta)
      console.log('🔬 SOMA DE WEIGHTS - TODAS AS LINHAS FILTRADAS (antes de filtrar por resposta válida):')
      allWeightColumns.forEach(col => {
        let sumAll = 0
        filteredRows.forEach(row => {
          const val = parseFloat(String(row[col]).replace(',', '.')) || 0
          sumAll += val
        })
        console.log(`  → "${col}": soma_total=${sumAll.toFixed(4)}, linhas=${filteredRows.length}`)
      })

      // Segundo: soma apenas das linhas com resposta válida
      if (allWeightColumns.length >= 1) {
        console.log('🔬 SOMA DE WEIGHTS - APENAS RESPOSTAS VÁLIDAS:')
        allWeightColumns.forEach(col => {
          let sum = 0
          let count = 0
          let excluded = { empty: 0, null: 0, minusOne: 0 }
          filteredRows.forEach(row => {
            const response = row[variableName]
            if (!response || response.trim() === '') {
              excluded.empty++
              return
            }
            if (response.trim() === '#NULL!' || response.trim() === '#NULL' || response.trim() === '#null') {
              excluded.null++
              return
            }
            if (response.trim() === '-1') {
              excluded.minusOne++
              return
            }
            const val = parseFloat(String(row[col]).replace(',', '.')) || 0
            sum += val
            count++
          })
          console.log(`  → "${col}": soma=${sum.toFixed(4)}, count=${count}`)
          console.log(`     Excluídos: vazios=${excluded.empty}, #NULL!=${excluded.null}, -1=${excluded.minusOne}`)
        })
      }

      // Procurar primeiro pela coluna específica com 16 casas decimais
      // Buscar por "16 casas" OU "decimais" (permitindo typos como "deciamis")
      const weightKey = allKeys.find(key => {
        const lowerKey = key.toLowerCase()
        return lowerKey.includes('16 casas') ||
               lowerKey.includes('decimais') ||
               lowerKey.includes('deciamis') || // Typo comum
               lowerKey.includes('spss')
      }) || allKeys.find(key => {
        // Fallback: usar "weights" apenas se não encontrar a específica
        const lowerKey = key.toLowerCase()
        return lowerKey === 'weights' || lowerKey === 'weight'
      })

      if (!weightKey && filteredRows.length > 0) {
        console.warn('⚠️ Coluna de pesos não encontrada!')
        console.warn('Todas as colunas disponíveis:', allWeightColumns)
      } else if (weightKey) {
        console.log(`✅ Usando coluna de pesos: "${weightKey}"`)
        // DEBUG: Mostrar os primeiros 3 valores da coluna de peso selecionada
        const sampleWeightValues = filteredRows.slice(0, 3).map(r => ({
          raw: r[weightKey],
          parsed: parseFloat(String(r[weightKey]).replace(',', '.')) || 1
        }))
        console.log('📊 Amostras de valores de peso:', sampleWeightValues)
      }

      // DEBUG: Verificar primeiras linhas para conferir valores de weight
      let debugCount = 0
      const debugSamples = []

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
        // IMPORTANTE: Se o peso estiver vazio/undefined, usar 0 (não 1) para não inflar o total
        let weight = 0
        if (weightKey && row[weightKey] !== undefined && row[weightKey] !== null && row[weightKey] !== '') {
          const weightStr = String(row[weightKey]).replace(',', '.')
          const parsedWeight = parseFloat(weightStr)
          weight = isNaN(parsedWeight) ? 0 : parsedWeight

          // DEBUG: Coletar amostras dos weights
          if (debugCount < 5) {
            debugSamples.push({
              response: trimmedResponse,
              weightRaw: row[weightKey],
              weightParsed: weight
            })
            debugCount++
          }
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

      // DEBUG: Log detalhado para verificar cálculo
      console.log(`🔍 DEBUG ${variableName}:`, {
        weightKey,
        totalCount,
        totalWeight: totalWeight.toFixed(4),
        sampleWeights: debugSamples,
        responseSummary: Array.from(responseCounts.entries()).slice(0, 3).map(([r, w]) => ({
          response: r,
          weightSum: w.toFixed(4),
          count: responseRawCounts.get(r),
          pctWeight: ((w / totalWeight) * 100).toFixed(2) + '%',
          pctCount: ((responseRawCounts.get(r) / totalCount) * 100).toFixed(2) + '%'
        }))
      })

      // Converter para array com porcentagens baseadas em WEIGHTS
      const stats = Array.from(responseCounts.entries()).map(([response, weightSum]) => ({
        response,
        count: responseRawCounts.get(response) || 0, // Contagem bruta (N real)
        weightSum, // Soma dos pesos para esta resposta
        weightedCount: weightSum, // Alias para compatibilidade com P28ViolenceChart
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

  // NOVO: Função para obter variáveis político-atitudinais
  const getPoliticalVariables = useMemo(() => {
    if (!processedData) return []

    const { headers } = processedData

    const politicalList = []

    POLITICAL_ATTITUDINAL_FILTERS.forEach(config => {
      const possibleColumns = [config.r16Column, config.r13Column, config.column]
      const foundColumn = possibleColumns.find(col => headers.includes(col))

      if (foundColumn && config.groupedValues) {
        // Usar os valores agrupados definidos na configuração
        const groupedOptions = Object.keys(config.groupedValues)

        politicalList.push({
          key: foundColumn,
          label: config.label,
          values: groupedOptions,
          groupedValues: config.groupedValues,
          isPolitical: true
        })
      }
    })

    console.log('🗳️ Variáveis político-atitudinais encontradas:', politicalList.map(p => p.label))

    return politicalList
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

    // ========== DEBUG PROFUNDO: calculateVariableStatsWithRows ==========
    console.log('═══════════════════════════════════════════════════════')
    console.log('🔬 ANÁLISE PROFUNDA - calculateVariableStatsWithRows')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📌 Variável:', variableName)
    console.log('📌 Linhas recebidas (já filtradas):', filteredRows.length)

    // Calcular estatísticas com pesos
    const responseCounts = new Map()  // Soma de pesos por resposta
    const responseRawCounts = new Map() // Contagem bruta (N) por resposta
    let totalWeight = 0
    let totalCount = 0 // Contagem real de respostas (N)

    // Buscar a coluna de peso EXATA: "weights (16 casas decimais do spss)"
    // IMPORTANTE: Priorizar a coluna com 16 casas decimais, não a coluna "weights" genérica
    const allKeys = Object.keys(filteredRows[0] || {})

    // DEBUG: Mostrar colunas de weight disponíveis
    const allWeightColumns = allKeys.filter(k => k.toLowerCase().includes('weight'))
    console.log('📋 Colunas de weight disponíveis:', allWeightColumns)

    // Procurar primeiro pela coluna específica com 16 casas decimais
    // Buscar por "16 casas" OU "decimais" (permitindo typos como "deciamis")
    const weightKey = allKeys.find(key => {
      const lowerKey = key.toLowerCase()
      return lowerKey.includes('16 casas') ||
             lowerKey.includes('decimais') ||
             lowerKey.includes('deciamis') || // Typo comum
             lowerKey.includes('spss')
    }) || allKeys.find(key => {
      // Fallback: usar "weights" apenas se não encontrar a específica
      const lowerKey = key.toLowerCase()
      return lowerKey === 'weights' || lowerKey === 'weight'
    })

    console.log(`✅ Usando coluna de pesos: "${weightKey}"`)

    // DEBUG: Soma de TODAS as linhas recebidas (antes de filtrar por resposta válida)
    if (weightKey) {
      let sumAllRows = 0
      filteredRows.forEach(row => {
        const val = parseFloat(String(row[weightKey]).replace(',', '.')) || 0
        sumAllRows += val
      })
      console.log(`📊 Soma de weights de TODAS as ${filteredRows.length} linhas: ${sumAllRows.toFixed(4)}`)
    }

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

      // Obter peso - converter vírgula em ponto e parsear
      // IMPORTANTE: Se o peso estiver vazio/undefined, usar 0 (não 1) para não inflar o total
      let weight = 0
      if (weightKey && row[weightKey] !== undefined && row[weightKey] !== null && row[weightKey] !== '') {
        const weightStr = String(row[weightKey]).replace(',', '.')
        const parsedWeight = parseFloat(weightStr)
        weight = isNaN(parsedWeight) ? 0 : parsedWeight
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

    // DEBUG FINAL
    console.log(`📊 RESULTADO FINAL - calculateVariableStatsWithRows(${variableName}):`, {
      totalCount,
      totalWeight: totalWeight.toFixed(4),
      respostasComMaiorPeso: stats.sort((a, b) => b.weightSum - a.weightSum).slice(0, 3).map(s => ({
        resposta: s.response,
        peso: s.weightSum.toFixed(4),
        count: s.count,
        pct: s.percentage.toFixed(2) + '%'
      }))
    })

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
    politicalVariables: getPoliticalVariables,
    getProcessedRows,
    isReady: !!processedData
  }
}
