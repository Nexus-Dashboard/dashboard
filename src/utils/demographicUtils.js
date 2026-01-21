export const DEMOGRAPHIC_LABELS = {
  REGIAO: "Região",
  UF: "UF",
  PF1: "Sexo",
  PF2: "Faixa Etária",
  PF2_FAIXAS: "Faixas Etárias",
  PF3: "Escolaridade",
  PF4: "Renda Familiar",
  PF5: "Vínculo Formal",
  PF6: "Tipo de trabalho",
  PF7: "Possui CNPJ",
  PF8: "Classificação do Trabalho",
  PF9: "Possui CNPJ",
  PF10: "Possui CNPJ",
  PF13: "Faixa de Renda",
  "Faixa de idade": "Faixa de idade",
}

export const filterByDemographics = (data, filters) => {
  if (!data || Object.keys(filters).length === 0) {
    return data
  }

  const filterEntries = Object.entries(filters)

  return data.filter((item) => {
    return filterEntries.every(([key, values]) => {
      const itemValue = item[key]
      return values.includes(itemValue)
    })
  })
}

export const DEMOGRAPHIC_R16 = {
  REGIAO: "Região",
  UF: "UF",
  PF1: "Sexo",
  PF2: "Idade",
  PF2_FAIXAS: "Faixas Etárias",
  PF3: "Escolaridade",
  PF4: "Tipo de trabalho",
  PF4_B:"Trabalho nos ultimos 6 meses",
  PF5: "Classificação do Trabalho remunerado",
  PF6: "Tipo de vínculo trabalhista",
  PF7: "Possui CNPJ",
  PF8: "Ocupação Principal  ",
  PF9: "Procurou emprego nos ultimos 30 dias",
  PF12: "Alguem recebe bolsa familia na familia",
  PF12_B: "Há 3 anos alguém recebia bolsa família na família",
  PF13: "Renda mensal",
  PF13_B: "Renda mensal em 2022",
  PF14: "Renda familiar",
  PF15: "Religião",
  PF16: "COR/RAÇA",
  "Faixa de idade": "Faixa de idade",
}

/**
 * Colunas demográficas unificadas para filtros entre R13 e R16
 * Estas são as colunas agrupadas que existem em ambas as rodadas
 */
export const UNIFIED_DEMOGRAPHIC_COLUMNS = [
  {
    // Coluna com nome igual em ambas as rodadas
    column: "Sub-regiões",
    label: "Sub-regiões",
    r13Column: "Sub-regiões",
    r16Column: "Sub-regiões"
  },
  {
    column: "Faixa Etária",
    label: "Faixa Etária",
    r13Column: "Faixa Etária",
    r16Column: "Faixa Etária"
  },
  {
    column: "Escolaridade",
    label: "Escolaridade",
    r13Column: "Escolaridade",
    r16Column: "Escolaridade"
  },
  {
    column: "Tipo de Eleitor",
    label: "Tipo de Eleitor",
    r13Column: "Tipo de Eleitor",
    r16Column: "Tipo de Eleitor"
  },
  {
    column: "Renda Familiar",
    label: "Renda Familiar",
    r13Column: "Renda Familiar",
    r16Column: "Renda Familiar"
  },
  {
    column: "Religião Agrupada",
    label: "Religião Agrupada",
    r13Column: "Religião Agrupada",
    r16Column: "Religião Agrupada"
  },
  {
    // Raça/Cor tem nomes diferentes nas rodadas
    column: "Raça/Cor",
    label: "Raça/Cor",
    r13Column: "PF17",
    r16Column: "PF16"
  }
]

/**
 * Mapeamento de colunas R13 -> R16 para filtros unificados
 */
export const R13_TO_R16_COLUMN_MAP = {
  "Sub-regiões": "Sub-regiões",
  "Faixa Etária": "Faixa Etária",
  "Escolaridade": "Escolaridade",
  "Tipo de Eleitor": "Tipo de Eleitor",
  "Renda Familiar": "Renda Familiar",
  "Religião Agrupada": "Religião Agrupada",
  "PF17": "PF16" // Raça/Cor
}

/**
 * Mapeamento de colunas R16 -> R13 para filtros unificados
 */
export const R16_TO_R13_COLUMN_MAP = {
  "Sub-regiões": "Sub-regiões",
  "Faixa Etária": "Faixa Etária",
  "Escolaridade": "Escolaridade",
  "Tipo de Eleitor": "Tipo de Eleitor",
  "Renda Familiar": "Renda Familiar",
  "Religião Agrupada": "Religião Agrupada",
  "PF16": "PF17" // Raça/Cor
}
