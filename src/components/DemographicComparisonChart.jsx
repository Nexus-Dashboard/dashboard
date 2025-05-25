"use client"

import { useState, useMemo } from "react"
import { Card, Form, Row, Col } from "react-bootstrap"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts"
import { normalizeAnswer, extractWeight } from "../utils/chartUtils"
import ChartDownloadButton from "./ChartDownloadButton"

const DemographicComparisonChart = ({
  responses,
  selectedQuestion,
  demographicKey,
  demographicLabel,
  demographicValues,
}) => {
  const [selectedValues, setSelectedValues] = useState(demographicValues.slice(0, 2))

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!responses || !selectedQuestion.key || !demographicKey || selectedValues.length === 0) {
      return []
    }

    // Group responses by the selected demographic values
    const groupedResponses = {}

    // Initialize groups
    selectedValues.forEach((value) => {
      groupedResponses[value] = []
    })

    // Filter and group responses
    responses.forEach((response) => {
      const demographicValue = response[demographicKey]
      if (selectedValues.includes(demographicValue)) {
        groupedResponses[demographicValue].push(response)
      }
    })

    // Count responses for each option within each demographic group
    const responseCounts = {}

    Object.entries(groupedResponses).forEach(([group, groupResponses]) => {
      responseCounts[group] = {}
      let totalWeight = 0

      groupResponses.forEach((response) => {
        const answer = normalizeAnswer(response[selectedQuestion.key])
        if (answer) {
          const weight = extractWeight(response)
          responseCounts[group][answer] = (responseCounts[group][answer] || 0) + weight
          totalWeight += weight
        }
      })

      // Convert counts to percentages
      if (totalWeight > 0) {
        Object.keys(responseCounts[group]).forEach((answer) => {
          responseCounts[group][answer] = Math.round((responseCounts[group][answer] / totalWeight) * 1000) / 10
        })
      }
    })

    // Collect all unique answers across all demographic groups
    const allAnswers = new Set()
    Object.values(responseCounts).forEach((groupCounts) => {
      Object.keys(groupCounts).forEach((answer) => allAnswers.add(answer))
    })

    // Create chart data structure
    const result = Array.from(allAnswers).map((answer) => {
      const dataPoint = { answer }
      selectedValues.forEach((value) => {
        dataPoint[value] = responseCounts[value][answer] || 0
      })
      return dataPoint
    })

    // Sort by the first demographic group's percentages (descending)
    if (selectedValues.length > 0) {
      result.sort((a, b) => (b[selectedValues[0]] || 0) - (a[selectedValues[0]] || 0))
    }

    return result
  }, [responses, selectedQuestion.key, demographicKey, selectedValues])

  // Handle demographic value selection
  const handleDemographicChange = (value, checked) => {
    if (checked) {
      setSelectedValues((prev) => [...prev, value])
    } else {
      setSelectedValues((prev) => prev.filter((v) => v !== value))
    }
  }

  // Generate a filename for the download
  const downloadFilename = `${selectedQuestion.key}-por-${demographicKey}`

  // Prepare data for download
  const downloadData = useMemo(() => {
    if (chartData.length === 0) return []

    return chartData.map((item) => {
      const downloadItem = { Resposta: item.answer }
      selectedValues.forEach((value) => {
        downloadItem[value] = item[value]
      })
      return downloadItem
    })
  }, [chartData, selectedValues])

  // Define colors for demographic groups
  const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853", "#8884d8", "#82ca9d"]

  return (
    <Card className="mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="chart-title">Comparação por {demographicLabel}</h4>
          <ChartDownloadButton
            chartData={downloadData}
            filename={downloadFilename}
            questionLabel={selectedQuestion.label}
          />
        </div>

        <Row className="mb-3">
          <Col>
            <p className="text-muted">Selecione os grupos de {demographicLabel.toLowerCase()} para comparar:</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {demographicValues.map((value, index) => (
                <Form.Check
                  key={value}
                  type="checkbox"
                  id={`${demographicKey}-${value}`}
                  label={value}
                  checked={selectedValues.includes(value)}
                  onChange={(e) => handleDemographicChange(value, e.target.checked)}
                  inline
                />
              ))}
            </div>
          </Col>
        </Row>

        {chartData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="answer" type="category" width={90} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend />

                {selectedValues.map((value, index) => (
                  <Bar key={value} dataKey={value} name={value} fill={colors[index % colors.length]} barSize={20}>
                    <LabelList dataKey={value} position="right" formatter={(v) => (v > 0 ? `${v.toFixed(1)}%` : "")} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">
              Selecione pelo menos um grupo de {demographicLabel.toLowerCase()} para visualizar os dados.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

export default DemographicComparisonChart
