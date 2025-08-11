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
  normalizeAndGroupNSNR,
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

    // SEMPRE aplicar normalização NS/NR primeiro
    const allNormalizedResponses = responses.map((resp) => normalizeAndGroupNSNR(resp[selectedQuestion.key])).filter(Boolean)
    const useGrouping = shouldGroupResponses(allNormalizedResponses)

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

        // SEMPRE aplicar normalização NS/NR primeiro
        const normalizedAnswer = normalizeAndGroupNSNR(answer)
        // Depois aplicar agrupamento se necessário
        const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

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

  // Estilos customizados
  const customStyles = {
    containerRow: {
      margin: '0 -8px'
    },
    chartColumn: {
      padding: '8px',
      marginBottom: '20px'
    },
    modernCard: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      height: '100%'
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #1d1d1d 0%, #000000 100%)',
      border: 'none',
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden'
    },
    cardHeaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
      pointerEvents: 'none'
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      margin: 0,
      textShadow: '0 1px 3px rgba(0,0,0,0.2)',
      position: 'relative',
      zIndex: 1
    },
    cardBody: {
      padding: '24px 20px',
      background: '#ffffff',
      position: 'relative'
    },
    chartContainer: {
      height: '320px',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '16px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative'
    },
    chartOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(102,126,234,0.02) 0%, rgba(118,75,162,0.02) 100%)',
      borderRadius: '12px',
      pointerEvents: 'none'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6c757d'
    },
    emptyIcon: {
      fontSize: '48px',
      color: '#dee2e6',
      marginBottom: '16px'
    },
    emptyText: {
      fontSize: '16px',
      fontWeight: '500',
      marginBottom: '8px'
    },
    emptySubtext: {
      fontSize: '14px',
      color: '#adb5bd'
    }
  }

  if (!Object.keys(demographicComparisonData).length) {
    return (
      <div style={customStyles.emptyState}>
        <div style={customStyles.emptyIcon}>📊</div>
        <div style={customStyles.emptyText}>Nenhum dado demográfico disponível</div>
        <div style={customStyles.emptySubtext}>Selecione uma pergunta para visualizar os dados</div>
      </div>
    )
  }

  return (
    <Row style={customStyles.containerRow}>
      {Object.entries(demographicComparisonData).map(([key, { label, data }]) => {
        if (!data.length) return null

        // 1) ordena as barras pelo filtro
        const orderOfValues = availableDemographics
            .find((d) => d.key === key)
            .values
        const sortedData = data.slice().sort(
            (a, b) =>
            orderOfValues.indexOf(a.demographicValue) -
            orderOfValues.indexOf(b.demographicValue)
        )

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

        // Sort answers using appropriate order - ORDEM CORRETA PARA LEGENDAS
        const orderToUse = useGroupedColors ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

        // Primeiro, separar os itens que estão na ordem definida dos que não estão
        const itemsInOrder = []
        const itemsNotInOrder = []

        Array.from(allAnswers).forEach((answer) => {
          const index = orderToUse.indexOf(answer)
          if (index !== -1) {
            itemsInOrder.push({ answer, orderIndex: index })
          } else {
            itemsNotInOrder.push(answer)
          }
        })

        // Ordenar os itens que estão na ordem definida
        itemsInOrder.sort((a, b) => a.orderIndex - b.orderIndex)

        // Ordenar os itens que não estão na ordem alfabeticamente
        itemsNotInOrder.sort((a, b) => a.localeCompare(b))

        // Combinar: primeiro os da ordem definida, depois os outros
        const sortedAnswers = [
        ...itemsInOrder.map((item) => item.answer),
        ...itemsNotInOrder,
        ]
        const legendData = sortedAnswers.map((answer) => ({
        id: answer,
        label: answer,
        color: useGroupedColors
            ? groupedResponseColorMap[answer] || "#6c757d"
            : getResponseColor(answer),
        }))

        return (
          <Col lg={6} key={key} style={customStyles.chartColumn}>
            <Card 
              style={customStyles.modernCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Card.Header style={customStyles.cardHeader}>
                <div style={customStyles.cardHeaderOverlay}></div>
                <h6 style={customStyles.headerTitle}>{label}</h6>
              </Card.Header>
              <Card.Body style={customStyles.cardBody}>
                <div style={customStyles.chartContainer}>
                  <div style={customStyles.chartOverlay}></div>
                  <ResponsiveBar
                    data={sortedData}
                    keys={sortedAnswers}
                    indexBy="demographicValue"
                    margin={{ top: 20, right: 140, bottom: 60, left: 70 }}
                    padding={0.25}
                    layout="vertical"
                    valueScale={{ type: "linear", min: 0, max: 100 }}
                    indexScale={{ type: "band", round: true }}
                    colors={(bar) => {
                      return useGroupedColors ? groupedResponseColorMap[bar.id] || "#6c757d" : getResponseColor(bar.id)
                    }}
                    borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
                    borderWidth={1}
                    borderRadius={4}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 8,
                      tickRotation: 0,
                      legend: "Porcentagem (%)",
                      legendPosition: "middle",
                      legendOffset: 45,
                      style: {
                        fontSize: '12px',
                        fontWeight: '500'
                      }
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 8,
                      tickRotation: 0,
                      legend: label,
                      legendPosition: "middle",
                      legendOffset: -55,
                      style: {
                        fontSize: '12px',
                        fontWeight: '500'
                      }
                    }}
                    enableLabel={true}
                    label={(d) => `${d.value.toFixed(1)}%`}
                    labelSkipWidth={15}
                    labelSkipHeight={15}
                    labelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
                    legends={[
                    {
                        data: legendData,
                        anchor: "right",
                        direction: "column",
                        justify: false,
                        translateX: 130,
                        translateY: 0,
                        itemsSpacing: 4,
                        itemWidth: 110,
                        itemHeight: 22,
                        itemDirection: "left-to-right",
                        itemOpacity: 0.9,
                        symbolSize: 14,
                        symbolShape: 'circle',
                        effects: [
                          {
                            on: 'hover',
                            style: {
                              itemOpacity: 1,
                              itemTextColor: '#000'
                            }
                          }
                        ]
                    },
                    ]}
                    animate={true}
                    motionStiffness={120}
                    motionDamping={18}
                    theme={{
                      background: 'transparent',
                      textColor: '#495057',
                      fontSize: 12,
                      axis: {
                        domain: {
                          line: {
                            stroke: '#dee2e6',
                            strokeWidth: 1
                          }
                        },
                        legend: {
                          text: {
                            fontSize: 13,
                            fontWeight: 600,
                            fill: '#495057'
                          }
                        },
                        ticks: {
                          line: {
                            stroke: '#dee2e6',
                            strokeWidth: 1
                          },
                          text: {
                            fontSize: 11,
                            fill: '#6c757d'
                          }
                        }
                      },
                      grid: {
                        line: {
                          stroke: '#f1f3f4',
                          strokeWidth: 1
                        }
                      },
                      legends: {
                        text: {
                          fontSize: 12,
                          fontWeight: 500,
                          fill: '#495057'
                        }
                      }
                    }}
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