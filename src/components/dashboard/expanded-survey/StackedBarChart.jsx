"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

/**
 * Gráfico de barras empilhadas 100% para perguntas com múltiplos rótulos
 * Cada rótulo é uma linha, e as respostas são as seções empilhadas
 */
export default function StackedBarChart({
  data, // Array de { variable, label, stats: [{ response, percentage }] }
  questionText,
  sampleSize,
  originalSampleSize,
  marginOfError
}) {
  // Processar dados para o formato do gráfico empilhado
  const { chartData, responseKeys, responseColors } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], responseKeys: [], responseColors: {} }
    }

    // Coletar todas as respostas únicas de todas as variáveis
    const allResponses = new Set()
    data.forEach(item => {
      if (item.stats) {
        item.stats.forEach(stat => {
          if (stat.response && stat.response !== '#NULL!' && stat.response !== '#NULL') {
            allResponses.add(stat.response)
          }
        })
      }
    })

    // Ordenar respostas usando RESPONSE_ORDER ou ordem padrão
    const sortedResponses = Array.from(allResponses).sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a)
      const indexB = RESPONSE_ORDER.indexOf(b)

      // NS/NR sempre no final
      const isNsNrA = a.toLowerCase().includes('ns/nr') || a.toLowerCase().includes('não sabe') || a.toLowerCase().includes('não respondeu')
      const isNsNrB = b.toLowerCase().includes('ns/nr') || b.toLowerCase().includes('não sabe') || b.toLowerCase().includes('não respondeu')

      if (isNsNrA && !isNsNrB) return 1
      if (!isNsNrA && isNsNrB) return -1

      if (indexA >= 0 && indexB >= 0) return indexA - indexB
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1

      return a.localeCompare(b)
    })

    // Criar mapeamento de cores para cada resposta
    const colors = {}
    sortedResponses.forEach(response => {
      colors[response] = getResponseColor(response)
    })

    // Transformar dados para o formato do Recharts
    // Cada item será uma linha (rótulo) com as porcentagens de cada resposta
    const transformed = data.map(item => {
      const row = {
        label: item.label || item.variable,
        variable: item.variable
      }

      // Inicializar todas as respostas com 0
      sortedResponses.forEach(response => {
        row[response] = 0
      })

      // Preencher com os valores reais
      if (item.stats) {
        item.stats.forEach(stat => {
          if (stat.response && sortedResponses.includes(stat.response)) {
            row[stat.response] = stat.percentage || 0
          }
        })
      }

      return row
    })

    return {
      chartData: transformed,
      responseKeys: sortedResponses,
      responseColors: colors
    }
  }, [data])

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
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
                <span>{entry.name}</span>
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
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: entry.color,
                borderRadius: '3px',
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

  // Calcular altura dinamicamente baseado no número de itens
  const chartHeight = Math.max(400, data.length * 50 + 120)

  if (!chartData.length || !responseKeys.length) {
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
        <div style={{ ...customStyles.chartContainer, height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, bottom: 20, left: 250 }}
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
                dataKey="label"
                width={240}
                tick={{ fontSize: 11, fill: '#495057', fontWeight: 500 }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} verticalAlign="top" />

              {responseKeys.map((response, index) => (
                <Bar
                  key={response}
                  dataKey={response}
                  stackId="stack"
                  fill={responseColors[response]}
                  name={response}
                >
                  {chartData.map((entry, idx) => {
                    const value = entry[response] || 0
                    return (
                      <Cell key={`cell-${idx}`}>
                        {/* Label dentro da barra se houver espaço */}
                      </Cell>
                    )
                  })}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Labels de porcentagem sobre as barras */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <strong>Nota:</strong> As porcentagens são exibidas no tooltip ao passar o mouse sobre cada seção da barra.
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
      </Card.Body>
    </Card>
  )
}
