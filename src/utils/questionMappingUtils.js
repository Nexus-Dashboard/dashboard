/**
 * Utilitários para mapeamento de perguntas entre ondas de pesquisa F2F
 *
 * Este arquivo contém funções para trabalhar com o mapeamento de variáveis
 * entre a Rodada 13 (Onda 1) e a Rodada 16 (Onda 2).
 *
 * O mapeamento é necessário porque algumas perguntas tiveram seus códigos
 * alterados entre as rodadas, por exemplo:
 * - P05 (R13) -> P06 (R16)
 * - T_P09_1 (R13) -> T_P10_1 (R16)
 */

/**
 * Encontra a variável correspondente na Onda 1 (R13) para uma variável da Onda 2 (R16)
 *
 * @param {string} r16Variable - Variável da Rodada 16
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {string|null} - Variável correspondente na Rodada 13 ou null se não existir
 */
export const getWave1Variable = (r16Variable, mappingData) => {
  if (!mappingData?.r16ToR13 || !r16Variable) return null
  return mappingData.r16ToR13[r16Variable] || null
}

/**
 * Encontra a variável correspondente na Onda 2 (R16) para uma variável da Onda 1 (R13)
 *
 * @param {string} r13Variable - Variável da Rodada 13
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {string|null} - Variável correspondente na Rodada 16 ou null se não existir
 */
export const getWave2Variable = (r13Variable, mappingData) => {
  if (!mappingData?.r13ToR16 || !r13Variable) return null
  return mappingData.r13ToR16[r13Variable] || null
}

/**
 * Verifica se uma variável da Rodada 16 tem correspondente na Rodada 13
 *
 * @param {string} r16Variable - Variável da Rodada 16
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {boolean} - true se existe mapeamento
 */
export const hasWave1Mapping = (r16Variable, mappingData) => {
  return getWave1Variable(r16Variable, mappingData) !== null
}

/**
 * Obtém todas as variáveis da Rodada 16 que têm mapeamento
 *
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {string[]} - Lista de variáveis da R16 com mapeamento
 */
export const getAllMappedR16Variables = (mappingData) => {
  if (!mappingData?.r16ToR13) return []
  return Object.keys(mappingData.r16ToR13)
}

/**
 * Obtém todas as variáveis da Rodada 13 que têm mapeamento
 *
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {string[]} - Lista de variáveis da R13 com mapeamento
 */
export const getAllMappedR13Variables = (mappingData) => {
  if (!mappingData?.r13ToR16) return []
  return Object.keys(mappingData.r13ToR16)
}

/**
 * Mapeia um array de variáveis da R16 para suas correspondentes na R13
 * Retorna apenas as que têm mapeamento válido
 *
 * @param {string[]} r16Variables - Array de variáveis da Rodada 16
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {Object[]} - Array de objetos { r16: varR16, r13: varR13 }
 */
export const mapVariablesToWave1 = (r16Variables, mappingData) => {
  if (!r16Variables || !mappingData?.r16ToR13) return []

  return r16Variables
    .map(r16Var => ({
      r16: r16Var,
      r13: mappingData.r16ToR13[r16Var] || null
    }))
    .filter(mapping => mapping.r13 !== null)
}

/**
 * Cria um objeto de mapeamento bidirecional para uso em componentes
 *
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 * @returns {Object} - Objeto com funções utilitárias
 */
export const createMappingHelper = (mappingData) => {
  return {
    // Obtém variável da R13 correspondente a uma da R16
    getR13: (r16Var) => getWave1Variable(r16Var, mappingData),

    // Obtém variável da R16 correspondente a uma da R13
    getR16: (r13Var) => getWave2Variable(r13Var, mappingData),

    // Verifica se uma variável R16 tem correspondente
    hasR13: (r16Var) => hasWave1Mapping(r16Var, mappingData),

    // Lista todas as variáveis mapeadas
    allR16: () => getAllMappedR16Variables(mappingData),
    allR13: () => getAllMappedR13Variables(mappingData),

    // Mapeia array de variáveis
    mapToR13: (r16Vars) => mapVariablesToWave1(r16Vars, mappingData),

    // Dados brutos
    raw: mappingData
  }
}

/**
 * Debug: Imprime o mapeamento de forma legível no console
 *
 * @param {Object} mappingData - Dados de mapeamento vindos da API
 */
export const debugPrintMapping = (mappingData) => {
  if (!mappingData) {
    console.log('⚠️ Mapeamento não disponível')
    return
  }

  console.group('📋 Mapeamento de Perguntas R13 ↔ R16')

  const r16Vars = getAllMappedR16Variables(mappingData)
  console.log(`Total de variáveis mapeadas: ${r16Vars.length}`)

  console.table(
    r16Vars.slice(0, 20).map(r16Var => ({
      'Rodada 16': r16Var,
      'Rodada 13': mappingData.r16ToR13[r16Var]
    }))
  )

  if (r16Vars.length > 20) {
    console.log(`... e mais ${r16Vars.length - 20} variáveis`)
  }

  console.groupEnd()
}
