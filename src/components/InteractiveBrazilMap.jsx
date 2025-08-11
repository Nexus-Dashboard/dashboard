"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Box, Typography, Grid } from "@mui/material"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
import {
  normalizeAnswer,
  getResponseColor,
  groupResponses,
  shouldGroupResponses,
  groupedResponseColorMap,
  GROUPED_RESPONSE_ORDER,
  RESPONSE_ORDER,
} from "../utils/chartUtils"

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

// Reverse mapping: full state name to abbreviation
const STATE_NAME_TO_ABBR = Object.fromEntries(Object.entries(ABBR_TO_STATE_NAMES).map(([abbr, name]) => [name, abbr]))

const InteractiveBrazilMap = ({ responses, selectedQuestion, onStateClick }) => {
  const svgRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    fetch("/brazil-states.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Error loading Brazil GeoJSON:", err))
  }, [])

  const mapData = useMemo(() => {
    if (!responses || responses.length === 0 || !selectedQuestion?.variable)
      return { stateResults: new Map(), useGrouping: false }

    const questionKey = selectedQuestion.variable
    const stateResults = new Map()
    const allAnswersInMap = new Set(responses.map((r) => normalizeAnswer(r[questionKey])).filter(Boolean))
    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))

    responses.forEach((response) => {
      const stateName = response.UF // This comes as full state name from API
      if (!stateName || !STATE_NAME_TO_ABBR[stateName]) return

      const stateAbbr = STATE_NAME_TO_ABBR[stateName]
      const answer = normalizeAnswer(response[questionKey])
      if (!answer) return

      const finalAnswer = useGrouping ? groupResponses(answer) : answer

      if (!stateResults.has(stateAbbr)) {
        stateResults.set(stateAbbr, {
          id: stateAbbr,
          name: stateName,
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
        stateData.dominantResponse = Object.keys(stateData.counts).reduce((a, b) =>
          stateData.counts[a] > stateData.counts[b] ? a : b,
        )

        // Calculate percentage for the dominant response
        stateData.dominantPercentage = ((stateData.counts[stateData.dominantResponse] / stateData.total) * 100).toFixed(1)
        
        // Calculate margin of error: √(1/N) * 100 (em pontos percentuais)
        stateData.marginOfError = Math.sqrt(1 / stateData.total) * 100
      }
    })

    return { stateResults, useGrouping }
  }, [responses, selectedQuestion])

  // Função para calcular a margem de erro
  const calculateMarginOfError = (n) => {
    if (!n || n === 0) return 0
    return Math.sqrt(1 / n) * 100 // Em pontos percentuais
  }

  // Criar tooltip content
  const renderTooltipContent = (stateData, stateAbbr) => {
    if (!stateData) {
      return (
        <div>
          <strong>{ABBR_TO_STATE_NAMES[stateAbbr] || stateAbbr}</strong><br/>
          <span className="text-muted">Sem dados disponíveis</span>
        </div>
      )
    }

    const marginOfError = calculateMarginOfError(stateData.total)

    return (
      <div>
        <strong>{stateData.name}</strong><br/>
        <span style={{ color: '#28a745', fontWeight: 'bold' }}>
          {stateData.dominantResponse}: {stateData.dominantPercentage}%
        </span><br/>
        <span className="text-white">
          Total: {stateData.total} respostas
        </span><br/>
        <span className="text-white" style={{ fontSize: '0.85em' }}>
          Margem de erro: ±{marginOfError.toFixed(1)}pp
        </span>
      </div>
    )
  }

  useEffect(() => {
    if (!geoData || !svgRef.current) return

    const { stateResults, useGrouping } = mapData
    const colorFn = useGrouping ? (d) => groupedResponseColorMap[d] : getResponseColor

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    // Get container dimensions
    const container = svgRef.current.parentElement
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Use container dimensions with some padding
    const width = Math.max(containerWidth - 20, 400)
    const height = Math.max(containerHeight - 20, 300)

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
        return stateData?.dominantResponse ? colorFn(stateData.dominantResponse) : "#e9ecef"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#343a40").attr("stroke-width", 2)
        const stateData = stateResults.get(d.properties.sigla)
        
        // Atualizar estado do hover
        setHoveredState({
          abbr: d.properties.sigla,
          data: stateData
        })
        
        // Atualizar posição do mouse
        setMousePosition({
          x: event.pageX,
          y: event.pageY
        })
      })
      .on("mousemove", (event) => {
        // Atualizar posição do mouse durante o movimento
        setMousePosition({
          x: event.pageX,
          y: event.pageY
        })
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.5)
        setHoveredState(null)
      })
      .on("click", (event, d) => {
        if (onStateClick) {
          onStateClick(d.properties.sigla)
        }
      })
  }, [geoData, mapData, onStateClick])

  const legendData = useMemo(() => {
    const { stateResults, useGrouping } = mapData
    if (stateResults.size === 0) return []

    const legendMap = new Map()
    const orderToUse = useGrouping ? GROUPED_RESPONSE_ORDER : RESPONSE_ORDER

    stateResults.forEach((data) => {
      if (data.dominantResponse) {
        if (!legendMap.has(data.dominantResponse)) {
          legendMap.set(data.dominantResponse, {
            response: data.dominantResponse,
            count: 0,
            order: orderToUse.indexOf(data.dominantResponse),
          })
        }
        legendMap.get(data.dominantResponse).count++
      }
    })

    return Array.from(legendMap.values()).sort((a, b) => {
      if (a.order !== -1 && b.order !== -1) return a.order - b.order
      return a.response.localeCompare(b.response)
    })
  }, [mapData])

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Tooltip personalizado */}
      {hoveredState && (
        <div
          style={{
            position: "fixed",
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.4",
            zIndex: 9999,
            pointerEvents: "none",
            maxWidth: "250px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          {renderTooltipContent(hoveredState.data, hoveredState.abbr)}
        </div>
      )}

      <Grid container spacing={2} sx={{ height: "100%" }}>
        <Grid item xs={8} sx={{ height: "100%" }}>
          <Box sx={{ width: "100%", height: "100%", minHeight: "300px" }}>
            <svg
              ref={svgRef}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
            />
          </Box>
        </Grid>
        <Grid item xs={4} sx={{ height: "100%", overflow: "auto" }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Legenda
          </Typography>
          {legendData.length > 0 ? (
            legendData.map(({ response, count }) => (
              <Box key={response} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    backgroundColor: mapData.useGrouping
                      ? groupedResponseColorMap[response]
                      : getResponseColor(response),
                    mr: 1.5,
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>
                    {response}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {count} {count > 1 ? "estados" : "estado"}
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados para exibir
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default InteractiveBrazilMap