"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, Button } from "react-bootstrap"
import * as d3 from "d3"
import { normalizeAnswer, getResponseColor, RESPONSE_ORDER } from "../utils/chartUtils"

// State name mappings
const ABBR_TO_STATE_NAMES = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
}

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
      const stateAbbr = ABBR_TO_STATE_NAMES[stateFullName] || stateFullName

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
          return "#e0e0e0"
        }
        return getResponseColor(stateData.dominantResponse)
      })
      .attr("stroke", (d) => {
        const stateId = d.properties.sigla
        return selectedState === stateId ? "#2c3e50" : "#ffffff"
      })
      .attr("stroke-width", (d) => {
        const stateId = d.properties.sigla
        return selectedState === stateId ? 3 : 1
      })
      .attr("opacity", (d) => {
        const stateId = d.properties.sigla
        return hoveredState === stateId ? 0.8 : 1
      })
      .style("cursor", "pointer")
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

        d3.select(this).attr("opacity", 0.8)
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
        d3.select(this).attr("opacity", 1)
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
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#2c3e50")
      .attr("pointer-events", "none")
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

  return (
    <Card className="chart-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="chart-title">Mapa Interativo do Brasil</h4>
          {selectedState && (
            <Button variant="outline-secondary" size="sm" onClick={() => onStateClick(null)}>
              Limpar Seleção ({ABBR_TO_STATE_NAMES[selectedState]})
            </Button>
          )}
        </div>

        <div className="d-flex">
          <div className="flex-grow-1" style={{ position: "relative" }}>
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 600 500"
              style={{ background: "#f8f9fa", borderRadius: "8px" }}
            />

            {/* Tooltip - só aparece quando tooltip.visible é true */}
            {tooltip.visible && tooltip.data && (
              <div
                style={{
                  position: "fixed",
                  left: tooltip.x,
                  top: tooltip.y,
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  fontSize: "14px",
                  zIndex: 1000,
                  maxWidth: "250px",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#2c3e50" }}>{tooltip.data.name}</div>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Resposta dominante:</strong> {tooltip.data.dominantResponse}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Percentual:</strong> {tooltip.data.dominantPercentage}%
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  <strong>Total de respostas:</strong> {tooltip.data.totalResponses}
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px" }}>
                  {tooltip.data.responses.slice(0, 3).map((resp, idx) => (
                    <div key={idx} style={{ marginBottom: "2px" }}>
                      {resp.response}: {resp.percentage}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ width: "200px", paddingLeft: "20px" }}>
            <h6 style={{ fontWeight: "bold", marginBottom: "15px", color: "#2c3e50" }}>Legenda</h6>
            <div style={{ fontSize: "14px" }}>
              {legendData.map(({ response, color, count }) => (
                <div
                  key={response}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      backgroundColor: color,
                      marginRight: "8px",
                      borderRadius: "2px",
                      border: "1px solid #ddd",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "500", color: "#2c3e50" }}>{response}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
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
                  color: "#666",
                  fontSize: "14px",
                  marginTop: "20px",
                }}
              >
                Selecione uma pergunta para visualizar os dados
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-3">
          <small className="text-muted">
            Clique em um estado para filtrar os dados • Passe o mouse para ver detalhes
          </small>
        </div>
      </Card.Body>
    </Card>
  )
}

export default InteractiveBrazilMap
