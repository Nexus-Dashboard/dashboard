// Utilitários para agrupamento de perguntas por tipo de resposta
import { RESPONSE_ORDER } from './chartUtils'

// Função para criar uma chave única baseada nas possíveis respostas
export const createAnswerTypeKey = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "no-answers"
  }

  // Ordenar e criar hash das respostas para agrupar perguntas similares
  const sortedLabels = possibleAnswers
    .map((answer) => answer.label)
    .sort()
    .join("|")

  return btoa(sortedLabels).substring(0, 10) // Base64 truncado para chave única
}

// Função para obter título do grupo baseado no tipo de resposta
export const getAnswerTypeTitle = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "Perguntas Abertas"
  }

  const labels = possibleAnswers.map((a) => a.label.toLowerCase())

  // Detectar tipos comuns de resposta
  if (labels.some((l) => l.includes("ótimo") && l.includes("péssimo"))) {
    return "Avaliação (Ótimo a Péssimo)"
  }
  if (labels.some((l) => l.includes("aprova") && l.includes("desaprova"))) {
    return "Aprovação/Desaprovação"
  }
  if (labels.some((l) => l.includes("sim") && l.includes("não"))) {
    return "Sim/Não"
  }

  return `Múltipla Escolha (${possibleAnswers.length} opções)`
}

// =============================================================================
// CONFIGURAÇÃO PARA O MAPA INTERATIVO
// =============================================================================

/**
 * Define as cores base para respostas específicas.
 */
export const MAP_RESPONSE_BASE_COLORS = {
  // Respostas positivas - azul
  Ótimo: "#334D99",
  Bom: "#4D66CC",
  "Regular mais para positivo": "#334D99",
  "Melhorar muito": "#334D99",
  "Melhorar um pouco": "#4D66CC",
  "Ótimo/Bom": "#334D99",

  // Respostas neutras - laranja
  Regular: "#CC804D",
  "Ficar igual": "#CC804D",

  // Respostas negativas - VERMELHO
  "Regular mais para negativo": "#B33333",
  Ruim: "#B33333",
  Péssimo: "#801A1A",
  "Piorar um pouco": "#B33333",
  "Piorar muito": "#801A1A",
  "Ruim/Péssimo": "#B33333",

  // Outros - CINZA
  "Não sabe": "#999999",
  "Não respondeu": "#999999",
  "NS/NR": "#999999",

  // Aprovação
  Aprova: "#334D99",
  Desaprova: "#B33333",
}

// Função para obter descrição do grupo
export const getAnswerTypeDescription = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "Perguntas com respostas em texto livre"
  }

  return `${possibleAnswers.length} opções de resposta disponíveis`
}

// Função para obter cor do grupo baseada no tipo de resposta
export const getAnswerTypeColor = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "secondary"
  }

  const labels = possibleAnswers.map((a) => a.label.toLowerCase())

  if (labels.some((l) => l.includes("ótimo") && l.includes("péssimo"))) {
    return "success"
  }
  if (labels.some((l) => l.includes("aprova") && l.includes("desaprova"))) {
    return "warning"
  }
  if (labels.some((l) => l.includes("sim") && l.includes("não"))) {
    return "info"
  }
  if (labels.some((l) => l.includes("muito") && l.includes("pouco"))) {
    return "primary"
  }

  return "primary"
}

// Função principal para agrupar perguntas por tipo de resposta
export const groupQuestionsByAnswerType = (questions) => {
  const groups = {}

  questions.forEach((question) => {
    const answerKey = createAnswerTypeKey(question.possibleAnswers || [])
    if (!groups[answerKey]) {
      groups[answerKey] = {
        key: answerKey,
        title: getAnswerTypeTitle(question.possibleAnswers || []),
        questions: [],
      }
    }
    groups[answerKey].questions.push(question)
  })
  return Object.values(groups).reduce((acc, group) => {
    acc[group.key] = group
    return acc
  }, {})
}

// Função para verificar se duas perguntas têm o mesmo tipo de resposta
export const haveSameAnswerType = (question1, question2) => {
  const key1 = createAnswerTypeKey(question1.possibleAnswers || [])
  const key2 = createAnswerTypeKey(question2.possibleAnswers || [])
  return key1 === key2
}

// Função para obter estatísticas dos grupos
export const getGroupingStats = (questions) => {
  const grouped = groupQuestionsByAnswerType(questions)
  const groups = Object.values(grouped)

  return {
    totalQuestions: questions.length,
    totalGroups: groups.length,
    largestGroup: groups.reduce((max, group) => (group.questions.length > max.questions.length ? group : max), {
      questions: [],
    }),
    averageQuestionsPerGroup: Math.round(questions.length / groups.length),
    groupDistribution: groups.map((group) => ({
      title: group.title,
      count: group.questions.length,
      percentage: Math.round((group.questions.length / questions.length) * 100),
    })),
  }
}

// =============================================================================
// FUNÇÕES PARA ORDENAÇÃO DE RESPOSTAS NO MAPA
// =============================================================================

/**
 * ATUALIZADO: Ordena respostas usando RESPONSE_ORDER do chartUtils.js
 * @param {string[]} responses - Array de respostas a serem ordenadas.
 * @returns {string[]} - Array de respostas ordenado.
 */
export const sortMapResponses = (responses) => {
  const validResponses = responses.filter(response => 
    response !== null && 
    response !== undefined && 
    response !== ""
  )
  
  return validResponses.sort((a, b) => {
    if (!a || !b) return 0
    
    const indexA = RESPONSE_ORDER.indexOf(a)
    const indexB = RESPONSE_ORDER.indexOf(b)

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    if (indexA !== -1) {
      return -1
    }
    if (indexB !== -1) {
      return 1
    }
    
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b)
    }
    
    return 0
  })
}

// Ordem de prioridade para legendas de gráficos
export const CHART_LEGEND_ORDER = [
  "Ótimo/Bom",
  "Regular",
  "Ruim/Péssimo",
  "Ótimo",
  "Bom",
  "Regular mais para positivo",
  "Regular mais para negativo",
  "Ruim",
  "Péssimo",
  "Aprova",
  "Desaprova",
  "Sim",
  "Não",
  "Muito",
  "Pouco",
  "Melhor",
  "Pior",
  "Melhorar muito",
  "Melhorar um pouco",
  "Ficar igual",
  "Piorar um pouco",
  "Piorar muito",
  "NS/NR",
  "Não sabe",
  "Não respondeu",
]

/**
 * Cria uma legenda ordenada para gráficos
 */
export const createOrderedChartLegend = (chartData, colorFunction) => {
  if (!chartData || chartData.length === 0) return []

  const availableSeries = chartData.map((serie) => serie.id)
  const orderedLegend = []

  CHART_LEGEND_ORDER.forEach((item) => {
    if (availableSeries.includes(item)) {
      const serie = chartData.find((s) => s.id === item)
      orderedLegend.push({
        id: item,
        label: item,
        color: colorFunction ? colorFunction({ id: item }) : serie.color || "#000",
      })
    }
  })

  const remainingSeries = availableSeries.filter((serieId) => !CHART_LEGEND_ORDER.includes(serieId)).sort()

  remainingSeries.forEach((serieId) => {
    const serie = chartData.find((s) => s.id === serieId)
    orderedLegend.push({
      id: serieId,
      label: serieId,
      color: colorFunction ? colorFunction({ id: serieId }) : serie.color || "#000",
    })
  })

  return orderedLegend
}

export const getResponsePriority = (response) => {
  const index = CHART_LEGEND_ORDER.indexOf(response)
  return index === -1 ? 999 : index
}

export const sortResponsesByPriority = (responses) => {
  return [...responses].sort((a, b) => {
    const priorityA = getResponsePriority(a)
    const priorityB = getResponsePriority(b)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    return a.localeCompare(b)
  })
}