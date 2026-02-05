"use client"

import { useMemo, useCallback } from "react"
import { Container, Card, Button, Alert, Spinner, Badge } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, TrendingUp } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import { ApiMethods } from "../service/ApiBase"
import { RESPONSE_ORDER } from "../utils/chartUtils"
import { getWave1Variable } from "../utils/questionMappingUtils"
import "./ThemeQuestionsPage.css"

export default function ExpandedSurveyPage() {
  const navigate = useNavigate()

  // Buscar índice de perguntas da Rodada 16 (Onda 2)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expandedSurveyIndex"],
    queryFn: ApiMethods.getExpandedSurveyIndex,
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  })

  // Buscar dados brutos da Rodada 16 (Onda 2)
  const { data: rawData, isLoading: isLoadingRawData } = useQuery({
    queryKey: ["expandedSurveyData"],
    queryFn: ApiMethods.getExpandedSurveyData,
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  })

  // Buscar mapeamento de perguntas entre R13 e R16
  // Este mapeamento define quais perguntas da R16 têm correspondente na R13 para comparativo
  const { data: questionMapping, isLoading: isLoadingMapping } = useQuery({
    queryKey: ["questionMapping"],
    queryFn: ApiMethods.getQuestionMapping,
    staleTime: 1000 * 60 * 60, // 1 hora (mapeamento muda raramente)
    refetchOnWindowFocus: false,
  })

  // Processar respostas possíveis dos dados brutos
  const responsesMap = useMemo(() => {
    if (!rawData?.data?.values) return new Map()

    const map = new Map()
    const values = rawData.data.values
    const headers = values[0] // Primeira linha são os headers

    // Processar cada coluna (variável)
    headers.forEach((header, columnIndex) => {
      if (!header) return

      const uniqueResponses = new Set()

      // Percorrer todas as linhas (exceto header) para coletar respostas únicas
      for (let i = 1; i < values.length; i++) {
        const response = values[i][columnIndex]
        if (response && response.trim() !== '') {
          uniqueResponses.add(response.trim())
        }
      }

      // Armazenar apenas se tiver até 10 respostas únicas
      const responsesArray = Array.from(uniqueResponses)

      // Ordenar usando RESPONSE_ORDER
      responsesArray.sort((a, b) => {
        const indexA = RESPONSE_ORDER.indexOf(a)
        const indexB = RESPONSE_ORDER.indexOf(b)

        // Se ambos estão na lista de ordem, ordenar por posição
        if (indexA >= 0 && indexB >= 0) {
          return indexA - indexB
        }

        // Se apenas A está na lista, A vem primeiro
        if (indexA >= 0) return -1

        // Se apenas B está na lista, B vem primeiro
        if (indexB >= 0) return 1

        // Se nenhum está na lista, ordenar alfabeticamente
        return a.localeCompare(b)
      })

      if (responsesArray.length > 0 && responsesArray.length <= 15) {
        map.set(header, responsesArray)
      }
    })

    return map
  }, [rawData])

  // NOTA: wave1ResponsesMap e wave1QuestionsMap foram removidos
  // O mapeamento de perguntas agora vem da planilha de mapeamento (questionMapping)
  // que já valida se as perguntas são equivalentes entre R13 e R16

  // Agrupar perguntas idênticas com rótulos diferentes
  const filteredQuestions = useMemo(() => {
    if (!data?.data) return []

    const questionMap = new Map()

    // Primeiro, identificar perguntas "Outros" e suas principais
    const othersMap = new Map() // Mapeia variável "Outros" -> texto da pergunta principal

    data.data.forEach((question) => {
      const variable = question.variable
      const questionText = question.questionText?.trim() || ""

      // Detectar se é uma pergunta "Outros" (complementar)
      if (questionText.toLowerCase() === "outros") {
        // Padrões para identificar a pergunta principal:
        // P9_1 -> P9_A ou P9_B
        // P9_2 -> P9_B
        // P21_1_OUT -> P21_1
        // P21_2_OUT -> P21_2

        let mainVariable = null

        // Caso 1: P9_1 ou P9_2 -> buscar P9_A, P9_B, etc.
        const simpleMatch = variable.match(/^(P\d+)_(\d+)$/)
        if (simpleMatch) {
          const baseVar = simpleMatch[1]
          const number = simpleMatch[2]

          // Mapear número para letra: 1->A, 2->B, 3->C, etc.
          const letter = String.fromCharCode(64 + parseInt(number))
          mainVariable = `${baseVar}_${letter}`
        }

        // Caso 2: P21_1_OUT ou P21_2_OUT -> buscar P21_1 ou P21_2
        const outMatch = variable.match(/^(.+)_OUT$/)
        if (outMatch) {
          mainVariable = outMatch[1]
        }

        // Buscar a pergunta principal
        if (mainVariable) {
          const mainQuestion = data.data.find(q =>
            q.variable === mainVariable && q.questionText?.trim().toLowerCase() !== "outros"
          )

          if (mainQuestion) {
            othersMap.set(variable, mainQuestion.questionText?.trim() || "")
          }
        }
      }
    })

    data.data.forEach((question) => {
      const variable = question.variable
      const questionText = question.questionText?.trim() || ""

      // Filtrar perguntas excluídas
      const excludedVariables = [
        'T_P18_1_1', 'T_P18_1_2',           // Perguntas removidas da análise
        'P9_1', 'P9_2',                       // "Outros" de P9_A e P9_B
        'P21_1_OUT', 'P21_2_OUT',             // "Outros" de P21 (saúde)
        'P23_1_OUT', 'P23_2_OUT',             // "Outros" de P23 (educação)
        'P26_1_OUT', 'P26_2_OUT',             // "Outros" de P26 (segurança)
        'P31_1_OUT', 'P31_2_OUT',             // "Outros" de P31 (economia)
      ]
      if (excludedVariables.includes(variable)) {
        return // Pular esta pergunta
      }

      // ESPECIAL: Agrupar perguntas P28 (violência) em uma única pergunta
      // P28_O1, P28_O2, ..., P28_O8, P28_OUT devem ser agrupadas
      const isP28Question = variable.match(/^P28_O\d+$/) || variable === 'P28_OUT'
      if (isP28Question) {
        const p28Key = "Nos últimos 12 meses, você foi vítima de algum tipo de violência ou outro crime? Qual tipo de violência ou crime você foi vítima?"

        if (!questionMap.has(p28Key)) {
          questionMap.set(p28Key, {
            questionText: p28Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 195",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: [],
            hasWaveComparison: false,
            wave1Variables: [],
            isP28Group: true, // Marcador especial para tratamento diferente
            p28Items: [] // Array para armazenar os itens de P28
          })
        }

        const group = questionMap.get(p28Key)

        // Adicionar variável
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)

          // Adicionar item com label
          group.p28Items.push({
            variable: variable,
            label: question.label || questionText,
            questionText: questionText
          })

          // Buscar respostas possíveis
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => {
              if (!group.possibleResponses.includes(resp)) {
                group.possibleResponses.push(resp)
              }
            })
          }

          // Verificar mapeamento para Wave 1
          const mappingData = questionMapping?.data
          const wave1Variable = getWave1Variable(variable, mappingData)
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) {
              group.wave1Variables.push(wave1Variable)
            }
          }
        }

        return // Não processar mais, já adicionamos ao grupo P28
      }

      // ESPECIAL: Agrupar P21_1 e P21_2 como uma única pergunta "Problema da saúde pública"
      // P21_1 = primeiro problema, P21_2 = segundo problema
      // Na onda 1 (R13), as equivalentes são P22_1 e P22_2
      const isP21Question = variable === 'P21_1' || variable === 'P21_2'
      if (isP21Question) {
        const p21Key = "Atualmente, qual o principal problema da saúde pública no Brasil? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p21Key)) {
          questionMap.set(p21Key, {
            questionText: p21Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p21Key)

        if (!group.variables.includes(variable)) {
          group.variables.push(variable)

          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => {
              if (!group.possibleResponses.includes(resp)) {
                group.possibleResponses.push(resp)
              }
            })
          }

          // Mapeamento manual para onda 1: P21_1 → P22_1, P21_2 → P22_2
          const p21ToP22Map = { 'P21_1': 'P22_1', 'P21_2': 'P22_2' }
          const wave1Variable = p21ToP22Map[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) {
              group.wave1Variables.push(wave1Variable)
            }
          }
        }

        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return
      }

      // ESPECIAL: Agrupar P23_1 e P23_2 - Educação pública
      // Na onda 1 (R13): P24_1 e P24_2
      const isP23Question = variable === 'P23_1' || variable === 'P23_2'
      if (isP23Question) {
        const p23Key = "Atualmente, qual o principal problema da educação pública do país? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p23Key)) {
          questionMap.set(p23Key, {
            questionText: p23Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p23Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
          const mapWave1 = { 'P23_1': 'P24_1', 'P23_2': 'P24_2' }
          const wave1Variable = mapWave1[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) group.wave1Variables.push(wave1Variable)
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P26_1 e P26_2 - Segurança pública
      // Na onda 1 (R13): P27_1 e P27_2
      const isP26Question = variable === 'P26_1' || variable === 'P26_2'
      if (isP26Question) {
        const p26Key = "Atualmente, qual o principal problema da segurança pública no país? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p26Key)) {
          questionMap.set(p26Key, {
            questionText: p26Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p26Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
          const mapWave1 = { 'P26_1': 'P27_1', 'P26_2': 'P27_2' }
          const wave1Variable = mapWave1[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) group.wave1Variables.push(wave1Variable)
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P31_1 e P31_2 - Economia do Brasil
      // Na onda 1 (R13): P32_1 e P32_2
      const isP31Question = variable === 'P31_1' || variable === 'P31_2'
      if (isP31Question) {
        const p31Key = "Atualmente, qual o principal problema da economia do BRASIL? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p31Key)) {
          questionMap.set(p31Key, {
            questionText: p31Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p31Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
          const mapWave1 = { 'P31_1': 'P32_1', 'P31_2': 'P32_2' }
          const wave1Variable = mapWave1[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) group.wave1Variables.push(wave1Variable)
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P33_O1 e P33_O2 - Problema do mundo do trabalho
      // Na onda 1 (R13): P34_O1 e P34_O2
      const isP33Question = variable === 'P33_O1' || variable === 'P33_O2'
      if (isP33Question) {
        const p33Key = "E em relação ao emprego? Qual é na sua opinião o principal problema do mundo do trabalho hoje no Brasil? E o segundo principal problema?"

        if (!questionMap.has(p33Key)) {
          questionMap.set(p33Key, {
            questionText: p33Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p33Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
          const mapWave1 = { 'P33_O1': 'P34_O1', 'P33_O2': 'P34_O2' }
          const wave1Variable = mapWave1[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) group.wave1Variables.push(wave1Variable)
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P35_O1 e P35_O2 - Preocupação economia pessoal
      // Na onda 1 (R13): P36_O1 e P36_O2
      const isP35Question = variable === 'P35_O1' || variable === 'P35_O2'
      if (isP35Question) {
        const p35Key = "E, atualmente, qual destas é a sua principal preocupação com a sua economia pessoal? E a segunda?"

        if (!questionMap.has(p35Key)) {
          questionMap.set(p35Key, {
            questionText: p35Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p35Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
          const mapWave1 = { 'P35_O1': 'P36_O1', 'P35_O2': 'P36_O2' }
          const wave1Variable = mapWave1[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) group.wave1Variables.push(wave1Variable)
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P7_O1 e P7_O2 como uma única pergunta "Meio de comunicação"
      // P7_O1 = "principal meio" (Primeiro), P7_O2 = "segundo principal meio" (Segundo)
      // Na onda 1 (R13), as equivalentes são P09_O1 e P09_O2
      const isP7OQuestion = variable === 'P7_O1' || variable === 'P7_O2'
      if (isP7OQuestion) {
        const p7Key = "Qual é o principal meio de comunicação pelo qual você se informa sobre o que acontece com o Governo Federal? E o segundo principal meio?"

        if (!questionMap.has(p7Key)) {
          questionMap.set(p7Key, {
            questionText: p7Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'], // Forçar como pergunta fechada
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p7Key)

        if (!group.variables.includes(variable)) {
          group.variables.push(variable)

          // Buscar respostas possíveis
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => {
              if (!group.possibleResponses.includes(resp)) {
                group.possibleResponses.push(resp)
              }
            })
          }

          // Mapeamento manual para onda 1: P7_O1 → P09_O1, P7_O2 → P09_O2
          const p7ToP09Map = { 'P7_O1': 'P09_O1', 'P7_O2': 'P09_O2' }
          const wave1Variable = p7ToP09Map[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) {
              group.wave1Variables.push(wave1Variable)
            }
          }
        }

        // Adicionar label se existe
        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return // Não processar mais, já adicionamos ao grupo P7
      }

      // ESPECIAL: Agrupar P9_A e P9_B como uma única pergunta "Problemas do Brasil"
      // P9_A = "principal problema" (Primeiro), P9_B = "segundo principal problema" (Segundo)
      // Ambas devem ser combinadas no mesmo gráfico com soma de menções
      // Na onda 1 (R13), as equivalentes são P10_A e P10_B
      const isP9ABQuestion = variable === 'P9_A' || variable === 'P9_B'
      if (isP9ABQuestion) {
        const p9Key = "Pensando nos problemas DO BRASIL, qual é o principal problema do País atualmente? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p9Key)) {
          questionMap.set(p9Key, {
            questionText: p9Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 11",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'], // Forçar como pergunta fechada (não é aberta)
            hasWaveComparison: false,
            wave1Variables: [],
          })
        }

        const group = questionMap.get(p9Key)

        if (!group.variables.includes(variable)) {
          group.variables.push(variable)

          // Buscar respostas possíveis
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => {
              if (!group.possibleResponses.includes(resp)) {
                group.possibleResponses.push(resp)
              }
            })
          }

          // Mapeamento manual para onda 1: P9_A → P10_A, P9_B → P10_B
          const p9ToP10Map = { 'P9_A': 'P10_A', 'P9_B': 'P10_B' }
          const wave1Variable = p9ToP10Map[variable]
          if (wave1Variable) {
            group.hasWaveComparison = true
            if (!group.wave1Variables.includes(wave1Variable)) {
              group.wave1Variables.push(wave1Variable)
            }
          }
        }

        // Adicionar label se existe
        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return // Não processar mais, já adicionamos ao grupo P9
      }

      // ESPECIAL: Agrupar perguntas _2 e _2_OUT com suas _1 correspondentes
      // Exemplos: P21_2 deve ser agrupado com P21_1, P21_2_OUT com P21_1_OUT
      // Detectar padrão: P##_2 ou P##_2_OUT
      const secondMentionMatch = variable.match(/^(P\d+)_2(_OUT)?$/)
      if (secondMentionMatch) {
        const baseVar = secondMentionMatch[1] // Ex: P21
        const hasOut = secondMentionMatch[2] // _OUT ou undefined
        const firstMentionVar = `${baseVar}_1${hasOut || ''}` // Ex: P21_1 ou P21_1_OUT

        // Buscar a pergunta _1 correspondente para usar seu texto
        const firstMentionQuestion = data.data.find(q => q.variable === firstMentionVar)

        if (firstMentionQuestion) {
          // Usar o texto da pergunta _1 como chave para agrupar
          const mainQuestionText = firstMentionQuestion.questionText?.trim() || ""

          // Se a pergunta _1 é "Outros", buscar no othersMap
          let key = mainQuestionText
          if (mainQuestionText.toLowerCase() === "outros" && othersMap.has(firstMentionVar)) {
            key = othersMap.get(firstMentionVar)
          }

          // Criar ou obter o grupo
          if (!questionMap.has(key)) {
            questionMap.set(key, {
              questionText: key,
              variables: [],
              labels: [],
              index: firstMentionQuestion.index || "Sem Categoria",
              sample: firstMentionQuestion.sample,
              methodology: firstMentionQuestion.methodology,
              date: firstMentionQuestion.date,
              possibleResponses: [],
              hasWaveComparison: false,
              wave1Variables: [],
            })
          }

          const group = questionMap.get(key)

          // Adicionar variável _2 ao grupo (será processada junto com _1)
          if (!group.variables.includes(variable)) {
            group.variables.push(variable)

            // Buscar respostas possíveis
            const responses = responsesMap.get(variable)
            if (responses && responses.length > 0) {
              responses.forEach(resp => {
                if (!group.possibleResponses.includes(resp)) {
                  group.possibleResponses.push(resp)
                }
              })
            }

            // Verificar mapeamento para Wave 1
            const mappingData = questionMapping?.data
            const wave1Variable = getWave1Variable(variable, mappingData)
            if (wave1Variable) {
              group.hasWaveComparison = true
              if (!group.wave1Variables.includes(wave1Variable)) {
                group.wave1Variables.push(wave1Variable)
              }
            }
          }

          return // Não processar mais, já adicionamos ao grupo da _1
        }
      }

      // Se é uma pergunta "Outros", usar o texto da pergunta principal como key
      let key = questionText
      if (questionText.toLowerCase() === "outros" && othersMap.has(variable)) {
        key = othersMap.get(variable)
      }

      if (!questionMap.has(key)) {
        questionMap.set(key, {
          questionText: key,
          variables: [],
          labels: [],
          index: question.index || "Sem Categoria",
          sample: question.sample,
          methodology: question.methodology,
          date: question.date,
          possibleResponses: [], // NOVO: respostas possíveis
          hasWaveComparison: false, // NOVO: indica se tem comparação entre ondas
          wave1Variables: [], // NOVO: variáveis da Onda 1 correspondentes
        })
      }

      const group = questionMap.get(key)

      // Adicionar variável se ainda não existe
      if (question.variable && !group.variables.includes(question.variable)) {
        group.variables.push(question.variable)

        // Buscar respostas possíveis para essa variável
        const responses = responsesMap.get(question.variable)
        if (responses && responses.length > 0) {
          // Combinar respostas de todas as variáveis da pergunta
          responses.forEach(resp => {
            if (!group.possibleResponses.includes(resp)) {
              group.possibleResponses.push(resp)
            }
          })
        }

        // NOVO: Usar o mapeamento da API para encontrar a variável correspondente na Onda 1
        // O mapeamento define qual variável da R13 corresponde a qual variável da R16
        // A planilha de mapeamento já valida que as perguntas são equivalentes
        // (Texto Pergunta Igual = VERDADEIRO, Rótulo Igual = VERDADEIRO)
        const mappingData = questionMapping?.data
        const wave1Variable = getWave1Variable(question.variable, mappingData)

        if (wave1Variable) {
          // Encontrou mapeamento! A planilha já garante que são perguntas equivalentes
          // Não precisamos validar respostas - o mapeamento é a fonte de verdade
          if (!group.hasWaveComparison) {
            console.log(`✅ Variável ${question.variable} (R16) → ${wave1Variable} (R13) tem mapeamento para comparação`)
          }
          group.hasWaveComparison = true
          // Armazenar a variável da Onda 1 correspondente (pode ter nome diferente!)
          if (!group.wave1Variables.includes(wave1Variable)) {
            group.wave1Variables.push(wave1Variable)
          }
        }
      }

      // Adicionar label se existe e ainda não foi adicionado
      if (question.label && !group.labels.includes(question.label)) {
        group.labels.push(question.label)
      }
    })

    // Converter para array e ordenar por variável
    const questionsArray = Array.from(questionMap.values())

    questionsArray.sort((a, b) => {
      // Extrair número da variável (P1, P2, T_P10_1, etc.)
      const extractNumber = (vars) => {
        if (!vars || vars.length === 0) return 9999
        const firstVar = vars[0]
        const match = firstVar.match(/\d+/)
        return match ? parseInt(match[0]) : 9999
      }

      const numA = extractNumber(a.variables)
      const numB = extractNumber(b.variables)

      if (numA !== numB) {
        return numA - numB
      }

      // Se os números são iguais, ordenar alfabeticamente pela variável completa
      return (a.variables[0] || "").localeCompare(b.variables[0] || "")
    })

    // Log de resumo
    const withComparison = questionsArray.filter(q => q.hasWaveComparison)
    console.log(`📊 Total de perguntas: ${questionsArray.length}`)
    console.log(`📊 Com comparação entre ondas: ${withComparison.length}`)
    if (withComparison.length > 0) {
      console.log('   Primeiras 5 com comparação:', withComparison.slice(0, 5).map(q => q.variables[0]))
    }

    return questionsArray
  }, [data, responsesMap, questionMapping])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  const handleQuestionClick = useCallback((question) => {
    const params = new URLSearchParams({
      variables: JSON.stringify(question.variables),
      questionText: question.questionText,
      pageTitle: "F2F Brasil - Pesquisa Ampliada - Onda 2 (Nov/25)",
      hasWaveComparison: question.hasWaveComparison ? "true" : "false",
      wave1Variables: JSON.stringify(question.wave1Variables || [])
    })

    // Verificar se é pergunta aberta (sem possibleResponses ou com muitas respostas)
    const isOpenQuestion = !question.possibleResponses || question.possibleResponses.length === 0

    if (isOpenQuestion) {
      // Redirecionar para dashboard de perguntas abertas
      navigate(`/pesquisa-ampliada/f2f/rodada-16/dashboard/open?${params.toString()}`)
    } else {
      // Redirecionar para dashboard normal
      navigate(`/pesquisa-ampliada/f2f/rodada-16/dashboard?${params.toString()}`)
    }
  }, [navigate])

  return (
    <div className="questions-page-wrapper">
      <CommonHeader />

      <main className="content-area">
        <Container>
          <div className="page-title-section">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="main-title">F2F Brasil - Pesquisa Ampliada - Onda 2 (Nov/25)</h1>                
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="back-button">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>


          {/* Estado de erro */}
          {error && (
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar dados</Alert.Heading>
              <p>{error?.message}</p>
              <Button variant="outline-danger" onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </Alert>
          )}

          {/* Estado de carregamento */}
          {(isLoading || isLoadingRawData || isLoadingMapping) && !error && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">
                {isLoading
                  ? "Carregando perguntas da pesquisa..."
                  : isLoadingMapping
                  ? "Carregando mapeamento de perguntas comparativas..."
                  : isLoadingRawData
                  ? "Processando respostas possíveis..."
                  : "Carregando dados..."}
              </p>
            </div>
          )}

          {/* Lista de perguntas */}
          {!isLoading && !isLoadingRawData && !isLoadingMapping && !error && (
            <>
              {filteredQuestions.length === 0 ? (
                <div className="empty-state">
                  <h4>Nenhuma pergunta encontrada</h4>
                  <p>Não há perguntas disponíveis para esta pesquisa.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredQuestions.map((question, idx) => (
                    <Card
                      key={`question-${idx}`}
                      className="question-card"
                      onClick={() => handleQuestionClick(question)}
                      style={{
                        cursor: 'pointer',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0d6efd'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#dee2e6'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <Card.Body style={{
                        position: 'relative',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px'
                      }}>
                        {/* Conteúdo principal - alinhado à esquerda */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Variáveis */}
                          <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                            {question.variables.sort().map((variable, vIdx) => (
                              <Badge
                                key={`var-${vIdx}`}
                                bg="dark"
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 'normal',
                                  padding: '4px 10px'
                                }}
                              >
                                {variable}
                              </Badge>
                            ))}
                            {/* Badge de comparação entre ondas */}
                            {question.hasWaveComparison && (
                              <Badge
                                bg="success"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  padding: '4px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: '#198754'
                                }}
                              >
                                <TrendingUp size={12} />
                                Comparativo Onda 1 (Mai/25) x Onda 2 (Nov/25)
                              </Badge>
                            )}
                          </div>

                          {/* Texto da pergunta */}
                          <p style={{
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            color: '#212529',
                            margin: 0,
                            marginBottom: '8px',
                            textAlign: 'left'
                          }}>
                            {question.questionText || "Pergunta sem texto disponível"}
                          </p>

                          {/* Labels (rótulos) - se existirem */}
                          {question.labels.length > 0 && (
                            <div className="mb-2 d-flex align-items-start gap-2">
                              <span style={{
                                fontSize: '0.85rem',
                                color: '#6c757d',
                                fontWeight: '500',
                                minWidth: 'fit-content'
                              }}>
                                Rótulos:
                              </span>
                              <div className="d-flex flex-wrap gap-1">
                                {question.labels.map((label, lIdx) => (
                                  <Badge
                                    key={`label-${lIdx}`}
                                    bg="secondary"
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 'normal',
                                      padding: '3px 8px',
                                      backgroundColor: '#6c757d'
                                    }}
                                  >
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Respostas possíveis */}
                          {question.possibleResponses && question.possibleResponses.length > 0 ? (
                            <div className="mb-2 d-flex align-items-start gap-2">
                              <span style={{
                                fontSize: '0.85rem',
                                color: '#6c757d',
                                fontWeight: '500',
                                minWidth: 'fit-content'
                              }}>
                                Respostas:
                              </span>
                              <div className="d-flex flex-wrap gap-1">
                                {question.possibleResponses.map((response, rIdx) => (
                                  <Badge
                                    key={`response-${rIdx}`}
                                    bg="info"
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 'normal',
                                      padding: '3px 8px',
                                      backgroundColor: '#0dcaf0'
                                    }}
                                  >
                                    {response}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2">
                              <Badge
                                bg="warning"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 'normal',
                                  padding: '3px 8px',
                                  backgroundColor: '#ffc107',
                                  color: '#000'
                                }}
                              >
                                Pergunta Aberta
                              </Badge>
                            </div>
                          )}

                          {/* Informações adicionais */}
                          <div className="d-flex gap-3 flex-wrap" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                            {question.index && (
                              <span>
                                <strong>Índice:</strong> {question.index}
                              </span>
                            )}
                            {question.sample && (
                              <span>
                                <strong>Amostra:</strong> {question.sample}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botão de ação - fixo no lado direito */}
                        <div style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            style={{
                              minWidth: '100px'
                            }}
                          >
                            Analisar
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p className="mb-0">Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}
