"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Box, Grid } from "@mui/material"
import {
  normalizeAnswer,
  groupResponses,
  shouldGroupResponses,
  normalizeAndGroupNSNR,
} from "../utils/chartUtils"
import { MAP_RESPONSE_BASE_COLORS } from "../utils/questionGrouping"

const ABBR_TO_STATE_NAMES = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
}

const STATE_NAME_TO_ABBR = Object.fromEntries(Object.entries(ABBR_TO_STATE_NAMES).map(([abbr, name]) => [name, abbr]))

const InteractiveBrazilMap = ({ responses, selectedQuestion, onStateClick, selectedMapResponse }) => {
  const svgRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [colorScale, setColorScale] = useState(() => d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]))

  useEffect(() => {
    fetch("/brazil-states.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Error loading Brazil GeoJSON:", err))
  }, [])

  const mapData = useMemo(() => {
    if (!responses || responses.length === 0 || !selectedQuestion?.variable) {
      return { stateResults: new Map() }
    }

    const questionKey = selectedQuestion.variable
    const stateResults = new Map()
    const allAnswersInMap = new Set(responses.map((r) => normalizeAnswer(r[questionKey])).filter(Boolean))
    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))

    responses.forEach((response) => {
      const stateName = response.UF
      if (!stateName || !STATE_NAME_TO_ABBR[stateName]) return

      const stateAbbr = STATE_NAME_TO_ABBR[stateName]
      const answer = normalizeAnswer(response[questionKey])
      if (!answer) return

      const normalizedAnswer = normalizeAndGroupNSNR(answer)
      if (normalizedAnswer === null) return

      const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

      if (!stateResults.has(stateAbbr)) {
        stateResults.set(stateAbbr, {
          id: stateAbbr,
          name: stateName,
          counts: {},
          total: 0,
          percentages: {},
        })
      }

      const stateData = stateResults.get(stateAbbr)
      stateData.counts[finalAnswer] = (stateData.counts[finalAnswer] || 0) + 1
      stateData.total += 1
    })

    // Calcular percentuais para todas as respostas
    stateResults.forEach((stateData) => {
      if (stateData.total > 0) {
        Object.keys(stateData.counts).forEach((response) => {
          stateData.percentages[response] = (stateData.counts[response] / stateData.total) * 100
        })
        
        // Encontrar resposta dominante
        stateData.dominantResponse = Object.keys(stateData.counts).reduce((a, b) =>
          stateData.counts[a] > stateData.counts[b] ? a : b,
        )
        stateData.dominantPercentage = stateData.percentages[stateData.dominantResponse]
      }
    })

    return { stateResults }
  }, [responses, selectedQuestion])

  useEffect(() => {
    if (!selectedMapResponse || !mapData.stateResults.size) {
      const defaultScale = d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]).clamp(true)
      setColorScale(() => defaultScale)
      return
    }

    const baseColor = MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#9e9e9e"
    const lightColor = d3.color(baseColor).brighter(2.5).formatHex()

    const percentages = Array.from(mapData.stateResults.values())
      .map((state) => state.percentages[selectedMapResponse] || 0)
      .filter((p) => p > 0)

    const maxPercentage = percentages.length > 0 ? Math.max(...percentages) : 100
    const scale = d3.scaleLinear().domain([0, maxPercentage]).range([lightColor, baseColor]).clamp(true)
    setColorScale(() => scale)
  }, [selectedMapResponse, mapData])

  const calculateMarginOfError = (n) => {
    if (!n || n === 0) return 0
    return Math.sqrt(1 / n) * 100
  }

  // Tooltip completo que mostra todas as informações
  const renderTooltipContent = (stateData, stateAbbr) => {
    if (!stateData) {
      return (
        <div>
          <strong>{ABBR_TO_STATE_NAMES[stateAbbr] || stateAbbr}</strong>
          <br />
          <span style={{ color: "rgba(255,255,255,0.8)" }}>Sem dados disponíveis</span>
        </div>
      )
    }

    const marginOfError = calculateMarginOfError(stateData.total)
    
    // Ordenar respostas por percentual (maior para menor)
    const sortedResponses = Object.entries(stateData.percentages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3) // Mostrar apenas as 3 principais

    return (
      <div>
        <strong style={{ fontSize: "15px", display: "block", marginBottom: "8px" }}>
          {stateData.name}
        </strong>
        
        {/* Informações da resposta selecionada (se houver) */}
        {selectedMapResponse && stateData.percentages[selectedMapResponse] !== undefined && (
          <div style={{ 
            marginBottom: "8px", 
            paddingBottom: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.3)"
          }}>
            <span style={{ 
              color: MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#ffffff", 
              fontWeight: "bold",
              fontSize: "14px"
            }}>
              {selectedMapResponse}: {stateData.percentages[selectedMapResponse].toFixed(1)}%
            </span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>
              {stateData.counts[selectedMapResponse] || 0} respostas
            </span>
          </div>
        )}

        {/* Top 3 respostas */}
        <div style={{ marginBottom: "8px" }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", fontWeight: "bold" }}>
            Principais respostas:
          </span>
          {sortedResponses.map(([response, percentage], index) => (
            <div key={response} style={{ 
              marginTop: "4px",
              fontSize: "12px",
              color: index === 0 ? "#90EE90" : "rgba(255,255,255,0.9)"
            }}>
              {index + 1}. {response}: {percentage.toFixed(1)}%
              <span style={{ color: "rgba(255,255,255,0.7)", marginLeft: "5px" }}>
                ({stateData.counts[response]})
              </span>
            </div>
          ))}
        </div>

        {/* Informações gerais */}
        <div style={{ 
          borderTop: "1px solid rgba(255,255,255,0.3)",
          paddingTop: "8px"
        }}>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>
            <strong>Total de respostas:</strong> {stateData.total}
          </span>
          <br />
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>
            <strong>Margem de erro:</strong> ±{marginOfError.toFixed(1)}pp
          </span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!geoData || !svgRef.current) return

    const { stateResults } = mapData
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const container = svgRef.current.parentElement
    const width = Math.max(container.clientWidth - 20, 400)
    const height = Math.max(container.clientHeight - 20, 300)

    const projection = d3.geoMercator().fitSize([width, height], geoData)
    const path = d3.geoPath().projection(projection)

    svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const stateData = stateResults.get(d.properties.sigla)
        if (stateData && selectedMapResponse && typeof stateData.percentages[selectedMapResponse] !== "undefined") {
          return colorScale(stateData.percentages[selectedMapResponse])
        }
        return "#e9ecef"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("stroke", "#343a40")
          .attr("stroke-width", 2)
          .style("filter", "brightness(1.1)")
        
        const stateData = stateResults.get(d.properties.sigla)
        setHoveredState({ abbr: d.properties.sigla, data: stateData })
        setMousePosition({ x: event.pageX, y: event.pageY })
      })
      .on("mousemove", (event) => {
        setMousePosition({ x: event.pageX, y: event.pageY })
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .style("filter", "none")
        setHoveredState(null)
      })
      .on("click", (event, d) => {
        if (onStateClick) {
          onStateClick(d.properties.sigla)
        }
      })
  }, [geoData, mapData, onStateClick, colorScale, selectedMapResponse])

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Tooltip personalizado */}
      {hoveredState && (
        <div
          style={{
            position: "fixed",
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            backgroundColor: "rgba(0, 0, 0, 0.92)",
            color: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            fontSize: "13px",
            lineHeight: "1.4",
            zIndex: 9999,
            pointerEvents: "none",
            maxWidth: "320px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
          }}
        >
          {renderTooltipContent(hoveredState.data, hoveredState.abbr)}
        </div>
      )}
      
      <Grid container sx={{ height: "100%" }}>
        <Grid item xs={12} sx={{ height: "100%" }}>
          <Box sx={{ width: "100%", height: "100%", minHeight: "300px" }}>
            <svg
              ref={svgRef}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default InteractiveBrazilMap