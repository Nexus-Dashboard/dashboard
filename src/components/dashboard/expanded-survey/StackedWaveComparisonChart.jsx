"use client"

import { useMemo } from "react"
import { Card, Badge } from "react-bootstrap"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

/**
 * Gráfico de barras empilhadas 100% comparativo entre Onda 1 e Onda 2
 * Para perguntas com múltiplos rótulos (ex: T_P10_1 a T_P10_8)
 */
export default function StackedWaveComparisonChart({
  wave1Data, // Array de { variable, label, stats: [{ response, percentage }] }
  wave2Data, // Array de { variable, label, stats: [{ response, percentage }] }
  questionText,
  wave1SampleSize,
  wave2SampleSize,
  wave1MarginOfError,
  wave2MarginOfError
}) {
  // Processar dados para o formato do gráfico empilhado comparativo
  const { chartData, responseKeys, responseColors, labels } = useMemo(() => {
    if (!wave1Data || !wave2Data || wave1Data.length === 0 || wave2Data.length === 0) {
      return { chartData: [], responseKeys: [], responseColors: {}, labels: [] }
    }

    // Coletar todas as respostas únicas
    const allResponses = new Set()
    const allLabels = []

    wave1Data.forEach(item => {
      if (item.label && !allLabels.includes(item.label)) {
        allLabels.push(item.label)
      }
      if (item.stats) {
        item.stats.forEach(stat => {
          if (stat.response && stat.response !== '#NULL!' && stat.response !== '#NULL') {
            allResponses.add(stat.response)
          }
        })
      }
    })

    wave2Data.forEach(item => {
      if (item.stats) {
        item.stats.forEach(stat => {
          if (stat.response && stat.response !== '#NULL!' && stat.response !== '#NULL') {
            allResponses.add(stat.response)
          }
        })
      }
    })

    // Ordenar respostas usando RESPONSE_ORDER
    const sortedResponses = Array.from(allResponses).sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a)
      const indexB = RESPONSE_ORDER.indexOf(b)

      const isNsNrA = a.toLowerCase().includes('ns/nr') || a.toLowerCase().includes('não sabe') || a.toLowerCase().includes('não respondeu')
      const isNsNrB = b.toLowerCase().includes('ns/nr') || b.toLowerCase().includes('não sabe') || b.toLowerCase().includes('não respondeu')

      if (isNsNrA && !isNsNrB) return 1
      if (!isNsNrA && isNsNrB) return -1

      if (indexA >= 0 && indexB >= 0) return indexA - indexB
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1

      return a.localeCompare(b)
    })

    // Criar mapeamento de cores
    const colors = {}
    sortedResponses.forEach(response => {
      colors[response] = getResponseColor(response)
    })

    // Criar dados para o gráfico - cada label terá duas linhas (Onda 1 e Onda 2)
    const transformed = []

    allLabels.forEach(label => {
      const wave1Item = wave1Data.find(d => d.label === label)
      const wave2Item = wave2Data.find(d => d.label === label)

      // Linha da Onda 1
      const row1 = {
        label: `${label}`,
        wave: 'Onda 1 (Mai/25)',
        fullLabel: label
      }
      sortedResponses.forEach(response => {
        row1[response] = 0
      })
      if (wave1Item?.stats) {
        wave1Item.stats.forEach(stat => {
          if (stat.response && sortedResponses.includes(stat.response)) {
            row1[stat.response] = stat.percentage || 0
          }
        })
      }

      // Linha da Onda 2
      const row2 = {
        label: `${label}`,
        wave: 'Onda 2 (Nov/25)',
        fullLabel: label
      }
      sortedResponses.forEach(response => {
        row2[response] = 0
      })
      if (wave2Item?.stats) {
        wave2Item.stats.forEach(stat => {
          if (stat.response && sortedResponses.includes(stat.response)) {
            row2[stat.response] = stat.percentage || 0
          }
        })
      }

      transformed.push(row1)
      transformed.push(row2)
    })

    return {
      chartData: transformed,
      responseKeys: sortedResponses,
      responseColors: colors,
      labels: allLabels
    }
  }, [wave1Data, wave2Data])

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.92)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            maxWidth: '320px'
          }}
        >
          <div style={{
            fontWeight: 'bold',
            marginBottom: '4px',
            color: data?.wave?.includes('Onda 1') ? '#ff9800' : '#2196f3'
          }}>
            {data?.wave}
          </div>
          <div style={{
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            fontSize: '12px'
          }}>
            {data?.fullLabel}
          </div>
          {payload.map((entry, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: entry.color,
                    borderRadius: '2px',
                    marginRight: '8px'
                  }}
                />
                <span style={{ fontSize: '12px' }}>{entry.name}</span>
              </div>
              <span style={{ marginLeft: '16px', fontWeight: 'bold' }}>
                {entry.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // Legenda customizada
  const CustomLegend = ({ payload }) => {
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '16px',
        padding: '8px 16px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        {payload.map((entry, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: '500'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: entry.color,
                borderRadius: '2px',
                marginRight: '6px'
              }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const customStyles = {
    card: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden'
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #1a5f3c 0%, #0d3320 100%)',
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
      fontSize: '16px',
      fontWeight: '500',
      margin: 0,
      lineHeight: '1.4'
    },
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    }
  }

  // Calcular altura dinamicamente (duas linhas por label)
  const chartHeight = Math.max(500, labels.length * 80 + 150)

  if (!chartData.length || !responseKeys.length) {
    return (
      <Card style={customStyles.card}>
        <Card.Header style={customStyles.cardHeader}>
          <div style={customStyles.cardHeaderOverlay}></div>
          <div style={customStyles.headerContent}>
            <h6 style={customStyles.title}>Nenhum dado disponível para comparação</h6>
          </div>
        </Card.Header>
      </Card>
    )
  }

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.cardHeader}>
        <div style={customStyles.cardHeaderOverlay}></div>
        <div style={customStyles.headerContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Badge bg="warning" text="dark" style={{ fontSize: '11px' }}>
              Onda 1 (Mai/25)
            </Badge>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>vs</span>
            <Badge bg="info" style={{ fontSize: '11px' }}>
              Onda 2 (Nov/25)
            </Badge>
          </div>
          {questionText && (
            <h6 style={customStyles.title}>{questionText}</h6>
          )}
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        {/* Indicadores de ondas */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginBottom: '16px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '4px',
              background: '#ff9800',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#ff9800' }}>
              Onda 1 (Mai/25) - n={wave1SampleSize?.toLocaleString() || 'N/A'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '4px',
              background: '#2196f3',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#2196f3' }}>
              Onda 2 (Nov/25) - n={wave2SampleSize?.toLocaleString() || 'N/A'}
            </span>
          </div>
        </div>

        <div style={{ height: chartHeight, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, bottom: 20, left: 280 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#495057' }}
              />
              <YAxis
                type="category"
                dataKey={(d) => `${d.fullLabel} - ${d.wave.includes('Onda 1') ? 'O1' : 'O2'}`}
                width={270}
                tick={{ fontSize: 10, fill: '#495057' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} verticalAlign="top" />

              {responseKeys.map((response) => (
                <Bar
                  key={response}
                  dataKey={response}
                  stackId="stack"
                  fill={responseColors[response]}
                  name={response}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informação de Margem de Erro */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div
            style={{
              flex: 1,
              minWidth: '200px',
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
              border: '1px solid #ffcc80',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#e65100'
            }}
          >
            <strong>Onda 1:</strong> Margem de erro ±{wave1MarginOfError}%
          </div>
          <div
            style={{
              flex: 1,
              minWidth: '200px',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '1px solid #90caf9',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#1565c0'
            }}
          >
            <strong>Onda 2:</strong> Margem de erro ±{wave2MarginOfError}%
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
