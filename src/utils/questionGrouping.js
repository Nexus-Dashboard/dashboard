// Utilitários para agrupamento de perguntas por tipo de resposta

// Função para criar uma chave única baseada nas possíveis respostas
export const createAnswerTypeKey = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "no-answers"
  }
  
  // Ordenar e criar hash das respostas para agrupar perguntas similares
  const sortedLabels = possibleAnswers
    .map(answer => answer.label)
    .sort()
    .join("|")
  
  return btoa(sortedLabels).substring(0, 10) // Base64 truncado para chave única
}

// Função para obter título do grupo baseado no tipo de resposta
export const getAnswerTypeTitle = (possibleAnswers) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return "Perguntas Abertas"
  }

  const labels = possibleAnswers.map(a => a.label.toLowerCase())
  
  // Detectar tipos comuns de resposta
  if (labels.some(l => l.includes("ótimo") && l.includes("péssimo"))) {
    return "Avaliação (Ótimo a Péssimo)"
  }
  if (labels.some(l => l.includes("aprova") && l.includes("desaprova"))) {
    return "Aprovação/Desaprovação"
  }
  if (labels.some(l => l.includes("sim") && l.includes("não"))) {
    return "Sim/Não"
  }
  if (labels.some(l => l.includes("muito") && l.includes("pouco"))) {
    return "Intensidade (Muito/Pouco)"
  }
  if (labels.some(l => l.includes("melhor") && l.includes("pior"))) {
    return "Comparação (Melhor/Pior)"
  }
  if (labels.some(l => l.includes("facebook") || l.includes("instagram") || l.includes("twitter"))) {
    return "Redes Sociais"
  }
  if (labels.some(l => l.includes("tv") || l.includes("rádio") || l.includes("jornal"))) {
    return "Meios de Comunicação"
  }
  
  return `Múltipla Escolha (${possibleAnswers.length} opções)`
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

  const labels = possibleAnswers.map(a => a.label.toLowerCase())
  
  if (labels.some(l => l.includes("ótimo") && l.includes("péssimo"))) {
    return "success"
  }
  if (labels.some(l => l.includes("aprova") && l.includes("desaprova"))) {
    return "warning"
  }
  if (labels.some(l => l.includes("sim") && l.includes("não"))) {
    return "info"
  }
  if (labels.some(l => l.includes("muito") && l.includes("pouco"))) {
    return "primary"
  }
  
  return "primary"
}

// Função principal para agrupar perguntas por tipo de resposta
export const groupQuestionsByAnswerType = (questions) => {
  const groups = {}

  questions.forEach((question) => {
    // Criar uma chave baseada nas possíveis respostas
    const answerKey = createAnswerTypeKey(question.possibleAnswers || [])
    
    if (!groups[answerKey]) {
      groups[answerKey] = {
        key: answerKey,
        title: getAnswerTypeTitle(question.possibleAnswers || []),
        description: getAnswerTypeDescription(question.possibleAnswers || []),
        color: getAnswerTypeColor(question.possibleAnswers || []),
        questions: [],
        sampleAnswers: question.possibleAnswers || []
      }
    }
    
    groups[answerKey].questions.push(question)
  })

  // Ordenar grupos por prioridade (avaliação primeiro, depois aprovação, etc.)
  const groupPriority = {
    "Avaliação (Ótimo a Péssimo)": 1,
    "Aprovação/Desaprovação": 2,
    "Sim/Não": 3,
    "Intensidade (Muito/Pouco)": 4,
    "Comparação (Melhor/Pior)": 5,
    "Redes Sociais": 6,
    "Meios de Comunicação": 7,
    "Perguntas Abertas": 99
  }

  const sortedGroups = Object.values(groups).sort((a, b) => {
    const priorityA = groupPriority[a.title] || 50
    const priorityB = groupPriority[b.title] || 50
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Se mesma prioridade, ordenar por número de perguntas (maior primeiro)
    return b.questions.length - a.questions.length
  })

  return sortedGroups.reduce((acc, group) => {
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
    largestGroup: groups.reduce((max, group) => 
      group.questions.length > max.questions.length ? group : max, 
      { questions: [] }
    ),
    averageQuestionsPerGroup: Math.round(questions.length / groups.length),
    groupDistribution: groups.map(group => ({
      title: group.title,
      count: group.questions.length,
      percentage: Math.round((group.questions.length / questions.length) * 100)
    }))
  }
}

// =============================================================================
// NOVAS FUNÇÕES PARA ORDENAÇÃO DE LEGENDAS EM GRÁFICOS
// =============================================================================

// Ordem de prioridade para legendas de gráficos (do melhor para o pior)
export const CHART_LEGEND_ORDER = [
  // Respostas agrupadas (ordem preferencial)
  "Ótimo/Bom",
  "Regular", 
  "Ruim/Péssimo",
  "NS/NR",
  
  // Respostas individuais (fallback)
  "Ótimo",
  "Bom", 
  "Regular mais para positivo",
  "Regular",
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
  
  // Neutros/Não sei (sempre por último)
  "Não sabe",
  "Não respondeu"
]

/**
 * Cria uma legenda ordenada para gráficos baseada nas séries disponíveis
 * @param {Array} chartData - Array de séries do gráfico (formato Nivo)
 * @param {Function} colorFunction - Função para obter cores das séries
 * @returns {Array} Array de objetos de legenda ordenados
 */
export const createOrderedChartLegend = (chartData, colorFunction) => {
  if (!chartData || chartData.length === 0) return []
  
  const availableSeries = chartData.map(serie => serie.id)
  const orderedLegend = []
  
  // Primeiro: adicionar itens na ordem de prioridade
  CHART_LEGEND_ORDER.forEach(item => {
    if (availableSeries.includes(item)) {
      const serie = chartData.find(s => s.id === item)
      orderedLegend.push({
        id: item,
        label: item,
        color: colorFunction ? colorFunction({ id: item }) : serie.color || "#000"
      })
    }
  })
  
  // Segundo: adicionar séries que não estão na ordem predefinida (alfabeticamente)
  const remainingSeries = availableSeries.filter(serieId => 
    !CHART_LEGEND_ORDER.includes(serieId)
  ).sort()
  
  remainingSeries.forEach(serieId => {
    const serie = chartData.find(s => s.id === serieId)
    orderedLegend.push({
      id: serieId,
      label: serieId,
      color: colorFunction ? colorFunction({ id: serieId }) : serie.color || "#000"
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