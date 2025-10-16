// src/components/InteractiveBrazilMap.jsx - VERSÃO POR REGIÕES
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Box, Grid } from "@mui/material"
import { normalizeAnswer, groupResponses, shouldGroupResponses, normalizeAndGroupNSNR } from "../utils/chartUtils"
import { MAP_RESPONSE_BASE_COLORS } from "../utils/questionGrouping"
import { REGION_BY_STATE, STATES_BY_REGION } from "../utils/regionMapping"

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
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, position: "right" })
  const [colorScale, setColorScale] = useState(() => d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]))

  useEffect(() => {
    fetch("/brazil-states.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Error loading Brazil GeoJSON:", err))
  }, [])

  // Processar dados agregados por REGIÃO
  const mapData = useMemo(() => {
    if (!responses || responses.length === 0 || !selectedQuestion?.variable) {
      return { regionResults: new Map() }
    }

    const questionKey = selectedQuestion.variable
    const regionResults = new Map()
    
    // Identificar todas as respostas possíveis e determinar se devemos agrupar
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

    // Processar respostas e agregar por REGIÃO
    responses.forEach((response) => {
      const stateName = response.UF
      if (!stateName || !STATE_NAME_TO_ABBR[stateName]) return

      // Obter REGIÃO do estado
      const region = REGION_BY_STATE[stateName]
      if (!region) return

      const answer = normalizeAnswer(response[questionKey])
      if (!answer) return

      const normalizedAnswer = normalizeAndGroupNSNR(answer)
      if (normalizedAnswer === null) return

      const finalAnswer = useGrouping ? groupResponses(normalizedAnswer) : normalizedAnswer

      // Inicializar região se não existir
      if (!regionResults.has(region)) {
        regionResults.set(region, {
          id: region,
          name: region,
          states: STATES_BY_REGION[region] || [],
          counts: {},
          total: 0,
          percentages: {},
          rawResponses: new Set()
        })
      }

      const regionData = regionResults.get(region)
      // CORREÇÃO: Usar _weight se disponível (dados ponderados), senão contar como 1
      const weight = response._weight !== undefined ? response._weight : 1
      regionData.counts[finalAnswer] = (regionData.counts[finalAnswer] || 0) + weight
      regionData.total += weight
      regionData.rawResponses.add(normalizedAnswer)
    })

    // Calcular percentuais para todas as respostas por região
    regionResults.forEach((regionData) => {
      if (regionData.total > 0) {
        Object.keys(regionData.counts).forEach((response) => {
          regionData.percentages[response] = (regionData.counts[response] / regionData.total) * 100
        })

        // Encontrar resposta dominante
        regionData.dominantResponse = Object.keys(regionData.counts).reduce((a, b) =>
          regionData.counts[a] > regionData.counts[b] ? a : b,
        )
        regionData.dominantPercentage = regionData.percentages[regionData.dominantResponse]
      }
    })

    return { regionResults, useGrouping }
  }, [responses, selectedQuestion])

  // Escala de cores baseada na resposta selecionada
  useEffect(() => {
    if (!selectedMapResponse || !mapData.regionResults?.size) {
      const defaultScale = d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]).clamp(true)
      setColorScale(() => defaultScale)
      return
    }

    let processedResponse = selectedMapResponse
    
    if (mapData.useGrouping) {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedResponse = groupResponses(normalized)
      }
    } else {
      const normalized = normalizeAndGroupNSNR(selectedMapResponse)
      if (normalized !== null) {
        processedResponse = normalized
      }
    }

    const baseColor = MAP_RESPONSE_BASE_COLORS[processedResponse] || MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#9e9e9e"

    // Coletar os percentuais REAIS de todas as regiões para esta resposta
    const percentages = Array.from(mapData.regionResults.values())
      .map((region) => region.percentages[processedResponse])
      .filter((p) => typeof p === 'number' && p > 0)

    // Se não houver dados, usar escala padrão cinza
    if (percentages.length === 0) {
      const defaultScale = d3.scaleLinear()
        .domain([0, 100])
        .range(["#e9ecef", "#e9ecef"])
        .clamp(true)
      setColorScale(() => defaultScale)
      return
    }

    // Encontrar o MENOR e MAIOR valor REAL entre as regiões
    const minPercentage = Math.min(...percentages)
    const maxPercentage = Math.max(...percentages)

    // Cores para alto contraste
    const lightColor = d3.color(baseColor).brighter(2.5).formatHex()
    const darkColor = d3.color(baseColor).darker(1).formatHex()

    // Criar escala usando os valores REAIS (mín e máx) entre as regiões
    // A região com MENOR % recebe lightColor, a com MAIOR % recebe darkColor
    const scale = d3.scaleLinear()
      .domain([minPercentage, maxPercentage])
      .range([lightColor, darkColor])
      .clamp(true)

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

  const renderTooltipContent = (regionData) => {
    if (!regionData) {
      return (
        <div>
          <strong>Região sem dados</strong>
        </div>
      )
    }

    const marginOfError = calculateMarginOfError(regionData.total)

    // Ordenar respostas por percentual (maior para menor)
    const sortedResponses = Object.entries(regionData.percentages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

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
        <strong style={{ fontSize: "15px", display: "block", marginBottom: "8px" }}>{regionData.name}</strong>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "8px" }}>
          Estados: {regionData.states.join(", ")}
        </span>

        {processedSelectedResponse && regionData.percentages[processedSelectedResponse] !== undefined && (
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
              {selectedMapResponse}: {regionData.percentages[processedSelectedResponse].toFixed(1)}%
            </span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>
              {Math.round(regionData.counts[processedSelectedResponse] || 0)} respostas
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
              <span style={{ color: "rgba(255,255,255,0.7)", marginLeft: "5px" }}>({Math.round(regionData.counts[response])})</span>
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
            <strong>Total de entrevistas:</strong> {Math.round(regionData.total)}
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

    const { regionResults, useGrouping } = mapData
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const container = svgRef.current.parentElement
    const width = Math.max(container.clientWidth - 20, 400)
    const height = Math.max(container.clientHeight - 20, 300)

    const projection = d3.geoMercator().fitSize([width, height], geoData)
    const path = d3.geoPath().projection(projection)

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

    // Renderizar estados, mas colorir por região
    svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const stateName = ABBR_TO_STATE_NAMES[d.properties.sigla]
        const region = REGION_BY_STATE[stateName]
        const regionData = regionResults.get(region)
        
        if (regionData && processedSelectedResponse && typeof regionData.percentages[processedSelectedResponse] !== "undefined") {
          const percentage = regionData.percentages[processedSelectedResponse]
          return colorScale(percentage)
        }
        return "#e9ecef"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const stateName = ABBR_TO_STATE_NAMES[d.properties.sigla]
        const region = REGION_BY_STATE[stateName]
        
        // Destacar TODA a região
        svg.selectAll("path")
          .filter(pathData => {
            const pathStateName = ABBR_TO_STATE_NAMES[pathData.properties.sigla]
            const pathRegion = REGION_BY_STATE[pathStateName]
            return pathRegion === region
          })
          .attr("stroke", "#343a40")
          .attr("stroke-width", 2)
          .style("filter", "brightness(1.1)")

        const regionData = regionResults.get(region)
        setHoveredRegion({ name: region, data: regionData })

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
        svg.selectAll("path")
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .style("filter", "none")
        setHoveredRegion(null)
      })
      .on("click", (event, d) => {
        if (onStateClick) {
          const stateName = ABBR_TO_STATE_NAMES[d.properties.sigla]
          const region = REGION_BY_STATE[stateName]
          onStateClick(region) // Retorna a região ao invés do estado
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
      {hoveredRegion && (
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
          {renderTooltipContent(hoveredRegion.data)}
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