"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"
import {
  normalizeAnswer,
  getResponseColor,
  RESPONSE_ORDER,
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  GROUPED_RESPONSE_ORDER,
} from "../utils/chartUtils"

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
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null })

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

  const mapData = useMemo(() => {
    if (!responses || !selectedQuestion?.key) return new Map()

    const stateResults = new Map()
    const allAnswersInMap = new Set()

    responses.forEach((r) => {
      const answer = normalizeAnswer(r[selectedQuestion.key])
      if (answer) allAnswersInMap.add(answer)
    })

    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))

    responses.forEach((response) => {
      const stateAbbr = response.UF
      if (!stateAbbr || !ABBR_TO_STATE_NAMES[stateAbbr]) return

      const answer = normalizeAnswer(response[selectedQuestion.key])
      if (!answer) return

      const finalAnswer = useGrouping ? groupResponses(answer) : answer

      if (!stateResults.has(stateAbbr)) {
        stateResults.set(stateAbbr, {
          id: stateAbbr,
          name: ABBR_TO_STATE_NAMES[stateAbbr],
          counts: {},
          total: 0,
        })
      }

      const stateData = stateResults.get(stateAbbr)
      stateData.counts[finalAnswer] = (stateData.counts[finalAnswer] || 0) + 1
      stateData.total += 1
    })

    stateResults.forEach((stateData) => {
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
          .sort((a, b) => b.percentage - a.percentage)
        stateData.totalResponses = stateData.total
      }
    })

    return stateResults
  }, [responses, selectedQuestion, filters])

  useEffect(() => {
    if (!geoData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 600
    const height = 500
    const projection = d3.geoMercator().fitSize([width, height], geoData)
    const path = d3.geoPath().projection(projection)
    const g = svg.append("g")

    const allAnswersInMap = new Set()
    mapData.forEach((stateData) => {
      if (stateData.dominantResponse) {
        allAnswersInMap.add(stateData.dominantResponse)
      }
    })
    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))
    const colorFn = useGrouping ? (d) => groupedResponseColorMap[d] : getResponseColor

    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const stateData = mapData.get(d.properties.sigla)
        return stateData?.dominantResponse ? colorFn(stateData.dominantResponse) : "#e0e0e0"
      })
      .attr("stroke", (d) => (selectedState === d.properties.sigla ? "#2c3e50" : "#ffffff"))
      .attr("stroke-width", (d) => (selectedState === d.properties.sigla ? 2 : 1))
      .attr("opacity", (d) => (hoveredState === d.properties.sigla ? 0.8 : 1))
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const stateId = d.properties.sigla
        const stateData = mapData.get(stateId)
        setHoveredState(stateId)
        if (stateData) {
          const [x, y] = d3.pointer(event, document.body)
          setTooltip({ visible: true, x: x + 15, y: y - 10, data: stateData })
        }
        d3.select(this).attr("opacity", 0.8)
      })
      .on("mousemove", (event) => {
        const [x, y] = d3.pointer(event, document.body)
        setTooltip((prev) => ({ ...prev, x: x + 15, y: y - 10 }))
      })
      .on("mouseout", function () {
        setHoveredState(null)
        setTooltip({ visible: false, data: null })
        d3.select(this).attr("opacity", 1)
      })
      .on("click", (event, d) => {
        const stateId = d.properties.sigla
        if (onStateClick) {
          onStateClick(selectedState === stateId ? null : stateId)
        }
      })
  }, [geoData, mapData, hoveredState, selectedState, onStateClick])

  const legendData = useMemo(() => {
    const responseSet = new Set()
    mapData.forEach((stateData) => {
      if (stateData.dominantResponse) {
        responseSet.add(stateData.dominantResponse)
      }
    })

    const useGrouping = shouldGroupResponses(Array.from(responseSet))
    const orderToUse = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER
    const colorFn = useGrouping ? (d) => groupedResponseColorMap[d] : getResponseColor

    return Array.from(responseSet)
      .sort((a, b) => {
        const indexA = orderToUse.indexOf(a)
        const indexB = orderToUse.indexOf(b)
        if (indexA >= 0 && indexB >= 0) return indexA - indexB
        if (indexA >= 0) return -1
        if (indexB >= 0) return 1
        return a.localeCompare(b)
      })
      .map((response) => ({
        response,
        color: colorFn(response) || "#6c757d",
        count: Array.from(mapData.values()).filter((state) => state.dominantResponse === response).length,
      }))
  }, [mapData])

  return (
    <Box sx={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%"
        height="auto"
        viewBox="0 0 600 500"
        style={{ background: "#f8f9fa", borderRadius: "8px" }}
      />
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
        </div>
      )}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Legenda
        </Typography>
        {legendData.map(({ response, color, count }) => (
          <Box key={response} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: color,
                mr: 1,
                borderRadius: "2px",
                border: "1px solid #ddd",
              }}
            />
            <Typography variant="body2">
              {response} ({count} {count > 1 ? "estados" : "estado"})
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// Dummy Box component for syntax compatibility
const Box = ({ children, sx }) => <div style={sx}>{children}</div>
const Typography = ({ children, ...props }) => <p {...props}>{children}</p>

export default InteractiveBrazilMap
