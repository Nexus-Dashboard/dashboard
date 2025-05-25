"use client"

import { useState, useEffect, useMemo } from "react"
import { Container, Row, Col, Form, Button, Card, Alert } from "react-bootstrap"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  LabelList,
} from "recharts"
import DemographicFilters from "./DemographicFilters"
import ActiveFilters from "./ActiveFilters"
import { normalizeAnswer, getResponseColor, sortChartData, extractWeight, formatSurveyTitle } from "../utils/chartUtils"
import ApiBase from "../service/ApiBase"
import "./SurveyDashboard.css"
import LoadingState from "./LoadingState"
import ChartDownloadButton from "./ChartDownloadButton"
import SurveySummary from "./SurveySummary"
import DemographicComparisons from "./DemographicComparisons"

const SurveyDashboard = () => {
  // State variables
  const [surveys, setSurveys] = useState([])
  const [allResponses, setAllResponses] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState({ label: "", key: "", type: "" })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({})
  const [availableDemographics, setAvailableDemographics] = useState([])
  const [error, setError] = useState(null)
  const [showDemographicComparisons, setShowDemographicComparisons] = useState(false)

  // Fetch surveys and responses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null) // Reset error state

        // Fetch surveys
        const surveysResponse = await ApiBase.get("/api/surveys")
        const surveysData = surveysResponse.data
        setSurveys(surveysData)

        // Fetch responses for each survey
        const responsesMap = {}
        for (const survey of surveysData) {
          const responseData = await ApiBase.get(`/api/responsesFlat/${survey._id}`)
          responsesMap[survey._id] = responseData.data
        }
        setAllResponses(responsesMap)

        // Set default selected question if available
        if (surveysData.length > 0) {
          const firstSurvey = surveysData[0]
          const firstQuestion = firstSurvey.variables?.find(
            (v) => v.key.startsWith("P") && /^\d+$/.test(v.key.substring(1)),
          )
          if (firstQuestion) {
            setSelectedQuestion({
              label: firstQuestion.label,
              key: firstQuestion.key,
              type: firstQuestion.type,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Não foi possível carregar os dados. Por favor, tente novamente mais tarde.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Extract demographic variables
  useEffect(() => {
    if (surveys.length && Object.keys(allResponses).length) {
      // Find all demographic variables (PFxx)
      const demographicKeys = new Set()

      surveys.forEach((survey) => {
        const variables = survey.variables || []
        variables.forEach((variable) => {
          if (variable.key.startsWith("PF") && /^\d+$/.test(variable.key.substring(2))) {
            demographicKeys.add(variable.key)
          }
        })
      })

      // For each demographic variable, collect unique values
      const demographics = []

      demographicKeys.forEach((key) => {
        const uniqueValues = new Set()
        const surveyWithVar = surveys.find((s) => (s.variables || []).some((v) => v.key === key))

        if (surveyWithVar) {
          const variable = surveyWithVar.variables.find((v) => v.key === key)

          Object.values(allResponses).forEach((responses) => {
            responses.forEach((response) => {
              if (response[key]) {
                uniqueValues.add(response[key])
              }
            })
          })

          if (uniqueValues.size > 0) {
            demographics.push({
              key,
              label: variable?.label || key,
              values: Array.from(uniqueValues).sort(),
            })
          }
        }
      })

      setAvailableDemographics(demographics)
    }
  }, [surveys, allResponses])

  // Group questions by historical vs. unique
  const questionGroups = useMemo(() => {
    const labelMap = {}

    surveys.forEach((survey) => {
      ;(survey.variables || []).forEach((v) => {
        // Only include actual questions (P1, P2, etc.)
        if (v.key.startsWith("P") && /^\d+$/.test(v.key.substring(1))) {
          const label = v.label
          labelMap[label] = labelMap[label] || []
          labelMap[label].push({ key: v.key, survey })
        }
      })
    })

    const historic = []
    const unique = {}

    Object.entries(labelMap).forEach(([label, arr]) => {
      if (arr.length > 1) {
        // Questions that appear in multiple surveys
        historic.push({ label, entries: arr })
      } else {
        // Questions that appear in only one survey
        const sId = arr[0].survey._id
        unique[sId] = unique[sId] || { survey: arr[0].survey, entries: [] }
        unique[sId].entries.push({ label, key: arr[0].key })
      }
    })

    return {
      historic,
      unique: Object.values(unique),
    }
  }, [surveys])

  // Get the current survey for unique questions
  const currentSurvey = useMemo(() => {
    if (selectedQuestion.type !== "unique" || !selectedQuestion.key) return null

    return surveys.find((s) => (s.variables || []).some((v) => v.key === selectedQuestion.key))
  }, [selectedQuestion, surveys])

  // Get responses for the current survey
  const currentResponses = useMemo(() => {
    if (!currentSurvey) return []

    return allResponses[currentSurvey._id] || []
  }, [currentSurvey, allResponses])

  // Handle question selection
  const handleQuestionSelect = (e) => {
    const [type, key, label] = e.target.value.split("||")
    setSelectedQuestion({ type, key, label })
    setFilters({})
  }

  // Handle filter changes
  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[demographicKey] || []

      if (checked) {
        return {
          ...prevFilters,
          [demographicKey]: [...currentValues, value],
        }
      } else {
        return {
          ...prevFilters,
          [demographicKey]: currentValues.filter((v) => v !== value),
        }
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
  }

  // Calculate chart data based on selection and filters
  const chartData = useMemo(() => {
    if (!selectedQuestion.key || !selectedQuestion.label) return []

    if (selectedQuestion.type === "historic") {
      // Time series data across multiple surveys
      const relevantSurveys = surveys.filter((survey) =>
        (survey.variables || []).some((v) => v.key === selectedQuestion.key),
      )

      if (relevantSurveys.length === 0) return []

      // Sort surveys by date
      const sortedSurveys = [...relevantSurveys].sort((a, b) => {
        // First by year
        if (a.year !== b.year) return a.year - b.year

        // Then by month (convert month names to numbers)
        const monthOrder = {
          Janeiro: 1,
          Fevereiro: 2,
          Março: 3,
          Abril: 4,
          Maio: 5,
          Junho: 6,
          Julho: 7,
          Agosto: 8,
          Setembro: 9,
          Outubro: 10,
          Novembro: 11,
          Dezembro: 12,
        }

        const aMonth = monthOrder[a.month] || 0
        const bMonth = monthOrder[b.month] || 0

        return aMonth - bMonth
      })

      // Process each survey individually
      return sortedSurveys.map((survey) => {
        const responses = allResponses[survey._id] || []

        // Apply demographic filters
        const filteredResponses = responses.filter((response) => {
          return Object.entries(filters).every(([key, values]) => {
            if (!values.length) return true
            return values.includes(response[key])
          })
        })

        // Count responses for each option with weights
        const counts = {}
        let totalWeight = 0

        filteredResponses.forEach((response) => {
          const answer = normalizeAnswer(response[selectedQuestion.key])
          if (!answer) return

          const weight = extractWeight(response)
          counts[answer] = (counts[answer] || 0) + weight
          totalWeight += weight
        })

        // Calculate percentages
        const result = {
          surveyId: survey._id,
          surveyTitle: formatSurveyTitle(survey),
          date: `${survey.month || ""} ${survey.year || ""}`.trim(),
        }

        Object.entries(counts).forEach(([answer, count]) => {
          result[answer] = Math.round((count / totalWeight) * 1000) / 10 // One decimal place
        })

        return result
      })
    } else {
      // Single survey data
      const survey = surveys.find((s) => (s.variables || []).some((v) => v.key === selectedQuestion.key))

      if (!survey) return []

      const responses = allResponses[survey._id] || []
      const filteredResponses = responses.filter((response) => {
        // Apply demographic filters
        return Object.entries(filters).every(([key, values]) => {
          if (!values.length) return true
          return values.includes(response[key])
        })
      })

      // Count responses for each option with weights
      const counts = {}
      let totalWeight = 0

      filteredResponses.forEach((response) => {
        const answer = normalizeAnswer(response[selectedQuestion.key])
        if (!answer) return

        const weight = extractWeight(response)
        counts[answer] = (counts[answer] || 0) + weight
        totalWeight += weight
      })

      // Calculate percentages with one decimal place
      return Object.entries(counts).map(([response, count]) => ({
        response,
        count,
        percentage: Math.round((count / totalWeight) * 1000) / 10,
      }))
    }
  }, [selectedQuestion, surveys, allResponses, filters])

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (selectedQuestion.type !== "historic" || !chartData.length) return []

    // Extract all unique response options across all surveys
    const allOptions = new Set()
    chartData.forEach((dataPoint) => {
      Object.keys(dataPoint).forEach((key) => {
        if (key !== "surveyId" && key !== "surveyTitle" && key !== "date") {
          allOptions.add(key)
        }
      })
    })

    // Create series for each option
    return Array.from(allOptions).map((option) => ({
      id: option,
      color: getResponseColor(option),
      data: chartData.map((dataPoint) => ({
        x: dataPoint.surveyTitle || dataPoint.date,
        y: dataPoint[option] || 0,
        exactValue: dataPoint[option] || 0,
      })),
    }))
  }, [selectedQuestion, chartData])

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (selectedQuestion.type === "historic" || !chartData.length) return []

    // Sort by percentage descending
    return [...chartData].sort((a, b) => b.percentage - a.percentage)
  }, [selectedQuestion, chartData])

  // Custom tooltip formatter for line charts
  const lineChartTooltipFormatter = (value, name) => {
    return [`${value.toFixed(1)}%`, name]
  }

  // Custom tooltip formatter for bar charts
  const barChartTooltipFormatter = (value) => {
    return [`${value.toFixed(1)}%`]
  }

  // Toggle demographic comparisons
  const toggleDemographicComparisons = () => {
    setShowDemographicComparisons(!showDemographicComparisons)
  }

  if (loading) {
    return <LoadingState message="Carregando dados das pesquisas..." />
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Erro ao carregar dados</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid className="survey-dashboard p-3">
      <Row className="mb-4">
        <Col>
          <h1 className="dashboard-title">Dashboard de Pesquisas</h1>
          <p className="dashboard-subtitle">Análise de tendências de opinião pública</p>
        </Col>
      </Row>

      <Row className="mb-4 align-items-center">
        <Col md={8}>
          <Form.Group>
            <Form.Label className="fw-bold">Selecione uma pergunta:</Form.Label>
            <Form.Select
              value={
                selectedQuestion.type && selectedQuestion.key
                  ? `${selectedQuestion.type}||${selectedQuestion.key}||${selectedQuestion.label}`
                  : ""
              }
              onChange={handleQuestionSelect}
              className="question-select"
            >
              <option value="">Selecione uma pergunta</option>

              {questionGroups.historic.length > 0 && (
                <optgroup label="Perguntas com histórico">
                  {questionGroups.historic.map((q) => (
                    <option key={`historic-${q.label}`} value={`historic||${q.entries[0].key}||${q.label}`}>
                      {q.label}
                    </option>
                  ))}
                </optgroup>
              )}

              {questionGroups.unique.map((group) => (
                <optgroup
                  key={`unique-${group.survey._id}`}
                  label={`Perguntas únicas - ${group.survey.month} ${group.survey.year}`}
                >
                  {group.entries.map((entry) => (
                    <option key={`unique-${entry.key}`} value={`unique||${entry.key}||${entry.label}`}>
                      {entry.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={4} className="text-end">
          <Button
            variant={showFilters ? "primary" : "outline-primary"}
            onClick={() => setShowFilters(!showFilters)}
            className="toggle-filters-btn me-2"
          >
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </Button>

          {selectedQuestion.key && (
            <Button
              variant={showDemographicComparisons ? "primary" : "outline-primary"}
              onClick={toggleDemographicComparisons}
              className="toggle-demographic-btn"
            >
              {showDemographicComparisons ? "Ocultar análise demográfica" : "Mostrar análise demográfica"}
            </Button>
          )}
        </Col>
      </Row>

      {showFilters && (
        <Row className="mb-4">
          <Col>
            <Card className="filter-card">
              <Card.Body>
                <DemographicFilters
                  availableDemographics={availableDemographics}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={clearFilters}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {Object.keys(filters).length > 0 && (
        <Row className="mb-4">
          <Col>
            <ActiveFilters
              filters={filters}
              demographics={availableDemographics}
              onRemoveFilter={(key) => {
                setFilters((prev) => {
                  const newFilters = { ...prev }
                  delete newFilters[key]
                  return newFilters
                })
              }}
              onClearFilters={clearFilters}
            />
          </Col>
        </Row>
      )}

      {selectedQuestion.label && (
        <Row className="mb-3">
          <Col>
            <Card className="question-card">
              <Card.Body>
                <h3 className="question-title">{selectedQuestion.label}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Show survey summary for unique questions */}
      {selectedQuestion.type === "unique" && currentSurvey && (
        <Row className="mb-4">
          <Col>
            <SurveySummary survey={currentSurvey} responses={currentResponses} selectedQuestion={selectedQuestion} />
          </Col>
        </Row>
      )}

      {/* Demographic comparisons section */}
      {showDemographicComparisons && selectedQuestion.key && (
        <Row className="mb-4">
          <Col>
            {selectedQuestion.type === "historic" ? (
              <Alert variant="info">
                A análise demográfica está disponível apenas para perguntas de pesquisa única. Selecione uma pergunta
                única para visualizar a comparação demográfica.
              </Alert>
            ) : (
              <DemographicComparisons
                survey={currentSurvey}
                responses={currentResponses}
                selectedQuestion={selectedQuestion}
                availableDemographics={availableDemographics}
              />
            )}
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          {selectedQuestion.type === "historic" && lineChartData.length > 0 ? (
            <Card className="chart-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="chart-title">Evolução Temporal</h4>
                  <ChartDownloadButton
                    chartData={lineChartData}
                    filename={`evolucao-${selectedQuestion.key}`}
                    questionLabel={selectedQuestion.label}
                  />
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="category"
                        allowDuplicatedCategory={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={lineChartTooltipFormatter} />
                      <Legend />

                      {sortChartData(lineChartData).map((series) => (
                        <Line
                          key={series.id}
                          data={series.data}
                          name={series.id}
                          type="monotone"
                          dataKey="y"
                          stroke={series.color}
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        >
                          <LabelList
                            dataKey="exactValue"
                            position="top"
                            formatter={(value) => `${value.toFixed(1)}%`}
                            style={{ fontSize: "10px" }}
                          />
                        </Line>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          ) : selectedQuestion.type === "unique" && barChartData.length > 0 ? (
            <Card className="chart-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="chart-title">Distribuição de Respostas</h4>
                  <ChartDownloadButton
                    chartData={barChartData}
                    filename={`distribuicao-${selectedQuestion.key}`}
                    questionLabel={selectedQuestion.label}
                  />
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="response" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={barChartTooltipFormatter} />
                      <Bar dataKey="percentage" name="Percentual" fill="#4285F4" barSize={40}>
                        <LabelList dataKey="percentage" position="top" formatter={(value) => `${value.toFixed(1)}%`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card className="chart-card">
              <Card.Body className="text-center py-5">
                <p className="text-muted">
                  {selectedQuestion.label
                    ? "Não há dados suficientes para exibir este gráfico."
                    : "Selecione uma pergunta para visualizar os dados."}
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default SurveyDashboard
