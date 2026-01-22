// src/utils/dateUtils.js

/**
 * Mapeia número do mês para nome abreviado
 */
const MONTH_NAMES = { // eslint-disable-line no-unused-vars
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez"
}

/**
 * Mapeia nome completo do mês para abreviado
 */
const FULL_MONTH_TO_SHORT = {
  "Janeiro": "Jan",
  "Fevereiro": "Fev",
  "Março": "Mar",
  "Abril": "Abr",
  "Maio": "Mai",
  "Junho": "Jun",
  "Julho": "Jul",
  "Agosto": "Ago",
  "Setembro": "Set",
  "Outubro": "Out",
  "Novembro": "Nov",
  "Dezembro": "Dez"
}



/**
 * Formata data da API para exibição
 * @param {string} apiDate - Data da API (ex: "Mai./25")
 * @returns {string} - Data formatada (ex: "Maio/25")
 */
export const formatApiDateForDisplay = (apiDate) => {
  if (!apiDate) return ""
  
  // Remove pontos e normaliza
  let cleaned = apiDate.replace(/\./g, "").trim()
  
  // Se já está no formato desejado (Mai/25), converte para Maio/25
  const shortMatch = cleaned.match(/^(\w{3})\/(\d{2})$/)
  if (shortMatch) {
    const [, shortMonth, year] = shortMatch
    // Encontrar o mês completo baseado na abreviação
    const fullMonth = Object.keys(FULL_MONTH_TO_SHORT).find(
      full => FULL_MONTH_TO_SHORT[full] === shortMonth
    )
    return fullMonth ? `${fullMonth}/${year}` : apiDate
  }
  
  return apiDate
}

/**
 * Busca a data de uma rodada específica baseado no número da rodada
 * @param {number|string} roundNumber - Número da rodada
 * @param {Array} allQuestionsData - Array com dados de todas as questões
 * @returns {string|null} - Data formatada ou null se não encontrada
 */
export const getDateByRound = (roundNumber, allQuestionsData) => {
  if (!allQuestionsData?.data?.questions || !roundNumber) {
    return null
  }

  const questions = allQuestionsData.data.questions
  const targetRound = roundNumber.toString()

  // Procurar por uma questão que tenha o número da rodada e uma data
  const questionWithDate = questions.find(q => 
    q.surveyNumber?.toString() === targetRound && q.date
  )

  if (questionWithDate?.date) {
    return formatDateString(questionWithDate.date)
  }

  return null
}

/**
 * Formata uma string de data para o formato abreviado
 * @param {string} dateString - String de data (ex: "Mai./25", "Maio 2025")
 * @returns {string} - Data formatada (ex: "Mai/25")
 */
export const formatDateString = (dateString) => {
  if (!dateString) return ""

  // Remove pontos e normaliza
  let cleaned = dateString.replace(/\./g, "").trim()

  // Tenta extrair mês e ano de diferentes formatos
  // Formato: "Mai 25" ou "Mai 2025"
  const shortMatch = cleaned.match(/^(\w{3})\s*(\d{2,4})$/)
  if (shortMatch) {
    const [, month, year] = shortMatch
    const shortYear = year.length === 4 ? year.slice(-2) : year
    return `${month}/${shortYear}`
  }

  // Formato: "Maio 2025"
  const fullMatch = cleaned.match(/^(\w+)\s*(\d{4})$/)
  if (fullMatch) {
    const [, fullMonth, year] = fullMatch
    const shortMonth = FULL_MONTH_TO_SHORT[fullMonth] || fullMonth.slice(0, 3)
    const shortYear = year.slice(-2)
    return `${shortMonth}/${shortYear}`
  }

  // Se já está no formato desejado, retorna como está
  if (cleaned.match(/^\w{3}\/\d{2}$/)) {
    return cleaned
  }

  return dateString
}

/**
 * Formata o label da rodada com data
 * @param {number|string} roundNumber - Número da rodada
 * @param {Array} allQuestionsData - Array com dados de todas as questões
 * @returns {string} - Label formatado (ex: "Rodada 44 - Mai/25")
 */
export const formatRoundLabel = (roundNumber, allQuestionsData) => {
  const dateStr = getDateByRound(roundNumber, allQuestionsData)
  
  if (dateStr) {
    return `Rodada ${roundNumber} - ${dateStr}`
  }
  
  return `Rodada ${roundNumber}`
}

/**
 * Cria um mapa de rodadas para datas para uso eficiente
 * @param {Array} allQuestionsData - Array com dados de todas as questões
 * @returns {Map} - Mapa com número da rodada como chave e data como valor
 */
export const createRoundToDateMap = (allQuestionsData) => {
  const map = new Map()
  
  if (!allQuestionsData?.data?.questions) {
    return map
  }

  const questions = allQuestionsData.data.questions

  // Agrupar por surveyNumber e pegar a primeira data encontrada
  const surveyDates = {}
  questions.forEach(q => {
    if (q.surveyNumber && q.date && !surveyDates[q.surveyNumber]) {
      surveyDates[q.surveyNumber] = formatDateString(q.date)
    }
  })

  // Converter para Map
  Object.entries(surveyDates).forEach(([roundNumber, date]) => {
    map.set(roundNumber.toString(), date)
  })

  return map
}