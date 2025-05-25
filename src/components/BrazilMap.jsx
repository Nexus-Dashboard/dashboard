"use client"

import { useState, useMemo } from "react"
import { Card } from "react-bootstrap"
import { ResponsiveChoropleth } from "@nivo/geo"
import { normalizeAnswer, getResponseColor, RESPONSE_ORDER } from "../utils/chartUtils"

// Mapeamento de nomes de estados para siglas
const STATE_NAMES_TO_ABBR = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
}

// Mapeamento inverso de siglas para nomes de estados
const ABBR_TO_STATE_NAMES = Object.entries(STATE_NAMES_TO_ABBR).reduce((acc, [name, abbr]) => {
  acc[abbr] = name
  return acc
}, {})

// Mapeamento de regiões e estados
const BRAZIL_REGIONS = {
  NORTE: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  NORDESTE: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  CENTRO_OESTE: ["DF", "GO", "MT", "MS"],
  SUDESTE: ["ES", "MG", "RJ", "SP"],
  SUL: ["PR", "RS", "SC"],
}

// GeoJSON do Brasil com estados
const brazilGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "AC", name: "Acre" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-70, -8],
            [-70, -11],
            [-67, -11],
            [-67, -8],
            [-70, -8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "AL", name: "Alagoas" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-37.5, -9],
            [-37.5, -10.5],
            [-35.5, -10.5],
            [-35.5, -9],
            [-37.5, -9],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "AM", name: "Amazonas" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-70, -2],
            [-70, -8],
            [-67, -8],
            [-60, -8],
            [-60, -2],
            [-70, -2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "AP", name: "Amapá" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-54, 2],
            [-54, -1],
            [-50, -1],
            [-50, 2],
            [-54, 2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "BA", name: "Bahia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-46, -10],
            [-46, -18],
            [-39, -18],
            [-39, -10],
            [-46, -10],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "CE", name: "Ceará" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-41, -3],
            [-41, -8],
            [-37, -8],
            [-37, -3],
            [-41, -3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "DF", name: "Distrito Federal" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-48.5, -15.5],
            [-48.5, -16],
            [-47.5, -16],
            [-47.5, -15.5],
            [-48.5, -15.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "ES", name: "Espírito Santo" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-41.5, -18],
            [-41.5, -21],
            [-39.5, -21],
            [-39.5, -18],
            [-41.5, -18],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "GO", name: "Goiás" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-53, -13],
            [-53, -19],
            [-46, -19],
            [-46, -13],
            [-53, -13],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "MA", name: "Maranhão" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-48, -2],
            [-48, -10],
            [-42, -10],
            [-42, -2],
            [-48, -2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "MG", name: "Minas Gerais" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51, -19],
            [-51, -23],
            [-40, -23],
            [-40, -19],
            [-51, -19],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "MS", name: "Mato Grosso do Sul" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-58, -17],
            [-58, -24],
            [-51, -24],
            [-51, -17],
            [-58, -17],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "MT", name: "Mato Grosso" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-61, -8],
            [-61, -18],
            [-50, -18],
            [-50, -8],
            [-61, -8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "PA", name: "Pará" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-58, 2],
            [-58, -8],
            [-48, -8],
            [-48, 2],
            [-58, 2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "PB", name: "Paraíba" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-38.5, -6],
            [-38.5, -8],
            [-34.5, -8],
            [-34.5, -6],
            [-38.5, -6],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "PE", name: "Pernambuco" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-41, -7],
            [-41, -9.5],
            [-34, -9.5],
            [-34, -7],
            [-41, -7],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "PI", name: "Piauí" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-46, -3],
            [-46, -11],
            [-41, -11],
            [-41, -3],
            [-46, -3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "PR", name: "Paraná" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-54, -23],
            [-54, -27],
            [-48, -27],
            [-48, -23],
            [-54, -23],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "RJ", name: "Rio de Janeiro" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-44.5, -21],
            [-44.5, -23.5],
            [-41, -23.5],
            [-41, -21],
            [-44.5, -21],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "RN", name: "Rio Grande do Norte" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-38, -5],
            [-38, -7],
            [-35, -7],
            [-35, -5],
            [-38, -5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "RO", name: "Rondônia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-66, -8],
            [-66, -13],
            [-60, -13],
            [-60, -8],
            [-66, -8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "RR", name: "Roraima" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-64, 5],
            [-64, -1],
            [-59, -1],
            [-59, 5],
            [-64, 5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "RS", name: "Rio Grande do Sul" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-58, -27],
            [-58, -33],
            [-49, -33],
            [-49, -27],
            [-58, -27],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "SC", name: "Santa Catarina" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-54, -26],
            [-54, -29.5],
            [-48, -29.5],
            [-48, -26],
            [-54, -26],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "SE", name: "Sergipe" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-38, -10],
            [-38, -11.5],
            [-36, -11.5],
            [-36, -10],
            [-38, -10],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "SP", name: "São Paulo" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-53, -20],
            [-53, -25],
            [-44, -25],
            [-44, -20],
            [-53, -20],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "TO", name: "Tocantins" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-50.5, -5],
            [-50.5, -13],
            [-45.5, -13],
            [-45.5, -5],
            [-50.5, -5],
          ],
        ],
      },
    },
  ],
}

const BrazilMap = ({ responses, selectedQuestion, onStateClick, selectedState }) => {
  const [hoveredState, setHoveredState] = useState(null)

  // Processar os dados por estado
  const mapData = useMemo(() => {
    if (!responses || !selectedQuestion.key) return []

    const stateResults = {}

    // Processar todas as respostas
    responses.forEach((response) => {
      // Obter estado
      const stateFullName = response.UF
      const state = STATE_NAMES_TO_ABBR[stateFullName] || stateFullName

      if (!state) return

      // Obter resposta para a pergunta selecionada
      const answer = normalizeAnswer(response[selectedQuestion.key])
      if (!answer) return

      // Inicializar contadores para o estado se necessário
      if (!stateResults[state]) {
        stateResults[state] = { counts: {}, total: 0 }
      }

      // Incrementar contadores
      stateResults[state].counts[answer] = (stateResults[state].counts[answer] || 0) + 1
      stateResults[state].total += 1
    })

    // Calcular resposta dominante para cada estado
    Object.keys(stateResults).forEach((state) => {
      if (stateResults[state].total > 0) {
        let maxCount = 0
        let dominantResponse = null

        Object.entries(stateResults[state].counts).forEach(([response, count]) => {
          if (count > maxCount) {
            maxCount = count
            dominantResponse = response
          }
        })

        stateResults[state].dominantResponse = dominantResponse
        stateResults[state].dominantPercentage = (maxCount / stateResults[state].total) * 100
        stateResults[state].dominantColor = getResponseColor(dominantResponse)
        stateResults[state].responses = Object.entries(stateResults[state].counts).map(([response, count]) => ({
          response,
          count,
          percentage: Math.round((count / stateResults[state].total) * 100),
        }))
      }
    })

    // Formatar dados para o Nivo Choropleth
    return Object.entries(stateResults).map(([state, data]) => ({
      id: state,
      value: data.dominantPercentage,
      dominantResponse: data.dominantResponse,
      color: data.dominantColor,
      responses: data.responses || [],
    }))
  }, [responses, selectedQuestion.key])

  // Função para renderizar a legenda de cores
  const renderColorLegend = () => {
    // Obter todas as respostas únicas
    const allResponses = new Set()
    mapData.forEach((state) => {
      if (state.dominantResponse) {
        allResponses.add(state.dominantResponse)
      }
    })

    // Ordenar as respostas
    const sortedResponses = Array.from(allResponses).sort((a, b) => {
      const indexA = RESPONSE_ORDER.indexOf(a)
      const indexB = RESPONSE_ORDER.indexOf(b)

      if (indexA >= 0 && indexB >= 0) return indexA - indexB
      if (indexA >= 0) return -1
      if (indexB >= 0) return 1
      return a.localeCompare(b)
    })

    return (
      <div className="color-legend" style={{ marginTop: "10px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Legenda:</div>
        {sortedResponses.map((response) => (
          <div key={response} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
            <div
              style={{
                width: "15px",
                height: "15px",
                backgroundColor: getResponseColor(response),
                marginRight: "5px",
              }}
            ></div>
            <div>{response}</div>
          </div>
        ))}
      </div>
    )
  }

  // Função para obter o tooltip
  const getTooltip = (state) => {
    const stateData = mapData.find((d) => d.id === state.id)
    if (!stateData) return null

    return (
      <div
        style={{
          background: "white",
          padding: "8px",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          fontSize: "12px",
          maxWidth: "180px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{ABBR_TO_STATE_NAMES[state.id] || state.id}</div>
        <div>Resposta dominante: {stateData.dominantResponse}</div>
        <div>{Math.round(stateData.value)}%</div>
        <div style={{ marginTop: "5px", fontSize: "10px" }}>
          {stateData.responses
            .sort((a, b) => b.percentage - a.percentage)
            .map((resp) => (
              <div key={resp.response}>
                {resp.response}: {resp.percentage}%
              </div>
            ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="chart-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="chart-title">Mapa de Respostas por Região</h4>
        </div>
        <div className="d-flex">
          <div className="chart-container" style={{ height: 400, position: "relative", flex: 1 }}>
            <ResponsiveChoropleth
              data={mapData}
              features={brazilGeoJson.features}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              colors={(d) => d.color || "#ccc"}
              domain={[0, 100]}
              unknownColor="#ccc"
              label="properties.name"
              valueFormat=".2s"
              projectionScale={400}
              projectionTranslation={[0.5, 0.5]}
              projectionRotation={[0, 0, 0]}
              enableGraticule={false}
              graticuleLineColor="#dddddd"
              borderWidth={0.5}
              borderColor="#152538"
              legends={[]}
              onClick={(state) => onStateClick(state.id)}
              onMouseEnter={(state) => setHoveredState(state.id)}
              onMouseLeave={() => setHoveredState(null)}
              tooltip={({ feature }) => getTooltip(feature)}
            />
          </div>
          <div style={{ width: "150px", padding: "0 15px" }}>{renderColorLegend()}</div>
        </div>
        <div className="text-center mt-2">
          <small>Clique em um estado para filtrar os dados</small>
        </div>
      </Card.Body>
    </Card>
  )
}

export default BrazilMap
