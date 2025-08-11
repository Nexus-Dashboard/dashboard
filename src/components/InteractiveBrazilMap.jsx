"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { Box, Typography, Grid } from "@mui/material"
import { normalizeAnswer, groupResponses, shouldGroupResponses } from "../utils/chartUtils"
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
  const [geoData, setGeoData] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  // Linha corrigida
  const [colorScale, setColorScale] = useState(() =>
    d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"])
  );

  useEffect(() => {
    fetch("/brazil-states.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Error loading Brazil GeoJSON:", err))
  }, [])

  const mapData = useMemo(() => {
    if (!responses || responses.length === 0 || !selectedQuestion?.variable) {
      return { stateResults: new Map(), useGrouping: false, availableResponses: [] }
    }

    const questionKey = selectedQuestion.variable
    const stateResults = new Map()
    const allAnswersInMap = new Set(responses.map((r) => normalizeAnswer(r[questionKey])).filter(Boolean))
    const useGrouping = shouldGroupResponses(Array.from(allAnswersInMap))
    const availableResponses = new Set()

    responses.forEach((response) => {
      const stateName = response.UF
      if (!stateName || !STATE_NAME_TO_ABBR[stateName]) return

      const stateAbbr = STATE_NAME_TO_ABBR[stateName]
      const answer = normalizeAnswer(response[questionKey])
      if (!answer) return

      const finalAnswer = useGrouping ? groupResponses(answer) : answer
      availableResponses.add(finalAnswer)

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

    stateResults.forEach((stateData) => {
      if (stateData.total > 0) {
        Object.keys(stateData.counts).forEach((response) => {
          stateData.percentages[response] = (stateData.counts[response] / stateData.total) * 100
        })
        stateData.marginOfError = Math.sqrt(1 / stateData.total) * 100
      }
    })

    return { stateResults, useGrouping, availableResponses: Array.from(availableResponses) }
  }, [responses, selectedQuestion])

  useEffect(() => {
    if (!selectedMapResponse || !mapData.stateResults.size) {
      const defaultScale = d3.scaleLinear().domain([0, 100]).range(["#e9ecef", "#e9ecef"]).clamp(true);
      // CORREÇÃO AQUI
      setColorScale(() => defaultScale);
      return;
    }

    const baseColor = MAP_RESPONSE_BASE_COLORS[selectedMapResponse] || "#9e9e9e";
    const lightColor = d3.color(baseColor).brighter(2.5).formatHex();

    const percentages = Array.from(mapData.stateResults.values())
      .map((state) => state.percentages[selectedMapResponse] || 0)
      .filter((p) => p > 0);

    const maxPercentage = percentages.length > 0 ? Math.max(...percentages) : 100;

    const scale = d3.scaleLinear().domain([0, maxPercentage]).range([lightColor, baseColor]).clamp(true);

    // CORREÇÃO AQUI
    setColorScale(() => scale);
}, [selectedMapResponse, mapData]);

  const calculateMarginOfError = (n) => {
    if (!n || n === 0) return 0
    return Math.sqrt(1 / n) * 100
  }

  const renderTooltipContent = (stateData, stateAbbr) => {
    if (!stateData) {
      return (
        <div>
          <strong>{ABBR_TO_STATE_NAMES[stateAbbr] || stateAbbr}</strong>
          <br />
          <span className="text-muted">Sem dados disponíveis</span>
        </div>
      )
    }

    const percentage = stateData.percentages?.[selectedMapResponse]
    const marginOfError = calculateMarginOfError(stateData.total)

    return (
      <div>
        <strong>{stateData.name}</strong>
        <br />
        {typeof percentage !== "undefined" ? (
          <span style={{ color: colorScale(percentage), fontWeight: "bold" }}>
            {selectedMapResponse}: {percentage.toFixed(1)}%
          </span>
        ) : (
          <span style={{ color: "#ccc" }}>{selectedMapResponse}: N/A</span>
        )}
        <br />
        <span className="text-white">Total: {stateData.total} respostas</span>
        <br />
        <span className="text-white" style={{ fontSize: "0.85em" }}>
          Margem de erro: ±{marginOfError.toFixed(1)}pp
        </span>
      </div>
    )
  }

  useEffect(() => {
    if (!geoData || !svgRef.current) return

    const { stateResults } = mapData

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const container = svgRef.current.parentElement
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

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
        if (stateData && selectedMapResponse && typeof stateData.percentages[selectedMapResponse] !== "undefined") {
          return colorScale(stateData.percentages[selectedMapResponse])
        }
        return "#e9ecef"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#343a40").attr("stroke-width", 2)
        const stateData = stateResults.get(d.properties.sigla)
        setHoveredState({
          abbr: d.properties.sigla,
          data: stateData,
        })
        setMousePosition({
          x: event.pageX,
          y: event.pageY,
        })
      })
      .on("mousemove", (event) => {
        setMousePosition({
          x: event.pageX,
          y: event.pageY,
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
  }, [geoData, mapData, onStateClick, colorScale, selectedMapResponse])

  const ColorScaleLegend = ({ scale }) => {
    // ADICIONE ESTA VERIFICAÇÃO
    if (!scale || typeof scale.domain !== 'function') {
      return null;
    }
  
    const legendHeight = 20;
    const legendWidth = 150;
    const domain = scale.domain();
    const range = scale.range();

    if (!domain || domain.length < 2 || !range) return null;

    const gradientId = `legend-gradient-${selectedMapResponse?.replace(/\s/g, "-")}`

    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}>
          Intensidade (%)
        </Typography>
        <svg width={legendWidth} height={legendHeight + 15}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={range[0]} />
              <stop offset="100%" stopColor={range[1]} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={legendWidth} height={legendHeight} fill={`url(#${gradientId})`} />
          <text x="0" y={legendHeight + 12} fill="#6c757d" fontSize="12">
            {domain[0].toFixed(0)}%
          </text>
          <text x={legendWidth} y={legendHeight + 12} fill="#6c757d" fontSize="12" textAnchor="end">
            {domain[1].toFixed(0)}%
          </text>
        </svg>
      </Box>
    )
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
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
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {renderTooltipContent(hoveredState.data, hoveredState.abbr)}
        </div>
      )}

      <Grid container spacing={2} sx={{ height: "100%" }}>
        <Grid item xs={12} md={8} sx={{ height: "100%" }}>
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
        <Grid item xs={12} md={4} sx={{ height: "100%", overflow: "auto" }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Legenda
          </Typography>
          {selectedMapResponse ? (
            <ColorScaleLegend scale={colorScale} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Selecione uma resposta para ver a legenda.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default InteractiveBrazilMap