export const DEMOGRAPHIC_LABELS = {
  REGIAO: "Região",
  UF: "UF",
  PF1: "Sexo",
  PF2: "Faixa Etária",
  PF2_FAIXAS: "Faixas Etárias",
  PF3: "Escolaridade",
  PF4: "Renda Familiar",
  PF5: "Religião",
  PF6: "Tipo de trabalho",
  PF7: "Trabalho Remunerado",
  PF8: "Classificação do Trabalho",
  PF9: "Vínculo Formal",
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
