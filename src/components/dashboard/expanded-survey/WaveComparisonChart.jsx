"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

export default function WaveComparisonChart({
  wave1Stats,
  wave2Stats,
  questionText,
  variableName,
  variableLabel,
}) {
  // Processar dados para o gráfico de linhas
  const chartData = useMemo(() => {
    if (!wave1Stats || !wave2Stats) return []

    // Combinar todas as respostas de ambas as ondas
    const allResponses = new Set()

    wave1Stats.forEach(item => {
      if (item.response && item.response !== '#NULL!' && item.response !== '-1') {
        allResponses.add(item.response)
      }
    })

    wave2Stats.forEach(item => {
      if (item.response && item.response !== '#NULL!' && item.response !== '-1') {
        allResponses.add(item.response)
      }
    })

    // Criar mapeamento de respostas para percentuais
    const wave1Map = new Map()
    wave1Stats.forEach(item => {
      wave1Map.set(item.response, item.percentage)
    })

    const wave2Map = new Map()
    wave2Stats.forEach(item => {
      wave2Map.set(item.response, item.percentage)
    })

    // Converter para array e ordenar usando RESPONSE_ORDER
    const responses = Array.from(allResponses)
    responses.sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a)
      const indexB = RESPONSE_ORDER.indexOf(b)

      if (indexA >= 0 && indexB >= 0) return indexA - indexB
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1
      return a.localeCompare(b)
    })

    // Criar dados para o gráfico
    return responses.map(response => ({
      response,
      "Onda 1 (R13)": wave1Map.get(response) || 0,
      "Onda 2 (R16)": wave2Map.get(response) || 0,
      variation: (wave2Map.get(response) || 0) - (wave1Map.get(response) || 0),
      color: getResponseColor(response)
    }))
  }, [wave1Stats, wave2Stats])

  // Dados para o gráfico de linha temporal (por onda)
  const timelineData = useMemo(() => {
    if (!chartData.length) return []

    // Criar array com as duas ondas
    return [
      { wave: "Onda 1 (R13)", ...chartData.reduce((acc, item) => ({ ...acc, [item.response]: item["Onda 1 (R13)"] }), {}) },
      { wave: "Onda 2 (R16)", ...chartData.reduce((acc, item) => ({ ...acc, [item.response]: item["Onda 2 (R16)"] }), {}) }
    ]
  }, [chartData])

  // Obter cores para cada resposta
  const responseColors = useMemo(() => {
    const colors = {}
    const defaultColors = [
      "#334D99", "#4D66CC", "#CC804D", "#B33333", "#801A1A",
      "#198754", "#6c757d", "#0dcaf0", "#ffc107", "#6610f2"
    ]

    chartData.forEach((item, index) => {
      const definedColor = getResponseColor(item.response)
      colors[item.response] = definedColor !== "#999999"
        ? definedColor
        : defaultColors[index % defaultColors.length]
    })

    return colors
  }, [chartData])

  const customStyles = {
    card: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden',
      height: '100%',
      marginBottom: '24px'
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #198754 0%, #146c43 100%)',
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
      lineHeight: '1.4',
      textShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    variableBadge: {
      display: 'inline-block',
      background: 'rgba(255,255,255,0.25)',
      color: '#ffffff',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '800',
      border: '1px solid rgba(255,255,255,0.4)',
      letterSpacing: '0.8px'
    },
    comparisonBadge: {
      display: 'inline-block',
      background: 'rgba(255,255,255,0.9)',
      color: '#198754',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      marginLeft: '10px'
    },
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    },
    chartContainer: {
      height: '400px',
      width: '100%',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative'
    },
    variationTable: {
      marginTop: '20px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e9ecef'
    },
    tableHeader: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '12px 16px',
      fontWeight: '600',
      fontSize: '13px',
      color: '#495057',
      borderBottom: '1px solid #dee2e6'
    },
    tableRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      borderBottom: '1px solid #f1f3f4',
      fontSize: '13px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
      color: '#6c757d'
    }
  }

  if (!chartData.length) {
    return (
      <Card style={customStyles.card}>
        <Card.Header style={customStyles.cardHeader}>
          <div style={customStyles.cardHeaderOverlay}></div>
          <div style={customStyles.headerContent}>
            <span style={customStyles.variableBadge}>{variableName}</span>
            <span style={customStyles.comparisonBadge}>Comparativo Ondas</span>
            <h6 style={{...customStyles.title, marginTop: '8px'}}>Nenhum dado disponível</h6>
          </div>
        </Card.Header>
        <Card.Body style={customStyles.cardBody}>
          <div style={customStyles.emptyState}>
            <div style={{ fontSize: '48px', color: '#dee2e6', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Dados não disponíveis para comparação</div>
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
          {variableName && (
            <>
              <span style={customStyles.variableBadge}>{variableName}</span>
              <span style={customStyles.comparisonBadge}>Comparativo Ondas</span>
            </>
          )}
          {questionText && (
            <h6 style={{...customStyles.title, marginTop: '8px', marginBottom: 0}}>{questionText}</h6>
          )}
          {variableLabel && (
            <p style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '14px',
              fontWeight: '400',
              fontStyle: 'italic',
              margin: '8px 0 0 0',
              lineHeight: '1.4'
            }}>
              {variableLabel}
            </p>
          )}
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        {/* Gráfico de Linhas */}
        <div style={customStyles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timelineData}
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis
                dataKey="wave"
                tick={{ fontSize: 12, fill: '#495057', fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#495057' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
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
                          maxWidth: '300px'
                        }}
                      >
                        <div style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          {label}
                        </div>
                        {payload.map((entry, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: entry.stroke,
                                borderRadius: '50%',
                                marginRight: '8px'
                              }}
                            />
                            <span style={{ flex: 1 }}>{entry.name}:</span>
                            <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                              {entry.value?.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span style={{ color: '#495057', fontSize: '12px' }}>{value}</span>
                )}
              />
              {chartData.map((item) => (
                <Line
                  key={item.response}
                  type="monotone"
                  dataKey={item.response}
                  stroke={responseColors[item.response]}
                  strokeWidth={2}
                  dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de Variação */}
        <div style={customStyles.variationTable}>
          <div style={customStyles.tableHeader}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 2 }}>Resposta</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Onda 1 (R13)</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Onda 2 (R16)</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Variação</div>
            </div>
          </div>
          {chartData.map((item, idx) => (
            <div
              key={idx}
              style={{
                ...customStyles.tableRow,
                background: idx % 2 === 0 ? '#ffffff' : '#f8f9fa'
              }}
            >
              <div style={{
                flex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: responseColors[item.response]
                }} />
                <span style={{ fontWeight: '500' }}>{item.response}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {item["Onda 1 (R13)"].toFixed(1)}%
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {item["Onda 2 (R16)"].toFixed(1)}%
              </div>
              <div style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: '600',
                color: item.variation > 0 ? '#198754' : item.variation < 0 ? '#dc3545' : '#6c757d'
              }}>
                {item.variation > 0 ? '+' : ''}{item.variation.toFixed(1)}pp
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  )
}
