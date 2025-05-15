// Ordem fixa para as respostas
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
  
  // Mapas de cores para diferentes tipos de respostas - Cores padronizadas
  export const responseColorMap = {
    // Respostas positivas (cores frias)
    Ótimo: "#0088FE", // Azul forte
    Bom: "#00C49F", // Verde-água
    "Regular mais para positivo": "#4CAF50", // Verde
  
    // Respostas neutras
    Regular: "#FFBB28", // Amarelo
  
    // Respostas negativas (cores quentes)
    "Regular mais para negativo": "#FF9800", // Laranja
    Ruim: "#FF5722", // Laranja escuro
    Péssimo: "#F44336", // Vermelho
  
    // Outros
    "Não sabe": "#9E9E9E", // Cinza
    "Não respondeu": "#607D8B", // Azul acinzentado
  
    Aprova: "#3F51B5", // Azul índigo (positivo)
    Desaprova: "#E91E63", // Rosa (negativo)
  }
  
  // Função para obter cor com base na resposta
  export const getResponseColor = (response) => {
    return responseColorMap[response] || "#9c27b0" // Roxo para respostas não mapeadas
  }
  
  // Função para normalizar respostas
  export const normalizeAnswer = (raw) => {
    const s = String(raw || "").trim()
    if (/^não sabe/i.test(s)) return "Não sabe"
    if (/^não respond/i.test(s)) return "Não respondeu"
    return s || "Não respondeu"
  }
  
  // Função para ordenar as séries de dados
  export const sortChartData = (chartData) => {
    return [...chartData].sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a.id)
      const indexB = RESPONSE_ORDER.indexOf(b.id)
  
      // Se ambos estão na lista de ordem, usar essa ordem
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB
      }
  
      // Se apenas um está na lista, priorizar o que está
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1
  
      // Se nenhum está na lista, manter a ordem alfabética
      return a.id.localeCompare(b.id)
    })
  }  