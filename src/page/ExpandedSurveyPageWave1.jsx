"use client"

import { useMemo, useCallback } from "react"
import { Container, Card, Button, Alert, Spinner, Badge } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import CommonHeader from "../components/CommonHeader"
import { ApiMethods } from "../service/ApiBase"
import { RESPONSE_ORDER } from "../utils/chartUtils"
import "./ThemeQuestionsPage.css"

export default function ExpandedSurveyPageWave1() {
  const navigate = useNavigate()

  // Buscar índice de perguntas da Rodada 13 (Onda 1)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wave1SurveyIndex"],
    queryFn: ApiMethods.getWave1SurveyIndex,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Buscar dados brutos da Rodada 13 (Onda 1)
  const { data: rawData, isLoading: isLoadingRawData } = useQuery({
    queryKey: ["wave1SurveyData"],
    queryFn: ApiMethods.getWave1SurveyData,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  })

  // Processar respostas possíveis dos dados brutos
  const responsesMap = useMemo(() => {
    if (!rawData?.data?.values) return new Map()

    const map = new Map()
    const values = rawData.data.values
    const headers = values[0]

    headers.forEach((header, columnIndex) => {
      if (!header) return

      const uniqueResponses = new Set()

      for (let i = 1; i < values.length; i++) {
        const response = values[i][columnIndex]
        if (response && response.trim() !== '' && response.trim() !== '#NULL!' && response.trim() !== '-1') {
          uniqueResponses.add(response.trim())
        }
      }

      const responsesArray = Array.from(uniqueResponses)

      responsesArray.sort((a, b) => {
        const indexA = RESPONSE_ORDER.indexOf(a)
        const indexB = RESPONSE_ORDER.indexOf(b)
        if (indexA >= 0 && indexB >= 0) return indexA - indexB
        if (indexA >= 0) return -1
        if (indexB >= 0) return 1
        return a.localeCompare(b)
      })

      if (responsesArray.length > 0 && responsesArray.length <= 15) {
        map.set(header, responsesArray)
      }
    })

    return map
  }, [rawData])

  // Agrupar perguntas idênticas com rótulos diferentes
  const filteredQuestions = useMemo(() => {
    if (!data?.data) return []

    const questionMap = new Map()

    // Primeiro, identificar perguntas "Outros" e suas principais
    const othersMap = new Map()

    data.data.forEach((question) => {
      const variable = question.variable
      const questionText = question.questionText?.trim() || ""

      if (questionText.toLowerCase() === "outros") {
        let mainVariable = null

        const simpleMatch = variable.match(/^(P\d+)_(\d+)$/)
        if (simpleMatch) {
          const baseVar = simpleMatch[1]
          const number = simpleMatch[2]
          const letter = String.fromCharCode(64 + parseInt(number))
          mainVariable = `${baseVar}_${letter}`
        }

        const outMatch = variable.match(/^(.+)_OUT$/)
        if (outMatch) {
          mainVariable = outMatch[1]
        }

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
        'P10_1', 'P10_2',                     // "Outros" de P10_A e P10_B
        'P22_1_OUT', 'P22_2_OUT',             // "Outros" de P22 (saúde)
        'P24_1_OUT', 'P24_2_OUT',             // "Outros" de P24 (educação)
        'P27_1_OUT', 'P27_2_OUT',             // "Outros" de P27 (segurança)
        'P32_1_OUT', 'P32_2_OUT',             // "Outros" de P32 (economia)
      ]
      if (excludedVariables.includes(variable)) {
        return // Pular esta pergunta
      }

      // ESPECIAL: Agrupar P22_1 e P22_2 como uma única pergunta "Problema da saúde pública"
      const isP22Question = variable === 'P22_1' || variable === 'P22_2'
      if (isP22Question) {
        const p22Key = "Atualmente, qual o principal problema da saúde pública no Brasil? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p22Key)) {
          questionMap.set(p22Key, {
            questionText: p22Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }

        const group = questionMap.get(p22Key)

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
        }

        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return
      }

      // ESPECIAL: Agrupar P24_1 e P24_2 - Educação pública
      const isP24Question = variable === 'P24_1' || variable === 'P24_2'
      if (isP24Question) {
        const p24Key = "Atualmente, qual o principal problema da educação pública do país? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"
        if (!questionMap.has(p24Key)) {
          questionMap.set(p24Key, {
            questionText: p24Key, variables: [], labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample, methodology: question.methodology, date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }
        const group = questionMap.get(p24Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P27_1 e P27_2 - Segurança pública
      const isP27Question = variable === 'P27_1' || variable === 'P27_2'
      if (isP27Question) {
        const p27Key = "Atualmente, qual o principal problema da segurança pública no país? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"
        if (!questionMap.has(p27Key)) {
          questionMap.set(p27Key, {
            questionText: p27Key, variables: [], labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample, methodology: question.methodology, date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }
        const group = questionMap.get(p27Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P32_1 e P32_2 - Economia do Brasil
      const isP32Question = variable === 'P32_1' || variable === 'P32_2'
      if (isP32Question) {
        const p32Key = "Atualmente, qual o principal problema da economia do BRASIL? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"
        if (!questionMap.has(p32Key)) {
          questionMap.set(p32Key, {
            questionText: p32Key, variables: [], labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample, methodology: question.methodology, date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }
        const group = questionMap.get(p32Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P34_O1 e P34_O2 - Problema do mundo do trabalho
      const isP34Question = variable === 'P34_O1' || variable === 'P34_O2'
      if (isP34Question) {
        const p34Key = "E em relação ao emprego? Qual é na sua opinião o principal problema do mundo do trabalho hoje no Brasil? E o segundo principal problema?"
        if (!questionMap.has(p34Key)) {
          questionMap.set(p34Key, {
            questionText: p34Key, variables: [], labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample, methodology: question.methodology, date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }
        const group = questionMap.get(p34Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P36_O1 e P36_O2 - Preocupação economia pessoal
      const isP36Question = variable === 'P36_O1' || variable === 'P36_O2'
      if (isP36Question) {
        const p36Key = "E, atualmente, qual destas é a sua principal preocupação com a sua economia pessoal? E a segunda?"
        if (!questionMap.has(p36Key)) {
          questionMap.set(p36Key, {
            questionText: p36Key, variables: [], labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample, methodology: question.methodology, date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'],
          })
        }
        const group = questionMap.get(p36Key)
        if (!group.variables.includes(variable)) {
          group.variables.push(variable)
          const responses = responsesMap.get(variable)
          if (responses && responses.length > 0) {
            responses.forEach(resp => { if (!group.possibleResponses.includes(resp)) group.possibleResponses.push(resp) })
          }
        }
        if (question.label && !group.labels.includes(question.label)) group.labels.push(question.label)
        return
      }

      // ESPECIAL: Agrupar P09_O1 e P09_O2 como uma única pergunta "Meio de comunicação"
      const isP09OQuestion = variable === 'P09_O1' || variable === 'P09_O2'
      if (isP09OQuestion) {
        const p09Key = "Qual é o principal meio de comunicação pelo qual você se informa sobre o que acontece com o Governo Federal? E o segundo principal meio?"

        if (!questionMap.has(p09Key)) {
          questionMap.set(p09Key, {
            questionText: p09Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'], // Forçar como pergunta fechada
          })
        }

        const group = questionMap.get(p09Key)

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
        }

        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return // Não processar mais, já adicionamos ao grupo P09
      }

      // ESPECIAL: Agrupar P10_A e P10_B como uma única pergunta "Problemas do Brasil"
      // P10_A = "principal problema" (Primeiro), P10_B = "segundo principal problema" (Segundo)
      // Ambas devem ser combinadas no mesmo gráfico com soma de menções
      const isP10ABQuestion = variable === 'P10_A' || variable === 'P10_B'
      if (isP10ABQuestion) {
        const p10Key = "Pensando nos problemas DO BRASIL, qual é o principal problema do País atualmente? (ESPONTÂNEA E ÚNICA; PRÉ CATEGORIZADA)"

        if (!questionMap.has(p10Key)) {
          questionMap.set(p10Key, {
            questionText: p10Key,
            variables: [],
            labels: [],
            index: question.index || "Pesquisa Ampliada - Onda 1",
            sample: question.sample,
            methodology: question.methodology,
            date: question.date,
            possibleResponses: ['__FORCE_CLOSED__'], // Forçar como pergunta fechada (não é aberta)
          })
        }

        const group = questionMap.get(p10Key)

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
        }

        // Adicionar label se existe
        if (question.label && !group.labels.includes(question.label)) {
          group.labels.push(question.label)
        }

        return // Não processar mais, já adicionamos ao grupo P10
      }

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
          possibleResponses: [],
        })
      }

      const group = questionMap.get(key)

      if (question.variable && !group.variables.includes(question.variable)) {
        group.variables.push(question.variable)

        const responses = responsesMap.get(question.variable)
        if (responses && responses.length > 0) {
          responses.forEach(resp => {
            if (!group.possibleResponses.includes(resp)) {
              group.possibleResponses.push(resp)
            }
          })
        }
      }

      if (question.label && !group.labels.includes(question.label)) {
        group.labels.push(question.label)
      }
    })

    const questionsArray = Array.from(questionMap.values())

    questionsArray.sort((a, b) => {
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

      return (a.variables[0] || "").localeCompare(b.variables[0] || "")
    })

    console.log(`📊 Total de perguntas Onda 1: ${questionsArray.length}`)

    return questionsArray
  }, [data, responsesMap])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  const handleQuestionClick = useCallback((question) => {
    const params = new URLSearchParams({
      variables: JSON.stringify(question.variables),
      questionText: question.questionText,
      pageTitle: "F2F Brasil - Pesquisa Ampliada - Onda 1 (Mai/25)",
    })

    const isOpenQuestion = !question.possibleResponses || question.possibleResponses.length === 0

    if (isOpenQuestion) {
      navigate(`/pesquisa-ampliada/f2f/rodada-13/dashboard/open?${params.toString()}`)
    } else {
      navigate(`/pesquisa-ampliada/f2f/rodada-13/dashboard?${params.toString()}`)
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
                <h1 className="main-title">F2F Brasil - Pesquisa Ampliada - Onda 1 (Mai/25)</h1>
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="back-button">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar dados</Alert.Heading>
              <p>{error?.message}</p>
              <Button variant="outline-danger" onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </Alert>
          )}

          {(isLoading || isLoadingRawData) && !error && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">
                {isLoading
                  ? "Carregando perguntas da pesquisa..."
                  : "Processando respostas possíveis..."}
              </p>
            </div>
          )}

          {!isLoading && !isLoadingRawData && !error && (
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
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                          </div>

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
