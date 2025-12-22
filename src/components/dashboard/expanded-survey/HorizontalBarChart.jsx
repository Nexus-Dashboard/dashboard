"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

export default function HorizontalBarChart({
  data,
  questionText,
  variableName,
  variableLabel,
  sampleSize,
  originalSampleSize,
  marginOfError
}) {
  // Processar e ordenar dados usando RESPONSE_ORDER
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Filtrar #NULL! das respostas
    const filteredData = data.filter(item => {
      const response = item.response?.trim()
      return response && response !== '#NULL!' && response !== '#NULL' && response !== '#null'
    })

    // Verificar se alguma resposta tem cor definida no sistema
    const hasDefinedColors = filteredData.some(item => {
      const color = getResponseColor(item.response)
      return color !== "#999999" // Cor padrão para respostas não definidas
    })

    // Verificar se alguma resposta tem ordem definida no sistema
    const hasDefinedOrder = filteredData.some(item =>
      RESPONSE_ORDER.indexOf(item.response) >= 0
    )

    let sorted

    if (hasDefinedOrder) {
      // Ordenar usando RESPONSE_ORDER quando houver ordem definida
      sorted = [...filteredData].sort((a, b) => {
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
    } else {
      // Ordenar por porcentagem (maior para menor) quando não houver ordem definida
      sorted = [...filteredData].sort((a, b) => b.percentage - a.percentage)
    }

    // Adicionar cores
    const withColors = sorted.map((item, index) => {
      let color

      if (hasDefinedColors) {
        // Usar cores definidas no sistema
        color = getResponseColor(item.response)
      } else {
        // Aplicar gradiente de azul (do escuro ao claro)
        // Azul escuro: #1e3a8a -> Azul claro: #93c5fd
        const totalItems = sorted.length
        const ratio = totalItems > 1 ? index / (totalItems - 1) : 0

        // Interpolação de cores RGB
        const darkBlue = { r: 30, g: 58, b: 138 }   // #1e3a8a
        const lightBlue = { r: 147, g: 197, b: 253 } // #93c5fd

        const r = Math.round(darkBlue.r + (lightBlue.r - darkBlue.r) * ratio)
        const g = Math.round(darkBlue.g + (lightBlue.g - darkBlue.g) * ratio)
        const b = Math.round(darkBlue.b + (lightBlue.b - darkBlue.b) * ratio)

        color = `rgb(${r}, ${g}, ${b})`
      }

      return {
        ...item,
        color
      }
    })

    return withColors
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
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    },
    chartContainer: {
      height: 'calc(100vh - 320px)',
      minHeight: '500px',
      maxHeight: '750px',
      width: '100%',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative'
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
            <span style={customStyles.variableBadge}>{variableName}</span>
            <h6 style={{...customStyles.title, marginTop: '8px'}}>Nenhum dado disponível</h6>
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
          {variableName && (
            <span style={customStyles.variableBadge}>{variableName}</span>
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
        <div style={customStyles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              margin={{ top: 30, right: 30, bottom: 80, left: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis
                dataKey="response"
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
                tick={{ fontSize: 11, fill: '#495057', fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#495057' }}
                label={{ value: 'Porcentagem (%)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600, fill: '#495057' } }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]
                    return (
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
                              backgroundColor: data.payload.color,
                              borderRadius: '50%',
                              marginRight: '8px'
                            }}
                          />
                          <strong>{data.payload.response}</strong>
                        </div>
                        <div style={{ color: data.payload.color, fontWeight: 'bold', fontSize: '14px' }}>
                          {data.value.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                          Contagem: {data.payload.count.toFixed(0)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="percentage"
                radius={[6, 6, 0, 0]}
                barSize={80}
                label={{
                  position: 'top',
                  formatter: (value) => `${value.toFixed(1)}%`,
                  style: { fontSize: 12, fontWeight: 600, fill: '#495057' }
                }}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
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
              <strong>⚠️ Atenção:</strong> A margem de erro atual é de <strong>{marginOfError}%</strong> (tamanho da amostra: {sampleSize} de {originalSampleSize} respostas). Isso pode afetar a precisão dos resultados. Considere remover alguns filtros para aumentar a amostra.
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
              <strong>Margem de erro:</strong> ±{marginOfError}%
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
