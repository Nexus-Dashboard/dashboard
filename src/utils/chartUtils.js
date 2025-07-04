// Ordem correta para as respostas (do melhor para o pior) - PARA LEGENDAS
export const RESPONSE_ORDER = [
  "Ótimo",
  "Bom",
  "Regular mais para positivo",
  "Regular",
  "Regular mais para negativo",
  "Ruim",
  "Péssimo",
  "Aprova",
  "Desaprova",
  "Não sabe",
  "Não respondeu",
]

// Mapas de cores CORRETOS
export const responseColorMap = {
  // Respostas positivas - VERDE
  Ótimo: "#28a745",
  Bom: "#28a745",
  "Regular mais para positivo": "#ffc107",

  // Respostas neutras - AMARELO
  Regular: "#ffc107",

  // Respostas negativas - VERMELHO
  "Regular mais para negativo": "#dc3545",
  Ruim: "#dc3545",
  Péssimo: "#dc3545",

  // Outros - CINZA
  "Não sabe": "#6c757d",
  "Não respondeu": "#6c757d",
  "NS/NR": "#6c757d",

  // Aprovação
  Aprova: "#28a745",
  Desaprova: "#dc3545",
}

// Função para obter cor com base na resposta
export const getResponseColor = (response) => {
  return responseColorMap[response] || "#6c757d"
}

// Função para normalizar respostas
export const normalizeAnswer = (raw) => {
  const s = String(raw || "")
    .trim()
    .replace(/\s*$$NÃO LER$$\s*/i, "")
  if (/^não sabe/i.test(s)) return "Não sabe"
  if (/^não respond/i.test(s)) return "Não respondeu"
  return s || "Não respondeu"
}

// Função para ordenar as séries de dados
export const sortChartData = (chartData) => {
  return [...chartData].sort((a, b) => {
    const indexA = RESPONSE_ORDER.indexOf(a.id)
    const indexB = RESPONSE_ORDER.indexOf(b.id)

    if (indexA >= 0 && indexB >= 0) {
      return indexA - indexB
    }

    if (indexA >= 0) return -1
    if (indexB >= 0) return 1

    return a.id.localeCompare(b.id)
  })
}

// Função para extrair o peso de uma resposta
export const extractWeight = (response) => {
  const weightKey = Object.keys(response).find((key) => key.includes("weights") || key.includes("weight"))

  if (weightKey && response[weightKey]) {
    const weight = Number.parseFloat(response[weightKey])
    return isNaN(weight) ? 1 : weight
  }

  return 1
}

// Função para formatar o título da pesquisa
export const formatSurveyTitle = (survey) => {
  const { name, month, year } = survey

  const surveyNumberMatch = name?.match(/\b(?:survey|pesquisa)\s*(\d+)/i)
  const surveyNumber = surveyNumberMatch ? surveyNumberMatch[1] : ""

  if (surveyNumber && month && year) {
    return `Pesquisa ${surveyNumber} ${month} ${year}`
  } else if (month && year) {
    return `${month} ${year}`
  } else if (name) {
    return name
  } else {
    return `Pesquisa ${survey._id.substring(0, 6)}`
  }
}

// Função para agrupar respostas
export const groupResponses = (response) => {
  const normalized = normalizeAnswer(response)

  if (["Ótimo", "Bom"].includes(normalized)) {
    return "Ótimo/Bom"
  }

  if (["Regular", "Regular mais para positivo", "Regular mais para negativo"].includes(normalized)) {
    return "Regular"
  }

  if (["Ruim", "Péssimo"].includes(normalized)) {
    return "Ruim/Péssimo"
  }

  if (["Não sabe", "Não respondeu"].includes(normalized)) {
    return "NS/NR"
  }

  return normalized
}

// Função para verificar se uma pergunta deve usar agrupamento
export const shouldGroupResponses = (responses) => {
  const uniqueResponses = new Set(responses.map((r) => normalizeAnswer(r)))
  const groupableResponses = ["Ótimo", "Bom", "Regular", "Ruim", "Péssimo", "Não sabe", "Não respondeu"]

  const hasGroupableResponses = groupableResponses.filter((r) => uniqueResponses.has(r)).length >= 4

  return hasGroupableResponses
}

// Cores para respostas agrupadas - CORRETAS
export const groupedResponseColorMap = {
  "Ótimo/Bom": "#28a745", // Verde
  Regular: "#ffc107", // Amarelo
  "Ruim/Péssimo": "#dc3545", // Vermelho
  "NS/NR": "#6c757d", // Cinza
  Aprova: "#28a745", // Verde
  Desaprova: "#dc3545", // Vermelho
}

// Ordem para respostas agrupadas (do melhor para o pior) - CORRIGIDA PARA LEGENDAS
export const GROUPED_RESPONSE_ORDER = ["Ótimo/Bom", "Regular", "Ruim/Péssimo", "NS/NR", "Aprova", "Desaprova"]

// Função para agregar respostas (mantida para compatibilidade)
export const aggregateResponses = (answer) => {
  if (["Ótimo", "Bom"].includes(answer)) return "Ótimo/Bom"
  if (["Ruim", "Péssimo"].includes(answer)) return "Ruim/Péssimo"
  if (["Não sabe", "Não respondeu"].includes(answer)) return "NS/NR"
  return answer
}
