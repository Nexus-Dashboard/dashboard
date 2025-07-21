"use client"

import { useState, useMemo, useCallback } from "react"
import { Container, Row, Col, Card, Button, Alert, Image } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Info, BarChart3 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useAuth } from "../contexts/AuthContext"
import LoadingState from "../components/LoadingState"
import DemographicFilters from "../components/DemographicFilters"
import DateRangeFilter from "../components/DateRangeFilter"
import ExportButtons from "../components/ExportButtons"
import ApiBase from "../service/ApiBase"
import { DEMOGRAPHIC_LABELS } from "../utils/demographicUtils"
import "./MatrixDashboard.css"

const fetchMatrixData = async (searchParams) => {
  const response = await ApiBase.post("/api/data/question/grouped/responses", searchParams)
  if (!response.data.success) {
    throw new Error(response.data.message || "Erro ao buscar dados da matriz")
  }
  return response.data
}

export default function MatrixDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout } = useAuth()

  const theme = searchParams.get("theme")
  const baseCode = searchParams.get("baseCode")
  const variablesParam = searchParams.get("variables")

  const [demographicFilters, setDemographicFilters] = useState({})
  const [dateRange, setDateRange] = useState({ start: null, end: null })

  const variables = useMemo(() => {
    try {
      return variablesParam ? JSON.parse(variablesParam) : []
    } catch {
      return []
    }
  }, [variablesParam])

  const requestParams = useMemo(() => {
    if (!theme || !variables.length) return null
    return {
      theme,
      variables,
    }
  }, [theme, variables])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matrixData", requestParams],
    queryFn: () => fetchMatrixData(requestParams),
    enabled: !!requestParams,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const processedData = useMemo(() => {
    if (!data?.historicalData || data.searchType !== "multiple") return null

    let filteredData = data.historicalData

    // Apply demographic filters
    if (Object.keys(demographicFilters).length > 0) {
      filteredData = DEMOGRAPHIC_LABELS(filteredData, demographicFilters)
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

    // Process data for matrix visualization
    const chartData = []
    const labels = data.questionInfo?.labels || {}

    filteredData.forEach((item) => {
      const distribution = item.distribution || {}

      Object.entries(distribution).forEach(([variable, responses]) => {
        if (Array.isArray(responses)) {
          responses.forEach((response) => {
            chartData.push({
              variable,
              variableLabel: labels[variable] || variable,
              response: response.response,
              count: response.weightedCount || 0,
              year: item.year,
              rodada: item.rodada,
            })
          })
        }
      })
    })

    // Group by response type for comparison
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

    return {
      chartData,
      comparisonData,
      responseTypes,
      labels,
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

    const csvContent = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).join(","))].join(
      "\n",
    )

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

  if (!theme || !variables.length) {
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
    <div className="matrix-dashboard-wrapper">
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
                    data={data?.historicalData || []}
                    onFiltersChange={setDemographicFilters}
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
                    data={processedData?.comparisonData}
                    disabled={!processedData?.comparisonData}
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col lg={9}>
              {processedData ? (
                <Card className="matrix-chart-card">
                  <Card.Header>
                    <div className="d-flex align-items-center">
                      <BarChart3 size={20} className="me-2" />
                      <h5 className="mb-0">Comparação por Variável</h5>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="matrix-chart-container">
                      <ResponsiveContainer width="100%" height="100%">
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
                              fill={`hsl(${(index * 360) / processedData.responseTypes.length}, 70%, 50%)`}
                              name={responseType}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card.Body>
                </Card>
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
