"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import { ResponsiveBar } from "@nivo/bar"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

export default function HorizontalBarChart({
  data,
  title,
  questionText,
  variableName
}) {
  // Processar e ordenar dados usando RESPONSE_ORDER
  const processedData = useMemo(() => {
    console.log('HorizontalBarChart - Dados recebidos:', data)

    if (!data || data.length === 0) {
      console.log('HorizontalBarChart - Sem dados para exibir')
      return []
    }

    // Ordenar usando RESPONSE_ORDER
    const sorted = [...data].sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a.response)
      const indexB = RESPONSE_ORDER.indexOf(b.response)

      // Se ambos estão na lista de ordem, ordenar por posição
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB
      }

      // Se apenas A está na lista, A vem primeiro
      if (indexA >= 0) return -1

      // Se apenas B está na lista, B vem primeiro
      if (indexB >= 0) return 1

      // Se nenhum está na lista, ordenar alfabeticamente
      return a.response.localeCompare(b.response)
    })

    console.log('HorizontalBarChart - Dados processados:', sorted)
    return sorted
  }, [data])

  const customStyles = {
    card: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden',
      height: '100%'
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #1d1d1d 0%, #000000 100%)',
      border: 'none',
      padding: '20px 24px',
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
    headerContent: {
      position: 'relative',
      zIndex: 1
    },
    title: {
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: '600',
      margin: 0,
      marginBottom: '8px',
      textShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    subtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: '13px',
      margin: 0,
      fontWeight: '400'
    },
    variableBadge: {
      display: 'inline-block',
      background: 'rgba(255,255,255,0.2)',
      color: '#ffffff',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      marginTop: '8px',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    },
    chartContainer: {
      height: '500px',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.05)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
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
    }
  }

  if (!processedData.length) {
    return (
      <Card style={customStyles.card}>
        <Card.Header style={customStyles.cardHeader}>
          <div style={customStyles.cardHeaderOverlay}></div>
          <div style={customStyles.headerContent}>
            <h6 style={customStyles.title}>{title}</h6>
          </div>
        </Card.Header>
        <Card.Body style={customStyles.cardBody}>
          <div style={customStyles.emptyState}>
            <div style={customStyles.emptyIcon}>📊</div>
            <div style={customStyles.emptyText}>Nenhum dado disponível</div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.cardHeader}>
        <div style={customStyles.cardHeaderOverlay}></div>
        <div style={customStyles.headerContent}>
          <h6 style={customStyles.title}>{title}</h6>
          {questionText && (
            <p style={customStyles.subtitle}>{questionText}</p>
          )}
          {variableName && (
            <span style={customStyles.variableBadge}>{variableName}</span>
          )}
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        <div style={customStyles.chartContainer}>
          {processedData.length > 0 ? (
            <ResponsiveBar
              data={processedData}
              keys={['percentage']}
              indexBy="response"
            margin={{ top: 20, right: 40, bottom: 60, left: 180 }}
            padding={0.3}
            layout="horizontal"
            valueScale={{ type: 'linear', min: 0, max: 100 }}
            indexScale={{ type: 'band', round: true }}
            colors={(bar) => getResponseColor(bar.indexValue)}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            borderWidth={1}
            borderRadius={6}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 8,
              tickRotation: 0,
              legend: 'Porcentagem (%)',
              legendPosition: 'middle',
              legendOffset: 45,
              format: (value) => `${value}%`
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 8,
              tickRotation: 0,
              legend: null,
              legendPosition: 'middle',
              legendOffset: -40
            }}
            enableLabel={true}
            label={(d) => `${d.value.toFixed(1)}%`}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="#ffffff"
            animate={true}
            motionStiffness={120}
            motionDamping={18}
            theme={{
              background: 'transparent',
              textColor: '#495057',
              fontSize: 13,
              axis: {
                domain: {
                  line: {
                    stroke: '#dee2e6',
                    strokeWidth: 1
                  }
                },
                legend: {
                  text: {
                    fontSize: 14,
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
                    fontSize: 12,
                    fill: '#495057',
                    fontWeight: 500
                  }
                }
              },
              grid: {
                line: {
                  stroke: '#f1f3f4',
                  strokeWidth: 1
                }
              },
              labels: {
                text: {
                  fontSize: 13,
                  fontWeight: 600,
                  fill: '#ffffff'
                }
              }
            }}
            tooltip={({ indexValue, value, color }) => (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.92)',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: color,
                      borderRadius: '50%',
                      marginRight: '8px'
                    }}
                  />
                  <strong>{indexValue}</strong>
                </div>
                <div style={{ color: color, fontWeight: 'bold', fontSize: '14px' }}>
                  {value.toFixed(1)}%
                </div>
              </div>
            )}
          />
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#6c757d'
            }}>
              <p>Processando dados do gráfico...</p>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
