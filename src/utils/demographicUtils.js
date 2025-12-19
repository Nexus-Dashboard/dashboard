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
