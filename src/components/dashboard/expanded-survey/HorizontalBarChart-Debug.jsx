"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import { ResponsiveBar } from "@nivo/bar"
import { getResponseColor, RESPONSE_ORDER } from "../../../utils/chartUtils"

export default function HorizontalBarChartDebug({
  data,
  title,
  questionText,
  variableName
}) {
  // Processar e ordenar dados usando RESPONSE_ORDER
  const processedData = useMemo(() => {
    console.log('=== DEBUG HORIZONTAL BAR CHART ===')
    console.log('1. Dados originais:', data)

    if (!data || data.length === 0) {
      console.log('❌ Dados vazios ou nulos')
      return []
    }

    // Ordenar usando RESPONSE_ORDER
    const sorted = [...data].sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a.response)
      const indexB = RESPONSE_ORDER.indexOf(b.response)

      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB
      }
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1
      return a.response.localeCompare(b.response)
    })

    console.log('2. Dados ordenados:', sorted)
    console.log('3. Estrutura do primeiro item:', {
      keys: Object.keys(sorted[0]),
      values: Object.values(sorted[0]),
      sample: sorted[0]
    })

    return sorted
  }, [data])

  // Teste: renderizar dados em tabela simples
  return (
    <Card style={{ marginBottom: '20px', border: '2px solid #0d6efd' }}>
      <Card.Header style={{ background: '#0d6efd', color: 'white' }}>
        <h6 style={{ margin: 0 }}>🔍 DEBUG: {title}</h6>
      </Card.Header>
      <Card.Body>
        <div style={{ marginBottom: '20px' }}>
          <h6>Informações:</h6>
          <ul style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            <li>Total de itens: {processedData.length}</li>
            <li>Variável: {variableName}</li>
            <li>Texto da pergunta: {questionText}</li>
          </ul>
        </div>

        {/* Tabela de dados */}
        <div style={{ marginBottom: '20px' }}>
          <h6>Dados processados:</h6>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Resposta</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Count</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Percentage</th>
                <th style={{ border: '1px solid #dee2e6', padding: '8px' }}>Cor</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{item.response}</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{item.count}</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{item.percentage.toFixed(2)}%</td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: getResponseColor(item.response),
                      border: '1px solid #000'
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tentar renderizar o gráfico */}
        <div>
          <h6>Tentativa de renderização do gráfico:</h6>
          <div style={{
            height: '400px',
            border: '2px dashed #dc3545',
            background: '#f8f9fa',
            position: 'relative'
          }}>
            {processedData.length > 0 ? (
              <>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'yellow',
                  padding: '5px',
                  zIndex: 1000,
                  fontSize: '12px'
                }}>
                  ResponsiveBar deve aparecer aqui
                </div>
                <ResponsiveBar
                  data={processedData}
                  keys={['percentage']}
                  indexBy="response"
                  margin={{ top: 50, right: 130, bottom: 50, left: 150 }}
                  padding={0.3}
                  layout="horizontal"
                  valueScale={{ type: 'linear', min: 0, max: 100 }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    const color = getResponseColor(bar.indexValue)
                    console.log('Cor para', bar.indexValue, ':', color)
                    return color
                  }}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  enableLabel={true}
                  label={(d) => `${d.value.toFixed(1)}%`}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Porcentagem',
                    legendPosition: 'middle',
                    legendOffset: 32
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0
                  }}
                />
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#dc3545',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                ❌ Dados vazios - gráfico não pode ser renderizado
              </div>
            )}
          </div>
        </div>

        {/* JSON bruto */}
        <div style={{ marginTop: '20px' }}>
          <h6>JSON bruto dos dados:</h6>
          <pre style={{
            background: '#f8f9fa',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '11px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {JSON.stringify(processedData, null, 2)}
          </pre>
        </div>
      </Card.Body>
    </Card>
  )
}
