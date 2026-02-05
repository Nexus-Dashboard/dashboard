"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts"

/**
 * Gráfico de comparação entre ondas com barras horizontais pareadas
 * Cada resposta tem duas barras: Onda 1 (Mai/25) e Onda 2 (Nov/25)
 * Ideal para perguntas com muitas categorias (ex: P9_A + P9_B)
 */
export default function PairedBarComparisonChart({
  wave1Stats,
  wave2Stats,
  questionText,
  variableName,
  wave1VariableName,
  variableLabel,
  wave1SampleSize,
  wave2SampleSize,
  wave1MarginOfError,
  wave2MarginOfError,
}) {
  const chartData = useMemo(() => {
    const ALWAYS_LAST_RESPONSES = ['outros', 'nenhum', 'ns/nr', 'não sabe', 'não respondeu', 'nenhuma']

    const shouldBeAtEnd = (response) => {
      if (!response) return false
      const normalized = response.toLowerCase().trim()
      return ALWAYS_LAST_RESPONSES.some(last => normalized === last || normalized.includes(last))
    }

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

    // Criar mapa de respostas
    const wave1Map = new Map()
    wave1Stats.forEach(item => {
      if (item.response && item.response !== '#NULL!' && item.response !== '-1') {
        wave1Map.set(item.response, item.percentage || 0)
      }
    })

    const wave2Map = new Map()
    wave2Stats.forEach(item => {
      if (item.response && item.response !== '#NULL!' && item.response !== '-1') {
        wave2Map.set(item.response, item.percentage || 0)
      }
    })

    // Construir dados do gráfico
    const data = Array.from(allResponses).map(response => {
      const wave1Pct = wave1Map.get(response) || 0
      const wave2Pct = wave2Map.get(response) || 0
      const diff = wave2Pct - wave1Pct

      return {
        response,
        wave1: parseFloat(wave1Pct.toFixed(1)),
        wave2: parseFloat(wave2Pct.toFixed(1)),
        diff: parseFloat(diff.toFixed(1)),
        isLast: shouldBeAtEnd(response),
      }
    })

    // Ordenar: por porcentagem da Onda 2 (maior primeiro), com Outros/NS/NR no final
    data.sort((a, b) => {
      if (a.isLast && !b.isLast) return 1
      if (!a.isLast && b.isLast) return -1
      if (a.isLast && b.isLast) return b.wave2 - a.wave2
      return b.wave2 - a.wave2
    })

    return data
  }, [wave1Stats, wave2Stats])

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const wave1Val = payload.find(p => p.dataKey === 'wave1')?.value || 0
      const wave2Val = payload.find(p => p.dataKey === 'wave2')?.value || 0
      const diff = wave2Val - wave1Val

      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.92)',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          maxWidth: '300px'
        }}>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}>
            {label}
          </div>
          <div style={{ marginBottom: '4px', color: '#90caf9' }}>
            <strong>Onda 1 (Mai/25):</strong> {wave1Val.toFixed(1)}%
          </div>
          <div style={{ marginBottom: '4px', color: '#ef9a9a' }}>
            <strong>Onda 2 (Nov/25):</strong> {wave2Val.toFixed(1)}%
          </div>
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            color: diff > 0 ? '#81c784' : diff < 0 ? '#e57373' : '#ffffff',
            fontWeight: '600'
          }}>
            Variação: {diff > 0 ? '+' : ''}{diff.toFixed(1)}pp
          </div>
        </div>
      )
    }
    return null
  }

  // Calcular altura dinâmica baseada no número de respostas
  const chartHeight = Math.max(500, chartData.length * 50)

  // Custom label para barras
  const renderBarLabel = (props) => {
    const { x, y, width, height, value } = props
    if (value < 0.5) return null
    return (
      <text
        x={x + width + 5}
        y={y + height / 2}
        fill="#333"
        fontSize={11}
        fontWeight="600"
        dominantBaseline="middle"
      >
        {value.toFixed(1)}%
      </text>
    )
  }

  return (
    <Card style={{
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden',
      marginTop: '16px'
    }}>
      <Card.Body style={{ padding: '24px', background: '#ffffff' }}>
        {/* Legenda */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '14px',
              borderRadius: '3px',
              background: '#1565c0'
            }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1565c0' }}>
              Onda 1 (Mai/25) - n={wave1SampleSize?.toLocaleString('pt-BR')} ({'\u00B1'}{wave1MarginOfError}pp)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '14px',
              borderRadius: '3px',
              background: '#c62828'
            }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#c62828' }}>
              Onda 2 (Nov/25) - n={wave2SampleSize?.toLocaleString('pt-BR')} ({'\u00B1'}{wave2MarginOfError}pp)
            </span>
          </div>
        </div>

        {/* Gráfico */}
        <div style={{
          width: '100%',
          borderRadius: '12px',
          background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
          padding: '16px',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
              barGap={2}
              barCategoryGap="25%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="rgba(0,0,0,0.06)"
              />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tickFormatter={(value) => `${Math.round(value)}%`}
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis
                type="category"
                dataKey="response"
                width={280}
                tick={({ x, y, payload }) => {
                  const text = payload.value || ''
                  // Quebrar texto longo em múltiplas linhas
                  const maxChars = 40
                  const lines = []
                  let current = ''
                  const words = text.split(' ')
                  words.forEach(word => {
                    if ((current + ' ' + word).trim().length > maxChars && current) {
                      lines.push(current.trim())
                      current = word
                    } else {
                      current = (current + ' ' + word).trim()
                    }
                  })
                  if (current) lines.push(current.trim())

                  return (
                    <g>
                      {lines.map((line, i) => (
                        <text
                          key={i}
                          x={x - 5}
                          y={y + (i - (lines.length - 1) / 2) * 13}
                          textAnchor="end"
                          fill="#333"
                          fontSize={11}
                          fontWeight="500"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  )
                }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Barra Onda 1 - Azul */}
              <Bar
                dataKey="wave1"
                name="Onda 1 (Mai/25)"
                fill="#1565c0"
                radius={[0, 4, 4, 0]}
                barSize={16}
              >
                <LabelList
                  dataKey="wave1"
                  content={renderBarLabel}
                />
              </Bar>

              {/* Barra Onda 2 - Vermelho */}
              <Bar
                dataKey="wave2"
                name="Onda 2 (Nov/25)"
                fill="#c62828"
                radius={[0, 4, 4, 0]}
                barSize={16}
              >
                <LabelList
                  dataKey="wave2"
                  content={renderBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Margem de erro */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: '#e3f2fd',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#1565c0',
            fontWeight: '500'
          }}>
            Margem de erro Onda 1: {'\u00B1'}{wave1MarginOfError}%
          </span>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: '#ffebee',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#c62828',
            fontWeight: '500'
          }}>
            Margem de erro Onda 2: {'\u00B1'}{wave2MarginOfError}%
          </span>
        </div>
      </Card.Body>
    </Card>
  )
}
