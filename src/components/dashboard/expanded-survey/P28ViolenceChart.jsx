"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts"
import { MAP_RESPONSE_BASE_COLORS } from "../../../utils/questionGrouping"

/**
 * Gráfico especial para perguntas P28 (violência)
 * Mostra a porcentagem de respostas positivas para cada tipo de violência
 */
export default function P28ViolenceChart({
  data, // Array de { variable, label, stats: [{ response, percentage, count, weightedCount }] }
  questionText,
  sampleSize,
  originalSampleSize,
  marginOfError
}) {
  // Processar dados para mostrar apenas porcentagem de respostas positivas
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Para cada tipo de violência, calcular a porcentagem baseada nos weights
    const processed = data.map(item => {
      const stats = item.stats || []

      // Encontrar respostas que indicam que a pessoa FOI vítima
      // Pode ser "Sim", ou o próprio tipo de violência (quando houver resposta)
      const positiveResponses = stats.filter(stat => {
        const resp = stat.response?.toLowerCase() || ''
        return resp.includes('sim') ||
               resp.includes('assalto') ||
               resp.includes('roubo') ||
               resp.includes('homicídio') ||
               resp.includes('atentado') ||
               resp.includes('sequestro') ||
               resp.includes('bala') ||
               resp.includes('furto') ||
               resp.includes('violência') ||
               resp.includes('briga')
      })

      // Somar os weights das respostas positivas (weightedCount)
      // e calcular a porcentagem dividindo pelo universo total (originalSampleSize = 9011)
      const totalWeightedCount = positiveResponses.reduce((sum, stat) => sum + (stat.weightedCount || 0), 0)
      const totalCount = positiveResponses.reduce((sum, stat) => sum + (stat.count || 0), 0)

      // Calcular porcentagem: (soma dos weights / universo total) * 100
      const percentage = originalSampleSize > 0 ? (totalWeightedCount / originalSampleSize) * 100 : 0

      return {
        label: item.label || item.variable,
        variable: item.variable,
        percentage: percentage,
        count: totalCount,
        weightedCount: totalWeightedCount
      }
    })

    // Ordenar por porcentagem decrescente
    processed.sort((a, b) => b.percentage - a.percentage)

    return processed
  }, [data, originalSampleSize])

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
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
            {data.label}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Percentual de vítimas:</strong> {data.percentage.toFixed(1)}%
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Quantidade de respostas:</strong> {data.count}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
            Peso ponderado: {data.weightedCount?.toFixed(2)}
          </div>
        </div>
      )
    }
    return null
  }

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
      fontSize: '16px',
      fontWeight: '500',
      margin: 0,
      lineHeight: '1.4',
      textShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    },
    chartContainer: {
      width: '100%',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative'
    }
  }

  // Calcular altura dinamicamente
  const chartHeight = Math.max(400, chartData.length * 60 + 120)

  if (!chartData.length) {
    return (
      <Card style={customStyles.card}>
        <Card.Header style={customStyles.cardHeader}>
          <div style={customStyles.cardHeaderOverlay}></div>
          <div style={customStyles.headerContent}>
            <h6 style={customStyles.title}>Nenhum dado disponível</h6>
          </div>
        </Card.Header>
        <Card.Body style={customStyles.cardBody}>
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div>Nenhum dado disponível para exibir</div>
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
          {questionText && (
            <h6 style={customStyles.title}>{questionText}</h6>
          )}
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        <div style={{ ...customStyles.chartContainer, height: chartHeight, padding: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(value) => `${Math.round(value)}%`}
                tick={{ fontSize: 12, fill: '#495057' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={350}
                tick={(props) => {
                  const { x, y, payload } = props
                  const words = payload.value.split(' ')
                  const maxCharsPerLine = 45
                  const lines = []
                  let currentLine = ''

                  words.forEach(word => {
                    if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
                      lines.push(currentLine.trim())
                      currentLine = word + ' '
                    } else {
                      currentLine += word + ' '
                    }
                  })
                  if (currentLine.trim()) {
                    lines.push(currentLine.trim())
                  }

                  return (
                    <g transform={`translate(${x},${y})`}>
                      {lines.map((line, index) => (
                        <text
                          key={index}
                          x={0}
                          y={0}
                          dy={index * 12 - ((lines.length - 1) * 12) / 2}
                          textAnchor="end"
                          fill="#495057"
                          fontSize="11"
                          fontWeight="500"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  )
                }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="percentage"
                fill={MAP_RESPONSE_BASE_COLORS["Ruim"] || "#dc3545"}
                radius={[0, 8, 8, 0]}
              >
                <LabelList
                  dataKey="percentage"
                  position="right"
                  formatter={(value) => `${value.toFixed(1)}%`}
                  style={{
                    fill: '#495057',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informação de Amostra e Margem de Erro */}
        <div style={{ marginTop: '16px' }}>
          {marginOfError > 10 ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                border: '1px solid #ffc107',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#856404'
              }}
            >
              <strong>⚠️ Atenção:</strong> A margem de erro atual é de <strong>{marginOfError}%</strong> (tamanho da amostra: {sampleSize} de {originalSampleSize} respostas). Isso pode afetar a precisão dos resultados.
            </div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                border: '1px solid #90caf9',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#1565c0'
              }}
            >
              <strong>Margem de erro:</strong> ±{marginOfError}% | <strong>Amostra:</strong> {sampleSize} respondentes
            </div>
          )}
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <strong>Nota:</strong> Este gráfico mostra o percentual de pessoas que responderam positivamente para cada tipo de violência.
        </div>
      </Card.Body>
    </Card>
  )
}
