/**
 * Utilitários para validação e comparação entre ondas de pesquisa
 */

import { R16_TO_R13_COLUMN_MAP } from "./demographicUtils"

/**
 * Valida se as respostas de duas ondas são compatíveis para comparação
 * Critério: Mesmas opções de resposta (vindas da base de dados)
 *
 * @param {Array} wave1Responses - Respostas possíveis da Onda 1 (da base)
 * @param {Array} wave2Responses - Respostas possíveis da Onda 2 (da base)
 * @returns {Object} Resultado da validação
 */
export const validateWaveCompatibility = (
  wave1Responses = [],
  wave2Responses = []
) => {
  const result = {
    isCompatible: false,
    details: {
      wave1Responses: [],
      wave2Responses: [],
      missingInWave1: [],
      missingInWave2: [],
    }
  }

  // Normalizar respostas para comparação
  const normalizeResponse = (response) => {
    if (!response) return ''
    return response.toLowerCase().trim()
  }

  const wave1ResponsesNormalized = new Set(
    wave1Responses.map(normalizeResponse).filter(r => r !== '')
  )
  const wave2ResponsesNormalized = new Set(
    wave2Responses.map(normalizeResponse).filter(r => r !== '')
  )

  result.details.wave1Responses = wave1Responses
  result.details.wave2Responses = wave2Responses

  // Encontrar respostas que existem em uma onda mas não na outra
  result.details.missingInWave1 = wave2Responses.filter(
    r => !wave1ResponsesNormalized.has(normalizeResponse(r))
  )
  result.details.missingInWave2 = wave1Responses.filter(
    r => !wave2ResponsesNormalized.has(normalizeResponse(r))
  )

  // Verificar se todas as respostas principais são iguais
  // Ignoramos NS/NR e similares na comparação
  const ignoredResponses = ['ns/nr', 'não sabe', 'não respondeu', 'nao sabe', 'nao respondeu', '-1']

  const filterIgnored = (responses) => {
    return [...responses].filter(r => !ignoredResponses.includes(r))
  }

  const wave1Filtered = filterIgnored(wave1ResponsesNormalized)
  const wave2Filtered = filterIgnored(wave2ResponsesNormalized)

  const sameSize = wave1Filtered.length === wave2Filtered.length
  const allMatch = wave1Filtered.every(r => wave2Filtered.includes(r))

  // Compatível se as respostas forem iguais
  result.isCompatible = sameSize && allMatch

  return result
}

/**
 * Encontra variáveis demográficas comuns entre duas ondas
 * @param {Array} wave1Headers - Headers da Onda 1
 * @param {Array} wave2Headers - Headers da Onda 2
 * @returns {Array} Lista de variáveis demográficas comuns
 */
export const findCommonDemographicVariables = (wave1Headers, wave2Headers) => {
  if (!wave1Headers || !wave2Headers) return []

  const wave1Set = new Set(wave1Headers)
  const wave2Set = new Set(wave2Headers)

  // Encontrar variáveis que existem em ambas
  const common = [...wave1Set].filter(header => {
    // Verificar se existe na onda 2 com o mesmo nome
    if (wave2Set.has(header)) return true

    // Tentar encontrar equivalente (ex: regiões vs região)
    const normalized = header.toLowerCase().replace(/[õã]/g, 'o').replace(/[éê]/g, 'e')
    return [...wave2Set].some(h2 => {
      const normalized2 = h2.toLowerCase().replace(/[õã]/g, 'o').replace(/[éê]/g, 'e')
      return normalized === normalized2
    })
  })

  // Filtrar apenas variáveis demográficas (PF* e regiões)
  return common.filter(header => {
    const lower = header.toLowerCase()
    return header.startsWith('PF') ||
           lower.includes('regi') ||
           lower.includes('estado') ||
           lower.includes('sexo') ||
           lower.includes('idade')
  })
}

/**
 * Cria um mapeamento de valores demográficos entre ondas
 * (para lidar com pequenas diferenças de nomenclatura)
 * @param {Object} wave1Data - Dados processados da Onda 1
 * @param {Object} wave2Data - Dados processados da Onda 2
 * @param {String} variable - Variável demográfica
 * @returns {Map} Mapeamento de valores wave1 -> wave2
 */
export const createDemographicValueMapping = (wave1Data, wave2Data, variable) => {
  const mapping = new Map()

  if (!wave1Data?.rows || !wave2Data?.rows) return mapping

  // Coletar valores únicos de cada onda
  const wave1Values = new Set()
  const wave2Values = new Set()

  wave1Data.rows.forEach(row => {
    const value = row[variable]
    if (value && value.trim() !== '' && value.trim() !== '#NULL!') {
      wave1Values.add(value.trim())
    }
  })

  wave2Data.rows.forEach(row => {
    const value = row[variable]
    if (value && value.trim() !== '' && value.trim() !== '#NULL!') {
      wave2Values.add(value.trim())
    }
  })

  // Criar mapeamento direto para valores iguais
  wave1Values.forEach(v1 => {
    if (wave2Values.has(v1)) {
      mapping.set(v1, v1)
    } else {
      // Tentar encontrar equivalente normalizado
      const normalized1 = v1.toLowerCase().trim()
      for (const v2 of wave2Values) {
        const normalized2 = v2.toLowerCase().trim()
        if (normalized1 === normalized2) {
          mapping.set(v1, v2)
          break
        }
      }
    }
  })

  return mapping
}

/**
 * Aplica filtros em dados de ambas as ondas
 * Lida com mapeamento de colunas entre R13 e R16 (ex: PF16 -> PF17 para Raça/Cor)
 * @param {Object} filters - Filtros selecionados (chave = nome da coluna R16, valor = array de valores)
 * @param {Object} wave1ProcessedData - Dados processados da Onda 1 (R13)
 * @param {Object} wave2ProcessedData - Dados processados da Onda 2 (R16)
 * @returns {Object} Dados filtrados de ambas as ondas
 */
export const applyUnifiedFilters = (filters, wave1ProcessedData, wave2ProcessedData) => {
  const result = {
    wave1Rows: wave1ProcessedData?.rows || [],
    wave2Rows: wave2ProcessedData?.rows || [],
  }

  console.log('🔬 applyUnifiedFilters CHAMADO:', {
    filtros: JSON.stringify(filters),
    wave1TotalRows: wave1ProcessedData?.rows?.length || 0,
    wave2TotalRows: wave2ProcessedData?.rows?.length || 0
  })

  if (!filters || Object.keys(filters).length === 0) {
    console.log('📌 Nenhum filtro - retornando todas as linhas')
    return result
  }

  // Aplicar filtros na Onda 1 (R13)
  // Precisa converter nomes de colunas R16 -> R13 quando necessário
  if (wave1ProcessedData?.rows) {
    result.wave1Rows = wave1ProcessedData.rows.filter(row => {
      return Object.entries(filters).every(([filterKey, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true

        // Mapear a coluna R16 para R13 se necessário
        const r13Key = R16_TO_R13_COLUMN_MAP[filterKey] || filterKey
        const rowValue = row[r13Key]

        // Verificar correspondência direta ou normalizada
        return filterValues.some(fv => {
          if (rowValue === fv) return true
          // Comparação normalizada
          const normalizedRow = rowValue?.toLowerCase().trim()
          const normalizedFilter = fv?.toLowerCase().trim()
          return normalizedRow === normalizedFilter
        })
      })
    })
  }

  // Aplicar filtros na Onda 2 (R16)
  if (wave2ProcessedData?.rows) {
    result.wave2Rows = wave2ProcessedData.rows.filter(row => {
      return Object.entries(filters).every(([filterKey, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true
        const rowValue = row[filterKey]
        return filterValues.some(fv => {
          if (rowValue === fv) return true
          const normalizedRow = rowValue?.toLowerCase().trim()
          const normalizedFilter = fv?.toLowerCase().trim()
          return normalizedRow === normalizedFilter
        })
      })
    })
  }

  console.log('📌 applyUnifiedFilters RESULTADO:', {
    wave1RowsFiltradas: result.wave1Rows.length,
    wave2RowsFiltradas: result.wave2Rows.length
  })

  return result
}
