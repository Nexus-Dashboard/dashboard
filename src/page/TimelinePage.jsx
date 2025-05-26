"use client"

import { useState, useEffect, useMemo } from "react"
import { Container, Row, Col, Card, Form, Button, Badge, Accordion, Offcanvas } from "react-bootstrap"
import { ResponsiveLine } from "@nivo/line"
import { ResponsiveBar } from "@nivo/bar"
import ApiBase from "../service/ApiBase"
import { normalizeAnswer, getResponseColor, sortChartData, extractWeight, RESPONSE_ORDER } from "../utils/chartUtils"
import LoadingState from "../components/LoadingState"
import ChartDownloadButton from "../components/ChartDownloadButton"
import InteractiveBrazilMap from "../components/InteractiveBrazilMap"
import { List } from "react-bootstrap-icons"
import "./TimelinePage.css"

const TimelinePage = () => {
  // State variables
  const [surveys, setSurveys] = useState([])
  const [allResponses, setAllResponses] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState({ label: "", key: "", type: "" })
  const [error, setError] = useState(null)
  const [totalRespondents, setTotalRespondents] = useState(0)
  const [filters, setFilters] = useState({})
  const [availableDemographics, setAvailableDemographics] = useState([])
  const [showOffcanvas, setShowOffcanvas] = useState(false)
  const [selectedState, setSelectedState] = useState(null)

  // Fetch surveys and responses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch surveys
        const surveysResponse = await ApiBase.get("/api/surveys")
        const surveysData = surveysResponse.data
        setSurveys(surveysData)

        // Fetch responses for each survey
        const responsesMap = {}
        let totalCount = 0
        for (const survey of surveysData) {
          const responseData = await ApiBase.get(`/api/responsesFlat/${survey._id}`)
          responsesMap[survey._id] = responseData.data
          totalCount += responseData.data.length
        }
        setAllResponses(responsesMap)
        setTotalRespondents(totalCount)

        // Set default selected question if available (P1 - Avaliação do Governo Federal)
        if (surveysData.length > 0) {
          const defaultQuestion = surveysData[0].variables?.find(
            (v) => v.key === "P1" && v.label.includes("Governo Federal"),
          )
          if (defaultQuestion) {
            setSelectedQuestion({
              label: defaultQuestion.label,
              key: defaultQuestion.key,
              type: "historic",
            })
          }
        }

        // Extract available demographics
        if (surveysData.length > 0 && surveysData[0].variables) {
          const demographics = surveysData[0].variables
            .filter((v) => v.key.startsWith("PF") && !v.key.includes("#"))
            .map((v) => ({
              key: v.key,
              label: v.label,
              values: extractUniqueValues(responsesMap, v.key),
            }))
            .filter((d) => d.values.length > 0)

          // Adicionar UF e Região como opções de filtro
          const regionValues = extractUniqueValues(responsesMap, "Regiao")
          const stateValues = extractUniqueValues(responsesMap, "UF")

          if (regionValues.length > 0) {
            demographics.push({
              key: "Regiao",
              label: "Região",
              values: regionValues,
            })
          }

          if (stateValues.length > 0) {
            demographics.push({
              key: "UF",
              label: "Estado",
              values: stateValues,
            })
          }

          setAvailableDemographics(demographics)
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

  // Extract unique values for a demographic field
  const extractUniqueValues = (responsesMap, key) => {
    const uniqueValues = new Set()

    Object.values(responsesMap).forEach((responses) => {
      responses.forEach((response) => {
        if (response[key] && response[key].trim()) {
          uniqueValues.add(response[key].trim())
        }
      })
    })

    return Array.from(uniqueValues).sort()
  }

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

  // Handle question selection
  const handleQuestionSelect = (e) => {
    const [type, key, label] = e.target.value.split("||")
    setSelectedQuestion({ type, key, label })
    setSelectedState(null) // Reset selected state when changing question
  }

  // Handle filter changes
  const handleFilterChange = (demographicKey, value, checked) => {
    setFilters((prevFilters) => {
      const newFilters = { ...prevFilters }
      newFilters[demographicKey] = newFilters[demographicKey] || []

      if (checked) {
        newFilters[demographicKey] = [...newFilters[demographicKey], value]
      } else {
        newFilters[demographicKey] = newFilters[demographicKey].filter((v) => v !== value)
      }

      if (newFilters[demographicKey].length === 0) {
        delete newFilters[demographicKey]
      }

      return newFilters
    })
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({})
    setSelectedState(null)
  }

  // Remove a specific filter
  const handleRemoveFilter = (key) => {
    setFilters((prevFilters) => {
      const newFilters = { ...prevFilters }
      delete newFilters[key]
      return newFilters
    })

    if (key === "UF") {
      setSelectedState(null)
    }
  }

  // Handle state click on map
  const handleStateClick = (state) => {
    if (selectedState === state) {
      // If clicking the same state, remove the filter
      setSelectedState(null)
      setFilters((prevFilters) => {
        const newFilters = { ...prevFilters }
        delete newFilters["UF"]
        return newFilters
      })
    } else {
      // Set the new state filter
      setSelectedState(state)

      // Encontrar o nome completo do estado a partir da sigla
      const stateFullName =
        Object.entries(availableDemographics.find((d) => d.key === "UF")?.values || {}).find(
          ([_, value]) => value.includes(state) || state.includes(value),
        )?.[1] || state

      setFilters((prevFilters) => ({
        ...prevFilters,
        UF: [stateFullName],
      }))
    }
  }

  // Filter responses based on selected demographic filters
  const filteredResponses = useMemo(() => {
    if (Object.keys(filters).length === 0) {
      return allResponses
    }

    const filtered = {}

    Object.entries(allResponses).forEach(([surveyId, responses]) => {
      filtered[surveyId] = responses.filter((response) => {
        return Object.entries(filters).every(([key, values]) => {
          return values.includes(response[key])
        })
      })
    })

    return filtered
  }, [allResponses, filters])

  // Get all responses as a flat array for the map
  const allResponsesFlat = useMemo(() => {
    return Object.values(filteredResponses).flat()
  }, [filteredResponses])

  // Calculate timeline data
  const timelineData = useMemo(() => {
    if (!selectedQuestion.key || !selectedQuestion.label) return []

    // Find relevant surveys that contain this question
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
    const surveyResults = sortedSurveys.map((survey) => {
      const responses = filteredResponses[survey._id] || []

      // Count responses for each option with weights
      const counts = {}
      let totalWeight = 0

      responses.forEach((response) => {
        const answer = normalizeAnswer(response[selectedQuestion.key])
        if (!answer) return

        const weight = extractWeight(response)
        counts[answer] = (counts[answer] || 0) + weight
        totalWeight += weight
      })

      // Calculate percentages
      const result = {
        surveyId: survey._id,
        // Usar o nome da pesquisa ou criar um identificador único para cada pesquisa
        surveyTitle: survey.name
          ? survey.name.replace("Dicionário de variáveis - ", "")
          : `${survey.month || ""} ${survey.year || ""}`.trim(),
        // Criar um identificador único para o eixo X que inclua o nome da pesquisa
        date: survey.name
          ? survey.name.replace("Dicionário de variáveis - ", "")
          : `${survey.month || ""} ${survey.year || ""}`.trim(),
      }

      Object.entries(counts).forEach(([answer, count]) => {
        result[answer] = Math.round((count / totalWeight) * 1000) / 10 // One decimal place
      })

      return result
    })

    return surveyResults
  }, [selectedQuestion, surveys, filteredResponses])

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (!timelineData.length) return []

    // Extract all unique response options across all surveys
    const allOptions = new Set()
    timelineData.forEach((dataPoint) => {
      Object.keys(dataPoint).forEach((key) => {
        if (key !== "surveyId" && key !== "surveyTitle" && key !== "date") {
          allOptions.add(key)
        }
      })
    })

    // Create series for each option
    const chartData = Array.from(allOptions).map((option) => ({
      id: option,
      color: getResponseColor(option),
      data: timelineData.map((dataPoint) => ({
        x: dataPoint.date,
        y: dataPoint[option] || 0,
        exactValue: dataPoint[option] || 0,
      })),
    }))

    // Não precisamos chamar sortChartData aqui, pois já estamos chamando na renderização
    return chartData
  }, [timelineData])

  // Calculate demographic comparison data for stacked bar charts
  const demographicComparisonData = useMemo(() => {
    if (!selectedQuestion.key || !selectedQuestion.label || !surveys.length) return {}

    // Get the most recent survey
    const sortedSurveys = [...surveys].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year

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

      return monthOrder[b.month] || 0 - (monthOrder[a.month] || 0)
    })

    const latestSurvey = sortedSurveys[0]
    if (!latestSurvey) return {}

    const responses = filteredResponses[latestSurvey._id] || []
    if (!responses.length) return {}

    // Process demographic data
    const result = {}

    // Process data for each demographic type
    availableDemographics.forEach((demographic) => {
      const { key, label } = demographic

      // Group responses by demographic value
      const groupedByDemographic = {}
      const totalsByDemographic = {}

      responses.forEach((response) => {
        const demographicValue = response[key]
        if (!demographicValue) return

        const answer = normalizeAnswer(response[selectedQuestion.key])
        if (!answer) return

        const weight = extractWeight(response)

        groupedByDemographic[demographicValue] = groupedByDemographic[demographicValue] || {}
        groupedByDemographic[demographicValue][answer] = (groupedByDemographic[demographicValue][answer] || 0) + weight
        totalsByDemographic[demographicValue] = (totalsByDemographic[demographicValue] || 0) + weight
      })

      // Calculate percentages and format data for stacked bar chart
      const chartData = []

      Object.entries(groupedByDemographic).forEach(([demographicValue, answers]) => {
        const dataPoint = { demographicValue }

        Object.entries(answers).forEach(([answer, count]) => {
          dataPoint[answer] = Math.round((count / totalsByDemographic[demographicValue]) * 1000) / 10
        })

        chartData.push(dataPoint)
      })

      result[key] = {
        label,
        data: chartData,
      }
    })

    return result
  }, [selectedQuestion, surveys, filteredResponses, availableDemographics])

  // Get all unique answers for the selected question
  const uniqueAnswers = useMemo(() => {
    const answers = new Set()

    if (selectedQuestion.key) {
      Object.values(filteredResponses).forEach((responses) => {
        responses.forEach((response) => {
          const answer = normalizeAnswer(response[selectedQuestion.key])
          if (answer) {
            answers.add(answer)
          }
        })
      })
    }

    return Array.from(answers)
  }, [selectedQuestion, filteredResponses])

  // Calculate filtered respondent count
  const filteredRespondentCount = useMemo(() => {
    let count = 0
    Object.values(filteredResponses).forEach((responses) => {
      count += responses.length
    })
    return count
  }, [filteredResponses])

  if (loading) {
    return <LoadingState message="Carregando dados das pesquisas..." />
  }

  if (error) {
    return (
      <Container className="py-5">
        <div className="alert alert-danger">
          <h4>Erro ao carregar dados</h4>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <div className="timeline-page orange-theme">
      <Container fluid>
        <Row>
          {/* Mobile Filter Button */}
          <div className="d-md-none filter-button-container">
            <Button variant="orange" className="filter-toggle-btn" onClick={() => setShowOffcanvas(true)}>
              <List size={20} className="me-2" /> Filtros
            </Button>
          </div>

          {/* Mobile Offcanvas */}
          <Offcanvas
            show={showOffcanvas}
            onHide={() => setShowOffcanvas(false)}
            placement="start"
            className="sidebar-offcanvas"
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Filtros</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <div className="sidebar-content">
                <div className="sidebar-header">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleClearFilters}
                    disabled={Object.keys(filters).length === 0}
                  >
                    Limpar Filtros
                  </Button>
                </div>

                <Accordion alwaysOpen={false} className="filter-accordion">
                  {availableDemographics.map((demographic, index) => (
                    <Accordion.Item key={demographic.key} eventKey={index.toString()}>
                      <Accordion.Header>
                        <span className="filter-group-title">
                          {demographic.label}
                          {filters[demographic.key]?.length > 0 && (
                            <Badge bg="primary" pill className="ms-2">
                              {filters[demographic.key].length}
                            </Badge>
                          )}
                        </span>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="filter-options">
                          <Form>
                            {demographic.values.map((value) => (
                              <Form.Check
                                key={`${demographic.key}-${value}`}
                                type="checkbox"
                                id={`mobile-${demographic.key}-${value}`}
                                label={value}
                                checked={(filters[demographic.key] || []).includes(value)}
                                onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                              />
                            ))}
                          </Form>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </div>
            </Offcanvas.Body>
          </Offcanvas>

          {/* Desktop Sidebar */}
          <Col md={3} lg={2} className="sidebar-container d-none d-md-block">
            <div className="sidebar">
              <div className="sidebar-header">
                <h4>Filtros</h4>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleClearFilters}
                  disabled={Object.keys(filters).length === 0}
                >
                  Limpar Filtros
                </Button>
              </div>

              <Accordion alwaysOpen={false} className="filter-accordion">
                {availableDemographics.map((demographic, index) => (
                  <Accordion.Item key={demographic.key} eventKey={index.toString()}>
                    <Accordion.Header>
                      <span className="filter-group-title">
                        {demographic.label}
                        {filters[demographic.key]?.length > 0 && (
                          <Badge bg="primary" pill className="ms-2">
                            {filters[demographic.key].length}
                          </Badge>
                        )}
                      </span>
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="filter-options">
                        <Form>
                          {demographic.values.map((value) => (
                            <Form.Check
                              key={`${demographic.key}-${value}`}
                              type="checkbox"
                              id={`${demographic.key}-${value}`}
                              label={value}
                              checked={(filters[demographic.key] || []).includes(value)}
                              onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                            />
                          ))}
                        </Form>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          </Col>

          <Col md={9} lg={10} className="content-container">
            <div className="content">
              <div className="page-header orange-gradient">
                <h1 className="page-title">Dashboard de Pesquisas</h1>
                <p className="page-subtitle">Análise de tendências ao longo do tempo</p>
              </div>

              {/* Active Filters */}
              {Object.keys(filters).length > 0 && (
                <div className="active-filters mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="active-filters-title me-2">Filtros Ativos:</h5>
                    <Button variant="link" size="sm" className="clear-all-btn p-0" onClick={handleClearFilters}>
                      Limpar todos
                    </Button>
                  </div>
                  <div className="filter-badges">
                    {Object.entries(filters).map(([key, values]) => {
                      if (values.length === 0) return null

                      const demographic = availableDemographics.find((d) => d.key === key)
                      const label = demographic?.label || key

                      return (
                        <Badge key={key} bg="light" text="dark" className="filter-badge">
                          <span className="filter-name">{label}:</span>
                          <span className="filter-values">{values.join(", ")}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="remove-filter-btn"
                            onClick={() => handleRemoveFilter(key)}
                          >
                            <span aria-hidden="true">&times;</span>
                          </Button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Metric Cards */}
              <Row className="mb-4">
                <Col md={4}>
                  <Card className="metric-card orange-accent">
                    <Card.Body>
                      <div className="metric-title">Total de Entrevistados</div>
                      <div className="metric-value">{totalRespondents.toLocaleString()}</div>
                      <div className="metric-subtitle">
                        {Object.keys(filters).length > 0 ? (
                          <>
                            <span className="filtered-count">{filteredRespondentCount.toLocaleString()}</span> após
                            filtros
                          </>
                        ) : (
                          "Todas as pesquisas"
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="metric-card orange-accent">
                    <Card.Body>
                      <div className="metric-title">Pesquisas Realizadas</div>
                      <div className="metric-value">{surveys.length}</div>
                      <div className="metric-subtitle">
                        {surveys.length > 0
                          ? `${surveys[0].month} ${surveys[0].year} - ${surveys[surveys.length - 1].month} ${surveys[surveys.length - 1].year}`
                          : ""}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="metric-card orange-accent">
                    <Card.Body>
                      <div className="metric-title">Perguntas Disponíveis</div>
                      <div className="metric-value">{questionGroups.historic.length}</div>
                      <div className="metric-subtitle">Com histórico comparativo</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Question Selection */}
              <Row className="mb-4">
                <Col>
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
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

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

              {/* Timeline Chart and Brazil Map */}
              <Row className="mb-4">
                <Col lg={6}>
                  <Card className="chart-card">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="chart-title">Evolução Temporal</h4>
                        {lineChartData.length > 0 && (
                          <ChartDownloadButton
                            chartData={lineChartData}
                            filename={`evolucao-${selectedQuestion.key}`}
                            questionLabel={selectedQuestion.label}
                          />
                        )}
                      </div>
                      <div className="chart-container" style={{ height: 400 }}>
                        {lineChartData.length > 0 ? (
                          <ResponsiveLine
                            data={sortChartData(lineChartData)}
                            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                            xScale={{ type: "point" }}
                            yScale={{
                              type: "linear",
                              min: 0,
                              // Escala dinâmica: 10% a mais que o valor máximo ou 100%, o que for menor
                              max: Math.min(
                                100,
                                Math.ceil(
                                  Math.max(...lineChartData.flatMap((series) => series.data.map((d) => d.y))) * 1.1,
                                ),
                              ),
                              stacked: false,
                              reverse: false,
                            }}
                            yFormat=" >-.1f"
                            curve="monotoneX"
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: -15, // Rotacionar os rótulos para melhor legibilidade
                              legendOffset: 36,
                              legendPosition: "middle",
                            }}
                            axisLeft={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: "Porcentagem (%)",
                              legendOffset: -40,
                              legendPosition: "middle",
                            }}
                            enableGridX={false}
                            enableGridY={true}
                            pointSize={10}
                            pointColor={{ theme: "background" }}
                            pointBorderWidth={2}
                            pointBorderColor={{ from: "serieColor" }}
                            pointLabelYOffset={-12}
                            enablePointLabel={true}
                            pointLabel={(d) => `${d.data.exactValue}%`}
                            useMesh={true}
                            legends={[
                              {
                                anchor: "right",
                                direction: "column",
                                justify: false,
                                translateX: 100,
                                translateY: 0,
                                itemsSpacing: 10,
                                itemDirection: "left-to-right",
                                itemWidth: 80,
                                itemHeight: 20,
                                itemOpacity: 0.75,
                                symbolSize: 12,
                                symbolShape: "circle",
                                symbolBorderColor: "rgba(0, 0, 0, .5)",
                                effects: [
                                  {
                                    on: "hover",
                                    style: {
                                      itemBackground: "rgba(0, 0, 0, .03)",
                                      itemOpacity: 1,
                                    },
                                  },
                                ],
                              },
                            ]}
                            theme={{
                              tooltip: {
                                container: {
                                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                                },
                              },
                            }}
                            lineWidth={3}
                            enableSlices="x"
                            sliceTooltip={({ slice }) => (
                              <div
                                style={{
                                  background: "white",
                                  padding: "9px 12px",
                                  border: "1px solid #ccc",
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                  borderRadius: "4px",
                                }}
                              >
                                <div style={{ marginBottom: "5px", fontWeight: "bold" }}>{slice.points[0].data.x}</div>
                                {slice.points.map((point) => (
                                  <div
                                    key={point.id}
                                    style={{
                                      color: point.serieColor,
                                      padding: "3px 0",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span style={{ marginRight: "10px" }}>{point.serieId}</span>
                                    <span style={{ fontWeight: "bold" }}>{point.data.exactValue}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            defs={[
                              {
                                id: "lineGradient",
                                type: "linearGradient",
                                colors: [
                                  { offset: 0, color: "inherit", opacity: 0.6 },
                                  { offset: 100, color: "inherit", opacity: 0 },
                                ],
                              },
                            ]}
                            fill={[{ match: "*", id: "lineGradient" }]}
                            layers={[
                              "grid",
                              "markers",
                              "axes",
                              "areas",
                              "crosshair",
                              "lines",
                              "points",
                              "slices",
                              "mesh",
                              "legends",
                            ]}
                          />
                        ) : (
                          <div className="text-center py-5">
                            <p className="text-muted">
                              {selectedQuestion.label
                                ? "Não há dados suficientes para exibir este gráfico."
                                : "Selecione uma pergunta para visualizar os dados."}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Brazil Map */}
                <Col lg={6}>
                  {selectedQuestion.key && (
                    <InteractiveBrazilMap
                        responses={allResponsesFlat}
                        selectedQuestion={selectedQuestion}
                        onStateClick={handleStateClick}
                        selectedState={selectedState}
                        filters={filters}
                    />
                  )}
                </Col>
              </Row>

              {/* Demographic Comparison Charts */}
              <h4 className="section-title mb-3">Comparativos Demográficos</h4>

              {Object.entries(demographicComparisonData).map(([key, { label, data }]) => (
                <Row key={key} className="mb-4">
                  <Col>
                    <Card className="chart-card">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h4 className="chart-title">
                            {selectedQuestion.key} vs {label}
                          </h4>
                          <ChartDownloadButton
                            chartData={data}
                            filename={`${selectedQuestion.key}-por-${key}`}
                            questionLabel={selectedQuestion.label}
                          />
                        </div>
                        <div className="chart-container" style={{ height: 400 }}>
                          {data.length > 0 ? (
                            <ResponsiveBar
                              data={data}
                              keys={uniqueAnswers.sort((a, b) => {
                                const indexA = RESPONSE_ORDER.indexOf(a)
                                const indexB = RESPONSE_ORDER.indexOf(b)

                                // Se ambos estão na lista de ordem, usar essa ordem
                                if (indexA >= 0 && indexB >= 0) {
                                  return indexA - indexB
                                }

                                // Se apenas um está na lista, priorizar o que está
                                if (indexA >= 0) return -1
                                if (indexB >= 0) return 1

                                // Se nenhum está na lista, manter a ordem alfabética
                                return a.localeCompare(b)
                              })}
                              indexBy="demographicValue"
                              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                              padding={0.3}
                              groupMode="stacked"
                              valueScale={{
                                type: "linear",
                                // Escala fixa em 100%
                                max: 100,
                                min: 0,
                              }}
                              indexScale={{ type: "band", round: true }}
                              colors={(bar) => getResponseColor(bar.id)}
                              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                              axisTop={null}
                              axisRight={null}
                              axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: label,
                                legendPosition: "middle",
                                legendOffset: 32,
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: "Porcentagem (%)",
                                legendPosition: "middle",
                                legendOffset: -40,
                              }}
                              labelFormat={(value) => `${value}%`}
                              labelSkipWidth={12}
                              labelSkipHeight={12}
                              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                              legends={[
                                {
                                  dataFrom: "keys",
                                  anchor: "bottom-right",
                                  direction: "column",
                                  justify: false,
                                  translateX: 120,
                                  translateY: 0,
                                  itemsSpacing: 2,
                                  itemWidth: 100,
                                  itemHeight: 20,
                                  itemDirection: "left-to-right",
                                  itemOpacity: 0.85,
                                  symbolSize: 20,
                                  effects: [
                                    {
                                      on: "hover",
                                      style: {
                                        itemOpacity: 1,
                                      },
                                    },
                                  ],
                                },
                              ]}
                              theme={{
                                tooltip: {
                                  container: {
                                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                                  },
                                },
                              }}
                            />
                          ) : (
                            <div className="text-center py-5">
                              <p className="text-muted">
                                {selectedQuestion.label
                                  ? "Não há dados suficientes para exibir este gráfico."
                                  : "Selecione uma pergunta para visualizar os dados."}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default TimelinePage
