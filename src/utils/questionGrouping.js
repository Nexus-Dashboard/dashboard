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