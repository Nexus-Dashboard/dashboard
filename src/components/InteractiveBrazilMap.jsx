"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, Badge, Button } from "react-bootstrap"
import * as d3 from "d3"
import { normalizeAnswer, getResponseColor, RESPONSE_ORDER } from "../utils/chartUtils"

// State name mappings
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

const ABBR_TO_STATE_NAMES = Object.entries(STATE_NAMES_TO_ABBR).reduce((acc, [name, abbr]) => {
  acc[abbr] = name
  return acc
}, {})

const InteractiveBrazilMap = ({ responses, selectedQuestion, onStateClick, selectedState, filters = {} }) => {
  const svgRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  })

  // Load Brazil GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch("/brazil-states.json")
        const data = await response.json()
        setGeoData(data)
      } catch (error) {
        console.error("Error loading Brazil GeoJSON:", error)
      }
    }
    loadGeoData()
  }, [])

  // Process response data by state
  const mapData = useMemo(() => {
    if (!responses || !selectedQuestion?.key) return new Map()

    const stateResults = new Map()

    // Filter responses based on current filters
    const filteredResponses = responses.filter((response) => {
      return Object.entries(filters).every(([key, values]) => {
        if (!values.length) return true
        return values.includes(response[key])
      })
    })

    // Process responses by state
    filteredResponses.forEach((response) => {
      const stateFullName = response.UF
      const stateAbbr = STATE_NAMES_TO_ABBR[stateFullName] || stateFullName

      if (!stateAbbr) return

      const answer = normalizeAnswer(response[selectedQuestion.key])
      if (!answer) return

      if (!stateResults.has(stateAbbr)) {
        stateResults.set(stateAbbr, {
          id: stateAbbr,
          name: stateFullName,
          counts: {},
          total: 0,
        })
      }

      const stateData = stateResults.get(stateAbbr)
      stateData.counts[answer] = (stateData.counts[answer] || 0) + 1
      stateData.total += 1
    })

    // Calculate dominant response and percentages
    stateResults.forEach((stateData, stateId) => {
      if (stateData.total > 0) {
        let maxCount = 0
        let dominantResponse = null

        Object.entries(stateData.counts).forEach(([response, count]) => {
          if (count > maxCount) {
            maxCount = count
            dominantResponse = response
          }
        })

        stateData.dominantResponse = dominantResponse
        stateData.dominantPercentage = Math.round((maxCount / stateData.total) * 100)
        stateData.responses = Object.entries(stateData.counts)
          .map(([response, count]) => ({
            response,
            count,
            percentage: Math.round((count / stateData.total) * 100),
          }))
          .sort((a, b) => {
            // Ordenar responses usando RESPONSE_ORDER
            const indexA = RESPONSE_ORDER.indexOf(a.response)
            const indexB = RESPONSE_ORDER.indexOf(b.response)

            if (indexA >= 0 && indexB >= 0) return indexA - indexB
            if (indexA >= 0) return -1
            if (indexB >= 0) return 1
            return b.percentage - a.percentage
          })
        stateData.totalResponses = stateData.total
      }
    })

    return stateResults
  }, [responses, selectedQuestion, filters])

  // D3 map rendering
  useEffect(() => {
    if (!geoData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 600
    const height = 500

    // Set up projection
    const projection = d3.geoMercator().fitSize([width, height], geoData)

    const path = d3.geoPath().projection(projection)

    // Create main group
    const g = svg.append("g")

    // Add states
    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const stateData = mapData.get(d.properties.sigla)
        if (!stateData || !stateData.dominantResponse) {
          return "#f1f3f4"
        }
        return getResponseColor(stateData.dominantResponse)
      })
      .attr("stroke", (d) => {
        const stateId = d.properties.sigla
        return selectedState === stateId ? "#4f46e5" : "#ffffff"
      })
      .attr("stroke-width", (d) => {
        const stateId = d.properties.sigla
        return selectedState === stateId ? 3 : 1.5
      })
      .attr("opacity", (d) => {
        const stateId = d.properties.sigla
        return hoveredState === stateId ? 0.85 : 1
      })
      .style("cursor", "pointer")
      .style("filter", (d) => {
        const stateId = d.properties.sigla
        return hoveredState === stateId ? "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" : "none"
      })
      .style("transition", "all 0.2s ease")
      .on("mouseover", function (event, d) {
        const stateId = d.properties.sigla
        const stateData = mapData.get(stateId)

        setHoveredState(stateId)

        if (stateData) {
          const [x, y] = d3.pointer(event, document.body)
          setTooltip({
            visible: true,
            x: x + 10,
            y: y - 10,
            data: stateData,
          })
        }

        d3.select(this)
          .attr("opacity", 0.85)
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))")
      })
      .on("mousemove", (event) => {
        const [x, y] = d3.pointer(event, document.body)
        setTooltip((prev) => ({
          ...prev,
          x: x + 10,
          y: y - 10,
        }))
      })
      .on("mouseout", function () {
        setHoveredState(null)
        setTooltip((prev) => ({ ...prev, visible: false, data: null }))
        d3.select(this)
          .attr("opacity", 1)
          .style("filter", "none")
      })
      .on("click", (event, d) => {
        const stateId = d.properties.sigla
        const stateFullName = ABBR_TO_STATE_NAMES[stateId] || stateId
        if (onStateClick) {
          onStateClick(stateFullName)
        }
      })

    // Add state labels for larger states
    g.selectAll("text")
      .data(
        geoData.features.filter((d) => {
          const bounds = path.bounds(d)
          const area = (bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1])
          return area > 1000
        }),
      )
      .enter()
      .append("text")
      .attr("x", (d) => path.centroid(d)[0])
      .attr("y", (d) => path.centroid(d)[1])
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#374151")
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
      .text((d) => d.properties.sigla)
  }, [geoData, mapData, hoveredState, selectedState, onStateClick])

  // Generate legend data - com ordem correta
  const legendData = useMemo(() => {
    const responseSet = new Set()
    mapData.forEach((stateData) => {
      if (stateData.dominantResponse) {
        responseSet.add(stateData.dominantResponse)
      }
    })

    return Array.from(responseSet)
      .sort((a, b) => {
        const indexA = RESPONSE_ORDER.indexOf(a)
        const indexB = RESPONSE_ORDER.indexOf(b)

        if (indexA >= 0 && indexB >= 0) return indexA - indexB
        if (indexA >= 0) return -1
        if (indexB >= 0) return 1
        return a.localeCompare(b)
      })
      .map((response) => ({
        response,
        color: getResponseColor(response),
        count: Array.from(mapData.values()).filter((state) => state.dominantResponse === response).length,
      }))
  }, [mapData])

  const clearSelection = () => {
    if (onStateClick) {
      onStateClick(null)
    }
  }

  return (
    <Card 
      className="modern-map-card"
      style={{
        border: 'none',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        overflow: 'hidden'
      }}
    >
      <Card.Body style={{ padding: '24px' }}>
        {/* Header */}
        <div 
          className="d-flex justify-content-between align-items-center mb-4"
          style={{
            paddingBottom: '16px',
            borderBottom: '2px solid #e2e8f0'
          }}
        >
          <div>
            <h3 
              className="chart-title mb-1"
            >Mapa Interativo do Brasil
            </h3>
            <p 
              className="text-muted mb-0"
              style={{
                fontSize: '0.9rem',
                color: '#64748b'
              }}
            >
              Visualização geográfica das respostas por estado
            </p>
          </div>
          {selectedState && (
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={clearSelection}
              style={{
                borderRadius: '10px',
                fontWeight: '500',
                padding: '8px 16px',
                border: '2px solid #ef4444',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.05)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ef4444'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.05)'
                e.target.style.color = '#ef4444'
              }}
            >
              ✕ Limpar Seleção
            </Button>
          )}
        </div>

        {/* Selected State Badge */}
        {selectedState && (
          <div className="mb-4">
            <Badge 
              bg="primary" 
              className="me-2"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: '500',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              📍 Estado Selecionado: {ABBR_TO_STATE_NAMES[selectedState] || selectedState}
            </Badge>
          </div>
        )}

        <div className="d-flex" style={{ gap: '24px' }}>
          {/* Map Container */}
          <div 
            className="flex-grow-1" 
            style={{ 
              position: "relative",
              background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 600 500"
              style={{ 
                background: "transparent", 
                borderRadius: "12px",
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))'
              }}
            />

            {/* Enhanced Tooltip */}
            {tooltip.visible && tooltip.data && (
              <div
                style={{
                  position: "fixed",
                  left: tooltip.x,
                  top: tooltip.y,
                  background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                  border: "none",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)",
                  fontSize: "14px",
                  zIndex: 1000,
                  maxWidth: "280px",
                  pointerEvents: "none",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)"
                }}
              >
                <div 
                  style={{ 
                    fontWeight: "700", 
                    marginBottom: "12px", 
                    color: "#1e293b",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  🏛️ {tooltip.data.name}
                </div>
                <div 
                  style={{ 
                    marginBottom: "8px",
                    padding: "8px 12px",
                    background: "rgba(79, 70, 229, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(79, 70, 229, 0.2)"
                  }}
                >
                  <strong style={{ color: "#4f46e5" }}>Resposta dominante:</strong>
                  <div style={{ fontWeight: "600", color: "#1e293b", marginTop: "4px" }}>
                    {tooltip.data.dominantResponse}
                  </div>
                </div>
                <div 
                  style={{ 
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <strong style={{ color: "#374151" }}>Percentual:</strong> 
                  <span 
                    style={{ 
                      fontWeight: "700", 
                      color: "#059669",
                      fontSize: "16px"
                    }}
                  >
                    {tooltip.data.dominantPercentage}%
                  </span>
                </div>
                <div 
                  style={{ 
                    fontSize: "12px", 
                    color: "#6b7280",
                    padding: "8px 0",
                    borderTop: "1px solid #e5e7eb"
                  }}
                >
                  <strong>Total de respostas:</strong> {tooltip.data.totalResponses}
                </div>
                <div style={{ marginTop: "12px", fontSize: "12px" }}>
                  <div style={{ fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                    📊 Distribuição:
                  </div>
                  {tooltip.data.responses.slice(0, 3).map((resp, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        background: idx === 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
                        borderRadius: "6px"
                      }}
                    >
                      <span style={{ color: "#374151" }}>{resp.response}:</span>
                      <span style={{ fontWeight: "600", color: idx === 0 ? "#059669" : "#6b7280" }}>
                        {resp.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Legend */}
          <div 
            style={{ 
              width: "240px", 
              background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0"
            }}
          >
            <h5 
              style={{ 
                fontWeight: "700", 
                marginBottom: "20px", 
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
             Legenda
            </h5>
            <div style={{ fontSize: "14px" }}>
              {legendData.map(({ response, color, count }) => (
                <div
                  key={response}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    padding: "12px",
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    transition: "all 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255,255,255,1)"
                    e.target.style.transform = "translateY(-2px)"
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.7)"
                    e.target.style.transform = "translateY(0)"
                    e.target.style.boxShadow = "none"
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: color,
                      marginRight: "12px",
                      borderRadius: "6px",
                      border: "2px solid #ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "2px" }}>
                      {response}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {count} estado{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {mapData.size === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "14px",
                  marginTop: "30px",
                  padding: "20px",
                  background: "rgba(148, 163, 184, 0.1)",
                  borderRadius: "12px",
                  border: "2px dashed #cbd5e1"
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🤔</div>
                <div style={{ fontWeight: "500", marginBottom: "4px" }}>Nenhum dado disponível</div>
                <div style={{ fontSize: "12px" }}>Selecione uma pergunta para visualizar</div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Footer */}
        <div 
          className="text-center mt-4"
          style={{
            paddingTop: "20px",
            borderTop: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
              borderRadius: "12px",
              padding: "12px 20px",
              display: "inline-block",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <small 
              className="text-muted"
              style={{
                color: "#64748b",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem"
              }}
            >
              <span>🖱️ Clique em um estado para filtrar</span>
              <span style={{ color: "#cbd5e1" }}>•</span>
              <span>👆 Passe o mouse para detalhes</span>
            </small>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default InteractiveBrazilMap