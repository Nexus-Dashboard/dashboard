"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Container, Row, Col, Card, Button, Alert, Image } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Info, BarChart3, Cloud } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { useAuth } from "../contexts/AuthContext"
import LoadingState from "../components/LoadingState"
import DemographicFilters from "../components/DemographicFilters"
import DateRangeFilter from "../components/DateRangeFilter"
import ExportButtons from "../components/ExportButtons"
import WordCloudChart from "../components/WordCloudChart"
import ApiBase from "../service/ApiBase"
import { filterByDemographics } from "../utils/demographicUtils"
import "./MatrixDashboard.css"

const fetchMatrixData = async ({ queryKey }) => {
  const [, { theme, baseCode, surveyType }] = queryKey
  const response = await ApiBase.post(
    "/api/data/question/grouped/responses",
    {
      theme,
      questionText: baseCode,
    },
    { params: { type: surveyType } },
  )
  if (!response.data.success) {
    throw new Error(response.data.message || "Erro ao buscar dados da matriz")
  }
  return response.data
}

export default function MatrixDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout } = useAuth()
  const matrixContentRef = useRef(null)

  const theme = searchParams.get("theme")
  const baseCode = searchParams.get("baseCode")
  const variablesParam = searchParams.get("variables")
  const surveyType = searchParams.get("type")

  const [demographicFilters, setDemographicFilters] = useState({})
  const [dateRange, setDateRange] = useState({ start: null, end: null })

  const handleDemographicFilterChange = useCallback((newFilters) => {
    setDemographicFilters(newFilters)
  }, [])

  const requestParams = useMemo(() => {
    if (!theme || !baseCode) return null
    return {
      theme,
      baseCode,
      surveyType,
    }
  }, [theme, baseCode, surveyType])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matrixData", requestParams],
    queryFn: fetchMatrixData,
    enabled: !!requestParams,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const variables = useMemo(() => {
    try {
      return variablesParam ? JSON.parse(variablesParam) : []
    } catch {
      return []
    }
  }, [variablesParam])

  const processedData = useMemo(() => {
    if (!data?.historicalData) return null

    const originalData = data.historicalData
    let filteredData = data.historicalData

    // Apply demographic filters
    if (Object.keys(demographicFilters).length > 0) {
      filteredData = filterByDemographics(filteredData, demographicFilters)
    }

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.year, 0, 1)
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date("1900-01-01")
        const endDate = dateRange.end ? new Date(dateRange.end) : new Date("2100-12-31")
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    const chartData = []
    const labels = data.questionInfo?.labels || {}

    filteredData.forEach((item) => {
      item.distribution.forEach((dist) => {
        chartData.push({
          variable: dist.variable,
          variableLabel: labels[dist.variable] || dist.variable,
          response: dist.response,
          count: dist.weightedCount || 0,
          year: item.year,
          rodada: item.rodada,
        })
      })
    })

    const responseTypes = [...new Set(chartData.map((item) => item.response))]
    const comparisonData = variables.map((variable) => {
      const variableData = {
        variable,
        variableLabel: labels[variable] || variable,
      }

      responseTypes.forEach((responseType) => {
        const totalForResponse = chartData
          .filter((item) => item.variable === variable && item.response === responseType)
          .reduce((sum, item) => sum + item.count, 0)
        variableData[responseType] = totalForResponse
      })

      return variableData
    })

    // Calcular tamanho da amostra
    const originalSampleSize = originalData.reduce((sum, item) => {
      const totalResponses = item.distribution.reduce((acc, dist) => acc + (dist.weightedCount || 0), 0)
      return sum + totalResponses
    }, 0)

    const filteredSampleSize = filteredData.reduce((sum, item) => {
      const totalResponses = item.distribution.reduce((acc, dist) => acc + (dist.weightedCount || 0), 0)
      return sum + totalResponses
    }, 0)

    // Calcular margem de erro (fórmula: 1.96 * sqrt(0.25 / n))
    // Para 95% de confiança e proporção de 50% (pior caso)
    const marginOfError = filteredSampleSize > 0
      ? (1.96 * Math.sqrt(0.25 / filteredSampleSize)) * 100
      : 0

    return {
      chartData,
      comparisonData,
      responseTypes,
      labels,
      sampleSize: filteredSampleSize,
      originalSampleSize,
      marginOfError: Math.round(marginOfError * 100) / 100, // Arredondar para 2 casas decimais
    }
  }, [data, demographicFilters, dateRange, variables])

  const handleBack = useCallback(() => navigate(-1), [navigate])
  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleExportCSV = useCallback(() => {
    if (!processedData?.comparisonData) return

    const csvData = processedData.comparisonData.map((item) => ({
      Variável: item.variable,
      Descrição: item.variableLabel,
      ...processedData.responseTypes.reduce((acc, responseType) => {
        acc[responseType] = item[responseType] || 0
        return acc
      }, {}),
    }))

    const headers = Object.keys(csvData[0])
    const csvRows = [headers.join(","), ...csvData.map((row) => headers.map((header) => `"${row[header]}"`).join(","))]

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `matrix-dashboard-${baseCode}-${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [processedData, baseCode])

  const handleExportPDF = useCallback(async () => {
    const element = matrixContentRef.current
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#f0f2f5",
    })

    const pdf = new jsPDF("l", "mm", "a4") // landscape
    const imgData = canvas.toDataURL("image/png")
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(`matrix-dashboard-${baseCode}-${Date.now()}.pdf`)
  }, [baseCode])

  if (!theme || !baseCode) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Parâmetros Inválidos</Alert.Heading>
          <p>Os parâmetros necessários para carregar o dashboard de matriz não foram fornecidos.</p>
          <Button variant="secondary" onClick={handleBack}>
            Voltar
          </Button>
        </Alert>
      </Container>
    )
  }

  if (isLoading) return <LoadingState message="Carregando dados da matriz..." />

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Erro ao Carregar Dados</Alert.Heading>
          <p>{error.message}</p>
          <Button variant="outline-danger" onClick={() => refetch()}>
            Tentar Novamente
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <div className="matrix-dashboard-wrapper" ref={matrixContentRef}>
      <header className="matrix-header">
        <Container className="d-flex justify-content-between align-items-center">
          <Image src="/nexus-logo.png" alt="Nexus Logo" className="header-logo" />
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </Container>
      </header>

      <main className="matrix-content">
        <Container>
          <div className="matrix-title-section">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="matrix-title">{theme}</h1>
                <p className="matrix-subtitle">Análise de Matriz - {baseCode}</p>
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="matrix-back-button">
                <ArrowLeft size={16} className="me-2" />
                Voltar
              </Button>
            </div>
          </div>

          <Row className="g-4">
            <Col lg={3}>
              <Card className="matrix-filters-card">
                <Card.Header>
                  <h5 className="mb-0">Filtros</h5>
                </Card.Header>
                <Card.Body>
                  <DemographicFilters
                    availableDemographics={data?.demographicFields || []}
                    onFilterChange={handleDemographicFilterChange}
                    activeFilters={demographicFilters}
                  />
                  <hr />
                  <DateRangeFilter onDateRangeChange={setDateRange} dateRange={dateRange} />
                </Card.Body>
              </Card>

              <Card className="matrix-export-card">
                <Card.Header>
                  <h6 className="mb-0">Exportar Dados</h6>
                </Card.Header>
                <Card.Body>
                  <ExportButtons
                    onExportCSV={handleExportCSV}
                    onExportPDF={handleExportPDF}
                    csvDisabled={!processedData?.comparisonData}
                    pdfDisabled={!processedData?.comparisonData}
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col lg={9}>
              {processedData ? (
                <Row className="g-4">
                  {/* Alerta de Margem de Erro */}
                  {processedData.marginOfError > 10 && (
                    <Col xs={12}>
                      <Alert variant="warning" className="d-flex align-items-center">
                        <Info size={20} className="me-2" />
                        <div>
                          <strong>Atenção: Margem de erro elevada!</strong>
                          <br />
                          A margem de erro atual é de <strong>{processedData.marginOfError}%</strong> (tamanho da amostra: {processedData.sampleSize} de {processedData.originalSampleSize} respostas).
                          Isso pode afetar a precisão dos resultados. Considere remover alguns filtros para aumentar a amostra.
                        </div>
                      </Alert>
                    </Col>
                  )}

                  {/* Info de Amostra quando margem <= 10% */}
                  {processedData.marginOfError <= 10 && Object.keys(demographicFilters).length > 0 && (
                    <Col xs={12}>
                      <Alert variant="info" className="d-flex align-items-center">
                        <Info size={20} className="me-2" />
                        <div>
                          Amostra filtrada: <strong>{processedData.sampleSize}</strong> de {processedData.originalSampleSize} respostas
                          | Margem de erro: <strong>{processedData.marginOfError}%</strong>
                        </div>
                      </Alert>
                    </Col>
                  )}

                  <Col xs={12}>
                    <Card className="matrix-chart-card">
                      <Card.Header>
                        <div className="d-flex align-items-center">
                          <BarChart3 size={20} className="me-2" />
                          <h5 className="mb-0">Comparação por Variável</h5>
                        </div>
                      </Card.Header>
                      <Card.Body>
                        <div className="matrix-chart-container">
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              data={processedData.comparisonData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 100,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="variableLabel" angle={-45} textAnchor="end" height={100} interval={0} />
                              <YAxis />
                              <Tooltip
                                formatter={(value, name) => [value, name]}
                                labelFormatter={(label) => `Variável: ${label}`}
                              />
                              <Legend />
                              {processedData.responseTypes.map((responseType, index) => (
                                <Bar
                                  key={responseType}
                                  dataKey={responseType}
                                  fill={`hsl(${(index * 290) / processedData.responseTypes.length}, 60%, 50%)`}
                                  name={responseType}
                                  stackId="a"
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card className="matrix-chart-card">
                      <Card.Header>
                        <div className="d-flex align-items-center">
                          <Cloud size={20} className="me-2" />
                          <h5 className="mb-0">Nuvem de Palavras das Respostas</h5>
                        </div>
                      </Card.Header>
                      <Card.Body className="d-flex justify-content-center align-items-center">
                        <WordCloudChart data={processedData.chartData} />
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <div className="matrix-loading-state">
                  <p>Nenhum dado disponível para exibição.</p>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </main>

      <footer className="matrix-footer">
        <Container>
          <p className="mb-0">
            <Info size={14} className="me-2" />
            Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR
          </p>
        </Container>
      </footer>
    </div>
  )
}
