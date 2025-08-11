"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Container, Row, Col, Form, Button, Badge, Collapse } from "react-bootstrap"
import { ResponsiveLine } from "@nivo/line"
import ApiBase from "../service/ApiBase"
import {
  normalizeAnswer,
  getResponseColor,
  extractWeight,
  RESPONSE_ORDER,
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  GROUPED_RESPONSE_ORDER,
  normalizeAndGroupNSNR,
} from "../utils/chartUtils"
import LoadingState from "../components/LoadingState"
import InteractiveBrazilMap from "../components/InteractiveBrazilMap"
import OffcanvasNavigation from "../components/OffcanvasNavigation"
import ExportButtons from "../components/ExportButtons"
import { List, BarChart } from "react-bootstrap-icons"
import "./TimelinePage.css"
import DemographicCharts from "../components/DemographicCharts"

const TimelinePage = () => {
  const chartRef = useRef(null)

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
  const [dateRange, setDateRange] = useState(null)
  const [showDemographicCharts, setShowDemographicCharts] = useState(false)

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
    setDateRange(null)
  }

  // Handle date range changes
  // const handleDateRangeChange = (range) => {
  //   setDateRange(range)
  // }

  // Remove a specific filter
  // const handleRemoveFilter = (key) => {
  //   setFilters((prevFilters) => {
  //     const newFilters = { ...prevFilters }
  //     delete newFilters[key]
  //     return newFilters
  //   })

  //   if (key === "UF") {
  //     setSelectedState(null)
  //   }
  // }

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

  // Filter responses based on selected demographic filters and date range
  const filteredResponses = useMemo(() => {
    let filtered = { ...allResponses }

    // Apply date range filter first
    if (dateRange) {
      const filteredSurveys = surveys.filter((survey) => {
        const month = survey.month || ""
        const year = survey.year || ""
        if (month && year) {
          const monthMap = {
            Janeiro: "01",
            Fevereiro: "02",
            Março: "03",
            Abril: "04",
            Maio: "05",
            Junho: "06",
            Julho: "07",
            Agosto: "08",
            Setembro: "09",
            Outubro: "10",
            Novembro: "11",
            Dezembro: "12",
          }
          const monthNum = monthMap[month] || "01"
          const surveyDate = `${year}-${monthNum}-01`
          return surveyDate >= dateRange.start && surveyDate <= dateRange.end
        }
        return true
      })

      // Keep only responses from filtered surveys
      const filteredSurveyIds = new Set(filteredSurveys.map((s) => s._id))
      filtered = Object.fromEntries(Object.entries(filtered).filter(([id]) => filteredSurveyIds.has(id)))
    }

    // Apply demographic filters
    if (Object.keys(filters).length === 0) {
      return filtered
    }

    const result = {}

    Object.entries(filtered).forEach(([surveyId, responses]) => {
      result[surveyId] = responses.filter((response) => {
        return Object.entries(filters).every(([key, values]) => {
          return values.includes(response[key])
        })
      })
    })

    return result
  }, [allResponses, filters, dateRange, surveys])

  // Get all responses as a flat array for the map
  const allResponsesFlat = useMemo(() => {
    return Object.values(filteredResponses).flat()
  }, [filteredResponses])

  // Calculate timeline data with grouping logic
  const timelineData = useMemo(() => {
  if (!selectedQuestion.key || !selectedQuestion.label) return []

  // Find relevant surveys that contain this question
  const relevantSurveys = surveys.filter((survey) =>
    (survey.variables || []).some((v) => v.key === selectedQuestion.key),
  )

  if (relevantSurveys.length === 0) return []

  // Apply date range filter to surveys
  let filteredSurveys = relevantSurveys
  if (dateRange) {
    filteredSurveys = relevantSurveys.filter((survey) => {
      const month = survey.month || ""
      const year = survey.year || ""
      if (month && year) {
        const monthMap = {
          Janeiro: "01",
          Fevereiro: "02",
          Março: "03",
          Abril: "04",
          Maio: "05",
          Junho: "06",
          Julho: "07",
          Agosto: "08",
          Setembro: "09",
          Outubro: "10",
          Novembro: "11",
          Dezembro: "12",
        }
        const monthNum = monthMap[month] || "01"
        const surveyDate = `${year}-${monthNum}-01`
        return surveyDate >= dateRange.start && surveyDate <= dateRange.end
      }
      return true
    })
  }

  // Sort surveys by date
  const sortedSurveys = [...filteredSurveys].sort((a, b) => {
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

  // SEMPRE aplicar normalização NS/NR primeiro
  const allNormalizedResponses = new Set()
  sortedSurveys.forEach((survey) => {
    const responses = filteredResponses[survey._id] || []
    responses.forEach((resp) => {
      const normalizedAnswer = normalizeAndGroupNSNR(resp[selectedQuestion.key])
      if (normalizedAnswer) {
        allNormalizedResponses.add(normalizedAnswer)
      }
    })
  })

  const useGrouping = shouldGroupResponses(Array.from(allNormalizedResponses))

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

      // SEMPRE aplicar normalização NS/NR primeiro
      const normalizedAnswer = normalizeAndGroupNSNR(answer)
      // Depois aplicar agrupamento se necessário
      const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

      counts[finalAnswer] = (counts[finalAnswer] || 0) + weight
      totalWeight += weight
    })

    // Calculate percentages
    const result = {
      surveyId: survey._id,
      surveyTitle: survey.name
        ? survey.name.replace("Dicionário de variáveis - ", "")
        : `${survey.month || ""} ${survey.year || ""}`.trim(),
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
}, [selectedQuestion, surveys, filteredResponses, dateRange])

  // Prepare line chart data with CORRECT colors and order
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

  // Determine if we should use grouped colors
  const useGroupedColors = Array.from(allOptions).some((option) =>
    ["Ótimo/Bom", "Regular", "Ruim/Péssimo", "NS/NR"].includes(option),
  )

  // Create series for each option with CORRECT colors
  const chartData = Array.from(allOptions).map((option) => {
    // APLICAR CORES CORRETAS usando as funções do chartUtils
    let color
    if (useGroupedColors) {
      color = groupedResponseColorMap[option] || "#6c757d"
    } else {
      color = getResponseColor(option)
    }

    return {
      id: option,
      color: color,
      data: timelineData.map((dataPoint) => ({
        x: dataPoint.date,
        y: dataPoint[option] || 0,
        exactValue: dataPoint[option] || 0,
      })),
    }
  })

  // Sort using appropriate order - APLICAR ORDENAÇÃO CORRETA PARA LEGENDAS
  const orderToUse = useGroupedColors ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

  // Primeiro, separar os itens que estão na ordem definida dos que não estão
  const itemsInOrder = []
  const itemsNotInOrder = []

  chartData.forEach((item) => {
    const index = orderToUse.indexOf(item.id)
    if (index !== -1) {
      itemsInOrder.push({ ...item, orderIndex: index })
    } else {
      itemsNotInOrder.push(item)
    }
  })

  // Ordenar os itens que estão na ordem definida
  itemsInOrder.sort((a, b) => a.orderIndex - b.orderIndex)

  // Ordenar os itens que não estão na ordem alfabeticamente
  itemsNotInOrder.sort((a, b) => a.id.localeCompare(b.id))

  // Combinar: primeiro os da ordem definida, depois os outros
  const sortedChartData = [
    ...itemsInOrder.map((item) => ({ id: item.id, color: item.color, data: item.data })),
    ...itemsNotInOrder,
  ]

  console.log("Order used:", orderToUse)
  console.log(
    "Items in order:",
    itemsInOrder.map((d) => ({ id: d.id, orderIndex: d.orderIndex })),
  )
  console.log(
    "Final chart data order:",
    sortedChartData.map((d, i) => ({
      position: i,
      id: d.id,
      color: d.color,
    })),
  )

  return sortedChartData
}, [timelineData])

  const legendData = useMemo(
    () =>
      lineChartData.map(({ id, color }) => ({
        id,
        label: id,
        color,
      })),
    [lineChartData],
  )

  // Calculate dynamic Y scale max
  const dynamicYMax = useMemo(() => {
    if (!lineChartData.length) return 100

    // Find the maximum value across all data points
    let maxValue = 0
    lineChartData.forEach((series) => {
      series.data.forEach((point) => {
        if (point.y > maxValue) {
          maxValue = point.y
        }
      })
    })

    // Add 20% to the max value, but cap at 100 and ensure minimum of 20
    const dynamicMax = Math.min(100, Math.max(20, Math.ceil(maxValue * 1.2)))
    return dynamicMax
  }, [lineChartData])

  // Get all unique answers for the selected question
  // const uniqueAnswers = useMemo(() => {
  //   const answers = new Set()

  //   if (selectedQuestion.key) {
  //     Object.values(filteredResponses).forEach((responses) => {
  //       responses.forEach((response) => {
  //         const answer = normalizeAnswer(response[selectedQuestion.key])
  //         if (answer) {
  //           answers.add(answer)
  //         }
  //       })
  //     })
  //   }

  //   return Array.from(answers)
  // }, [selectedQuestion, filteredResponses])

  // Calculate filtered respondent count
  const filteredRespondentCount = useMemo(() => {
    let count = 0
    Object.values(filteredResponses).forEach((responses) => {
      count += responses.length
    })
    return count
  }, [filteredResponses])

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    return {
      totalRespondents: totalRespondents,
      filteredRespondents: filteredRespondentCount,
      totalSurveys: surveys.length,
      totalQuestions: questionGroups.historic.length,
      activeFilters:
        Object.values(filters).reduce((count, values) => count + values.length, 0) + (selectedState ? 1 : 0),
    }
  }, [
    totalRespondents,
    filteredRespondentCount,
    surveys.length,
    questionGroups.historic.length,
    filters,
    selectedState,
  ])

  // Export to PDF function
  // const exportToPDF = async () => {
  //   if (!chartRef.current) return

  //   try {
  //     const pdf = new jsPDF("l", "mm", "a4")

  //     // Add title
  //     pdf.setFontSize(16)
  //     pdf.setFont(undefined, "bold")
  //     pdf.text("Dashboard de Pesquisas", 20, 20)

  //     pdf.setFontSize(12)
  //     pdf.setFont(undefined, "normal")
  //     pdf.text(selectedQuestion.label || "Dashboard", 20, 30)

  //     // Add current date
  //     pdf.setFontSize(10)
  //     pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 40)

  //     // Capture the chart area
  //     const canvas = await html2canvas(chartRef.current, {
  //       scale: 2,
  //       useCORS: true,
  //       allowTaint: true,
  //       backgroundColor: "#ffffff",
  //     })

  //     const imgData = canvas.toDataURL("image/png")

  //     // Calculate dimensions to fit the page
  //     const imgWidth = 250
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width

  //     // Add the chart image
  //     pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight)

  //     // Save the PDF
  //     pdf.save(`dashboard_${selectedQuestion.key || "export"}.pdf`)
  //   } catch (error) {
  //     console.error("Erro ao gerar PDF:", error)
  //     alert("Erro ao gerar PDF. Tente novamente.")
  //   }
  // }

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
    <div className="timeline-page-minimal">
      {/* Offcanvas Navigation */}
      <OffcanvasNavigation
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        availableDemographics={availableDemographics}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Simple Top Bar */}
      <div className="modern-header" style={{
        background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center py-3">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={() => setShowOffcanvas(true)} 
                className="me-3"
                style={{
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <List />
              </Button>
              <div>
                <h4 className="mb-0" style={{
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1.5rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  Dashboard de Pesquisas
                </h4>
                <small style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  Análise e Controle de Dados
                </small>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container fluid className="px-4 py-3">
        {/* Question Selection - Simplified */}
        <div className="question-selection-minimal mb-4">
          <Row className="align-items-center">
            <Col md={10}>
              <Form.Select
                value={
                  selectedQuestion.type && selectedQuestion.key
                    ? `${selectedQuestion.type}||${selectedQuestion.key}||${selectedQuestion.label}`
                    : ""
                }
                onChange={handleQuestionSelect}
                size="lg"
                className="question-select-minimal"
              >
                <option value="">Selecione uma pergunta para análise</option>
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
            </Col>
            <Col md={2} className="text-end">
              <ExportButtons chartData={lineChartData} questionLabel={selectedQuestion.label} chartRef={chartRef} />
            </Col>
          </Row>
        </div>

        {/* Main Content - Chart and Map */}
        {selectedQuestion.label && (
          <Row className="main-content-row">
            {/* Chart - 60% */}
            <Col lg={7} className="chart-column">
              <div className="chart-container-minimal">
                <div className="chart-header-minimal">
                  <h6 className="chart-title-minimal mb-3">{selectedQuestion.label}</h6>
                </div>
                <div ref={chartRef} style={{ height: "500px" }}>
                  {lineChartData.length ? (
                    <ResponsiveLine
                      data={lineChartData}
                      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                      xScale={{ type: "point" }}
                      yScale={{ type: "linear", min: 0, max: dynamicYMax }}
                      yFormat=" >-.1f"
                      curve="monotoneX"
                      colors={(serie) => serie.color}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: "Período",
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
                      pointSize={8}
                      pointColor={{ theme: "background" }}
                      pointBorderWidth={2}
                      pointBorderColor={{ from: "serieColor" }}
                      enablePointLabel={true}
                      pointLabel={(d) => `${d.data.exactValue}%`}
                      useMesh={true}
                      legends={[
                        {
                          data: legendData, // <-- aqui usamos o array explícito
                          anchor: "right",
                          direction: "column",
                          justify: false,
                          translateX: 100,
                          translateY: 0,
                          itemsSpacing: 8,
                          itemDirection: "left-to-right",
                          itemWidth: 80,
                          itemHeight: 18,
                          itemOpacity: 0.75,
                          symbolSize: 10,
                          symbolShape: "circle",
                        },
                      ]}
                      motionConfig="gentle"
                    />
                  ) : (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <p className="text-muted">Não há dados suficientes para exibir este gráfico.</p>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Map - 40% */}
            <Col lg={5} className="map-column">
              <InteractiveBrazilMap
                responses={allResponsesFlat}
                selectedQuestion={selectedQuestion}
                onStateClick={handleStateClick}
                selectedState={selectedState}
                filters={filters}
              />
            </Col>
          </Row>
        )}

        {/* Demographic Charts Section - Collapsible */}
        {selectedQuestion.label && (
          <div className="demographic-charts-section mt-4">
            <Button
              variant="outline-secondary"
              onClick={() => setShowDemographicCharts(!showDemographicCharts)}
              aria-controls="demographic-charts-collapse"
              aria-expanded={showDemographicCharts}
              className="mb-3 d-flex align-items-center"
            >
              <BarChart className="me-2" />
              Análise Demográfica
              <Badge bg="secondary" className="ms-2">
                {availableDemographics.filter((d) => d.values.length > 0).length}
              </Badge>
            </Button>

            <Collapse in={showDemographicCharts}>
              <div id="demographic-charts-collapse">
                {showDemographicCharts && (
                  <DemographicCharts
                    selectedQuestion={selectedQuestion}
                    surveys={surveys}
                    filteredResponses={filteredResponses}
                    availableDemographics={availableDemographics}
                  />
                )}
              </div>
            </Collapse>
          </div>
        )}

        {/* Empty state when no question selected */}
        {!selectedQuestion.label && (
          <div className="empty-state text-center py-5">
            <div className="text-muted">
              <h5>Selecione uma pergunta para começar a análise</h5>
              <p>
                Escolha uma pergunta no menu acima para visualizar a evolução temporal e distribuição geográfica dos
                dados.
              </p>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}

export default TimelinePage
