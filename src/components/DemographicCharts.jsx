"use client"

import { useMemo } from "react"
import { Row, Col, Card } from "react-bootstrap"
import { ResponsiveBar } from "@nivo/bar"
import {
  normalizeAnswer,
  getResponseColor,
  extractWeight,
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  GROUPED_RESPONSE_ORDER,
  RESPONSE_ORDER,
} from "../utils/chartUtils"

const DemographicCharts = ({ selectedQuestion, surveys, filteredResponses, availableDemographics }) => {
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

      return (monthOrder[b.month] || 0) - (monthOrder[a.month] || 0)
    })

    const latestSurvey = sortedSurveys[0]
    if (!latestSurvey) return {}

    const responses = filteredResponses[latestSurvey._id] || []
    if (!responses.length) return {}

    // Check if we should use response grouping
    const allActualResponses = responses.map((resp) => normalizeAnswer(resp[selectedQuestion.key])).filter(Boolean)
    const useGrouping = shouldGroupResponses(allActualResponses)

    // Process data for each demographic type
    const result = {}

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

        // Apply grouping if needed
        const finalAnswer = useGrouping ? groupResponses(answer) : answer

        groupedByDemographic[demographicValue] = groupedByDemographic[demographicValue] || {}
        groupedByDemographic[demographicValue][finalAnswer] =
          (groupedByDemographic[demographicValue][finalAnswer] || 0) + weight
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

  if (!Object.keys(demographicComparisonData).length) {
    return null
  }

  return (
    <Row>
      {Object.entries(demographicComparisonData).map(([key, { label, data }]) => {
        if (!data.length) return null

        // Get all unique answers for consistent colors
        const allAnswers = new Set()
        data.forEach((item) => {
          Object.keys(item).forEach((k) => {
            if (k !== "demographicValue") {
              allAnswers.add(k)
            }
          })
        })

        // Determine if we should use grouped colors
        const useGroupedColors = Array.from(allAnswers).some((answer) =>
          ["Ótimo/Bom", "Regular", "Ruim/Péssimo", "NS/NR"].includes(answer),
        )

        // Sort answers using appropriate order (ORDEM CORRETA)
        const orderToUse = useGroupedColors ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
        const sortedAnswers = Array.from(allAnswers).sort((a, b) => {
          const indexA = orderToUse.indexOf(a)
          const indexB = orderToUse.indexOf(b)

          if (indexA >= 0 && indexB >= 0) {
            return indexA - indexB
          }

          if (indexA >= 0) return -1
          if (indexB >= 0) return 1

          return a.localeCompare(b)
        })

        return (
          <Col lg={6} key={key} className="mb-4">
            <Card>
              <Card.Header>
                <h6 className="mb-0">{label}</h6>
              </Card.Header>
              <Card.Body>
                <div style={{ height: "300px" }}>
                  <ResponsiveBar
                    data={data}
                    keys={sortedAnswers}
                    indexBy="demographicValue"
                    margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                    padding={0.3}
                    layout="vertical"
                    valueScale={{ type: "linear", min: 0, max: 100 }}
                    indexScale={{ type: "band", round: true }}
                    colors={(bar) => {
                      // APLICAR CORES CORRETAS DIRETAMENTE
                      return useGroupedColors ? groupedResponseColorMap[bar.id] || "#6c757d" : getResponseColor(bar.id)
                    }}
                    borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Porcentagem (%)",
                      legendPosition: "middle",
                      legendOffset: 32,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: label,
                      legendPosition: "middle",
                      legendOffset: -40,
                    }}
                    enableLabel={true}
                    label={(d) => `${d.value.toFixed(1)}%`}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                    legends={[
                      {
                        dataFrom: "keys",
                        anchor: "right",
                        direction: "column",
                        justify: false,
                        translateX: 120,
                        translateY: 0,
                        itemsSpacing: 2,
                        itemWidth: 100,
                        itemHeight: 20,
                        itemDirection: "left-to-right",
                        itemOpacity: 0.85,
                        symbolSize: 12,
                      },
                    ]}
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}

export default DemographicCharts
