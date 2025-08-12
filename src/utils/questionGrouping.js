// Utilitários para agrupamento de perguntas por tipo de resposta

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
  // ... (outras lógicas existentes)

  return `Múltipla Escolha (${possibleAnswers.length} opções)`
}

// =============================================================================
// NOVA CONFIGURAÇÃO PARA O MAPA INTERATIVO
// =============================================================================

/**
 * Define as cores base para respostas específicas.
 * A chave deve ser a resposta normalizada (ex: "Aprova", "Desaprova").
 */
export const MAP_RESPONSE_BASE_COLORS = {
  // Respostas positivas - VERDE
  Ótimo: "#28a745",
  Bom: "#28a745",
  "Regular mais para positivo": "#28a745",
  "Melhorar muito": "#28a745",
  "Melhorar um pouco": "#8ccc9b",
  Aprova: "#28a745",

  // Respostas neutras - AMARELO
  Regular: "#ffc107",
  "Ficar igual": "#ffc107",

  // Respostas negativas - VERMELHO
  "Regular mais para negativo": "#dc3545",
  Ruim: "#dc3545",
  Péssimo: "#dc3545",
  "Piorar um pouco": "#dc3545",
  "Piorar muito": "#810814",
  Desaprova: "#dc3545",

  // Outros - CINZA
  "Não sabe": "#6c757d",
  "Não respondeu": "#6c757d",
  "NS/NR": "#6c757d",
}

/**
 * Ordem de exibição das respostas na caixa de seleção do mapa.
 * As respostas não listadas aqui aparecerão depois, em ordem alfabética.
 */
export const MAP_RESPONSE_ORDER = [
  "Melhorar muito",
    "Melhorar um pouco",
    "Ficar igual",
    "Piorar um pouco",
    "Piorar muito",
    "Ótimo",
    "Bom",
    "Regular mais para positivo",
    "Regular",
    "Regular mais para negativo",
    "Ruim",
    "Péssimo",
    "Aprova",
    "Desaprova",
    "NS/NR",
    "Não sabe",
    "Não respondeu",
]

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
  // ... lógica original
  const groups = {}

  questions.forEach((question) => {
    const answerKey = createAnswerTypeKey(question.possibleAnswers || [])
    if (!groups[answerKey]) {
      groups[answerKey] = {
        key: answerKey,
        title: getAnswerTypeTitle(question.possibleAnswers || []),
        // ...outras propriedades
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
// NOVAS FUNÇÕES PARA ORDENAÇÃO DE LEGENDAS EM GRÁFICOS
// =============================================================================

/**
 * Ordena um array de respostas com base na ordem definida em MAP_RESPONSE_ORDER.
 * @param {string[]} responses - Array de respostas a serem ordenadas.
 * @returns {string[]} - Array de respostas ordenado.
 */
export const sortMapResponses = (responses) => {
  // ADICIONAR: Filtrar valores null/undefined antes de ordenar
  const validResponses = responses.filter(response => 
    response !== null && 
    response !== undefined && 
    response !== ""
  )
  
  return validResponses.sort((a, b) => {
    // ADICIONAR: Proteção adicional contra valores inválidos
    if (!a || !b) return 0
    
    const indexA = MAP_RESPONSE_ORDER.indexOf(a)
    const indexB = MAP_RESPONSE_ORDER.indexOf(b)

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB // Ambos estão na lista, ordenar por índice
    }
    if (indexA !== -1) {
      return -1 // A está na lista, B não -> A vem primeiro
    }
    if (indexB !== -1) {
      return 1 // B está na lista, A não -> B vem primeiro
    }
    
    // ATUALIZAR: Verificar se ambos são strings antes de localeCompare
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b) // Nenhum está na lista, ordenar alfabeticamente
    }
    
    return 0 // Fallback se houver problemas
  })
}

// Ordem de prioridade para legendas de gráficos (do melhor para o pior)
export const CHART_LEGEND_ORDER = [
  // Respostas agrupadas (ordem preferencial)
  "Ótimo/Bom",
  "Regular",
  "Ruim/Péssimo",
  
  // Respostas individuais (fallback)
  "Ótimo",
  "Bom",
  "Regular mais para positivo",
  "Regular mais para negativo",
  "Ruim",
  "Péssimo",

  // Aprovação
  "Aprova",
  "Desaprova",

  // Outros
  "Sim",
  "Não",
  "Muito",
  "Pouco",
  "Melhor",
  "Pior",

  // Outros
  "Melhorar muito",
  "Melhorar um pouco",
  "Ficar igual",
  "Piorar um pouco",
  "Piorar muito",

  // Neutros/Não sei (sempre por último)
  "NS/NR",
  "Não sabe",
  "Não respondeu",
]

/**
 * Cria uma legenda ordenada para gráficos baseada nas séries disponíveis
 * @param {Array} chartData - Array de séries do gráfico (formato Nivo)
 * @param {Function} colorFunction - Função para obter cores das séries
 * @returns {Array} Array de objetos de legenda ordenados
 */
export const createOrderedChartLegend = (chartData, colorFunction) => {
  if (!chartData || chartData.length === 0) return []

  const availableSeries = chartData.map((serie) => serie.id)
  const orderedLegend = []

  // Primeiro: adicionar itens na ordem de prioridade
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

  // Segundo: adicionar séries que não estão na ordem predefinida (alfabeticamente)
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

/**
 * Obtém a ordem de prioridade de uma resposta específica
 * @param {string} response - Nome da resposta
 * @returns {number} Índice de prioridade (menor = maior prioridade)
 */
export const getResponsePriority = (response) => {
  const index = CHART_LEGEND_ORDER.indexOf(response)
  return index === -1 ? 999 : index // Itens não encontrados vão para o final
}

/**
 * Ordena um array de respostas pela ordem de prioridade
 * @param {Array} responses - Array de strings com nomes das respostas
 * @returns {Array} Array ordenado pela prioridade
 */
export const sortResponsesByPriority = (responses) => {
  return [...responses].sort((a, b) => {
    const priorityA = getResponsePriority(a)
    const priorityB = getResponsePriority(b)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Se mesma prioridade, ordenar alfabeticamente
    return a.localeCompare(b)
  })
}
