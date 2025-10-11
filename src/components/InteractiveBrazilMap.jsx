// src/components/InteractiveBrazilMap.jsx - CORREÇÃO
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Box, Grid } from "@mui/material"
import { normalizeAnswer, groupResponses, shouldGroupResponses, normalizeAndGroupNSNR } from "../utils/chartUtils"
import { MAP_RESPONSE_BASE_COLORS } from "../utils/questionGrouping"

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

const STATE_NAME_TO_ABBR = Object.fromEntries(Object.entries(ABBR_TO_STATE_NAMES).map(([abbr, name]) => [name, abbr]))

const InteractiveBrazilMap = ({ responses, selectedQuestion, onStateClick, selectedMapResponse }) => {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, position: "right" })
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
    
    // IMPORTANTE: Primeiro, vamos identificar todas as respostas possíveis e determinar se devemos agrupar
    const allAnswersInMap = new Set()
    responses.forEach((response) => {
      const answer = normalizeAnswer(response[questionKey])
      if (answer) {
        const normalizedAnswer = normalizeAndGroupNSNR(answer)
        if (normalizedAnswer !== null) {
          allAnswersInMap.add(normalizedAnswer)
        }
      }
    })
    
    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))

    // Agora processar as respostas por estado
    responses.forEach((response) => {
      const stateName = response.UF
      if (!stateName || !STATE_NAME_TO_ABBR[stateName]) return

      const stateAbbr = STATE_NAME_TO_ABBR[stateName]
      const answer = normalizeAnswer(response[questionKey])
      if (!answer) return

      const normalizedAnswer = normalizeAndGroupNSNR(answer)
      if (normalizedAnswer === null) return

      // IMPORTANTE: Aplicar agrupamento SOMENTE se necessário
      const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

      if (!stateResults.has(stateAbbr)) {
        stateResults.set(stateAbbr, {
          id: stateAbbr,
          name: stateName,
          counts: {},
          total: 0,
          percentages: {},
          // NOVO: Armazenar mapa de respostas originais para debug
          rawResponses: new Set()
        })
      }

      const stateData = stateResults.get(stateAbbr)
      stateData.counts[finalAnswer] = (stateData.counts[finalAnswer] || 0) + 1
      stateData.total += 1
      stateData.rawResponses.add(normalizedAnswer) // Guardar resposta original normalizada
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

    return { stateResults, useGrouping }
  }, [responses, selectedQuestion])

  // CORREÇÃO PRINCIPAL: Garantir que a escala de cores use a resposta correta
  useEffect(() => {
    if (!selectedMapResponse || !mapData.stateResults?.size) {
      const defaultScale = d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]).clamp(true)
      setColorScale(() => defaultScale)
      return
    }

    // IMPORTANTE: Aplicar a mesma lógica de agrupamento ao selectedMapResponse
    let processedResponse = selectedMapResponse
    
    // Se estamos usando agrupamento, verificar se a resposta selecionada precisa ser agrupada
    if (mapData.useGrouping) {
      // Primeiro normalizar NS/NR
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        // Depois aplicar agrupamento se necessário
        processedResponse = groupResponses(normalized)
      }
    } else {
      // Apenas normalizar NS/NR sem agrupamento completo
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedResponse = normalized
      }
    }

    // Usar a resposta processada para buscar a cor
    const baseColor = MAP_RESPONSE_BASE_COLORS[processedResponse] || MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#9e9e9e"
    const lightColor = d3.color(baseColor).brighter(2.5).formatHex()

    // Coletar percentuais para a resposta processada
    const percentages = Array.from(mapData.stateResults.values())
      .map((state) => state.percentages[processedResponse] || 0)
      .filter((p) => p > 0)

    const maxPercentage = percentages.length > 0 ? Math.max(...percentages) : 100
    const scale = d3.scaleLinear().domain([0, maxPercentage]).range([lightColor, baseColor]).clamp(true)

    setColorScale(() => scale)
  }, [selectedMapResponse, mapData])

  const calculateMarginOfError = (n) => {
    if (!n || n === 0) return 0
    return Math.sqrt(1 / n) * 100
  }

  const calculateTooltipPosition = (mouseX, mouseY, containerRect) => {
    const tooltipWidth = 320
    const tooltipHeight = 200
    const margin = 15

    let x = mouseX
    let y = mouseY
    let position = "right"

    if (mouseX + tooltipWidth + margin > containerRect.width) {
      if (mouseX - tooltipWidth - margin > 0) {
        x = mouseX - tooltipWidth - margin
        position = "left"
      } else {
        x = Math.max(margin, Math.min(mouseX - tooltipWidth / 2, containerRect.width - tooltipWidth - margin))
        position = "center"
      }
    } else {
      x = mouseX + margin
      position = "right"
    }

    if (mouseY + tooltipHeight + margin > containerRect.height) {
      y = Math.max(margin, mouseY - tooltipHeight - margin)
    } else {
      y = mouseY + margin
    }

    x = Math.max(margin, Math.min(x, containerRect.width - tooltipWidth - margin))
    y = Math.max(margin, Math.min(y, containerRect.height - tooltipHeight - margin))

    return { x, y, position }
  }

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
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    // IMPORTANTE: Processar selectedMapResponse da mesma forma que nos dados
    let processedSelectedResponse = selectedMapResponse
    if (mapData.useGrouping && selectedMapResponse) {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedSelectedResponse = groupResponses(normalized)
      }
    } else if (selectedMapResponse) {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedSelectedResponse = normalized
      }
    }

    return (
      <div>
        <strong style={{ fontSize: "15px", display: "block", marginBottom: "8px" }}>{stateData.name}</strong>

        {processedSelectedResponse && stateData.percentages[processedSelectedResponse] !== undefined && (
          <div
            style={{
              marginBottom: "8px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <span
              style={{
                color: MAP_RESPONSE_BASE_COLORS[processedSelectedResponse] || MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#ffffff",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {selectedMapResponse}: {stateData.percentages[processedSelectedResponse].toFixed(1)}%
            </span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>
              {stateData.counts[processedSelectedResponse] || 0} respostas
            </span>
          </div>
        )}

        <div style={{ marginBottom: "8px" }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", fontWeight: "bold" }}>
            Principais respostas:
          </span>
          {sortedResponses.map(([response, percentage], index) => (
            <div
              key={response}
              style={{
                marginTop: "4px",
                fontSize: "12px",
                color: index === 0 ? "#90EE90" : "rgba(255,255,255,0.9)",
              }}
            >
              {index + 1}. {response}: {percentage.toFixed(1)}%
              <span style={{ color: "rgba(255,255,255,0.7)", marginLeft: "5px" }}>({stateData.counts[response]})</span>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.3)",
            paddingTop: "8px",
          }}
        >
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

    const { stateResults, useGrouping } = mapData
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const container = svgRef.current.parentElement
    const width = Math.max(container.clientWidth - 20, 400)
    const height = Math.max(container.clientHeight - 20, 300)

    const projection = d3.geoMercator().fitSize([width, height], geoData)
    const path = d3.geoPath().projection(projection)

    // IMPORTANTE: Processar selectedMapResponse consistentemente
    let processedSelectedResponse = selectedMapResponse
    if (useGrouping && selectedMapResponse) {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedSelectedResponse = groupResponses(normalized)
      }
    } else if (selectedMapResponse) {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedSelectedResponse = normalized
      }
    }

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
        if (stateData && processedSelectedResponse && typeof stateData.percentages[processedSelectedResponse] !== "undefined") {
          const percentage = stateData.percentages[processedSelectedResponse]
          return colorScale(percentage)
        }
        return "#e9ecef"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#343a40").attr("stroke-width", 2).style("filter", "brightness(1.1)")

        const stateData = stateResults.get(d.properties.sigla)
        setHoveredState({ abbr: d.properties.sigla, data: stateData })

        const containerRect = containerRef.current.getBoundingClientRect()
        const mouseX = event.clientX - containerRect.left
        const mouseY = event.clientY - containerRect.top

        setMousePosition({ x: mouseX, y: mouseY })

        const tooltipPos = calculateTooltipPosition(mouseX, mouseY, {
          width: containerRect.width,
          height: containerRect.height,
        })
        setTooltipPosition(tooltipPos)
      })
      .on("mousemove", (event) => {
        const containerRect = containerRef.current.getBoundingClientRect()
        const mouseX = event.clientX - containerRect.left
        const mouseY = event.clientY - containerRect.top

        setMousePosition({ x: mouseX, y: mouseY })

        const tooltipPos = calculateTooltipPosition(mouseX, mouseY, {
          width: containerRect.width,
          height: containerRect.height,
        })
        setTooltipPosition(tooltipPos)
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.5).style("filter", "none")
        setHoveredState(null)
      })
      .on("click", (event, d) => {
        if (onStateClick) {
          onStateClick(d.properties.sigla)
        }
      })
  }, [geoData, mapData, onStateClick, colorScale, selectedMapResponse])

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {hoveredState && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            backgroundColor: "rgba(0, 0, 0, 0.92)",
            color: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            fontSize: "13px",
            lineHeight: "1.4",
            zIndex: 10000,
            pointerEvents: "none",
            maxWidth: "320px",
            minWidth: "280px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            transition: "all 0.1s ease-out",
          }}
        >
          {renderTooltipContent(hoveredState.data, hoveredState.abbr)}
        </div>
      )}

      <Grid container sx={{ height: "100%" }}>
        <Grid item xs={12} sx={{ height: "100%" }}>
          <Box sx={{ width: "100%", height: "100%", minHeight: "300px" }}>
            <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default InteractiveBrazilMap