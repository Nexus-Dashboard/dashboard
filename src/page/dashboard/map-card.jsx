"use client"

import { Box, Typography, Grid } from "@mui/material"
import InteractiveBrazilMap from "../../components/InteractiveBrazilMap"
import React from "react"
import { Dropdown } from "react-bootstrap"
import { ChevronDown, BarChart2 } from "lucide-react"

// Custom Toggle for the response selector dropdown
const ResponseSelectorToggle = React.forwardRef(({ children, onClick }, ref) => (
  <div
    ref={ref}
    onClick={(e) => {
      e.preventDefault()
      onClick(e)
    }}
    style={{
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      borderRadius: "6px",
      border: "1px solid #dee2e6",
      backgroundColor: "#ffffff",
      fontSize: "13px",
      fontWeight: "500",
      color: "#495057",
      transition: "all 0.2s ease",
      width: "100%",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <BarChart2 size={14} />
      {children}
    </div>
    <ChevronDown size={12} />
  </div>
))
ResponseSelectorToggle.displayName = "ResponseSelectorToggle"

// Custom Menu for the response selector dropdown
const ResponseSelectorMenu = React.forwardRef(({ children, style, className, "aria-labelledby": labeledBy }, ref) => (
  <div
    ref={ref}
    style={{
      ...style,
      backgroundColor: "#ffffff",
      border: "1px solid #dee2e6",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      padding: "6px",
      width: "100%",
      maxHeight: "200px",
      overflowY: "auto",
    }}
    className={className}
    aria-labelledby={labeledBy}
  >
    <ul className="list-unstyled" style={{ margin: 0 }}>
      {children}
    </ul>
  </div>
))
ResponseSelectorMenu.displayName = "ResponseSelectorMenu"

export default function MapCard({
  mapRoundsWithData = [],
  selectedMapRoundIndex = 0,
  onRoundIndexChange,
  mapData = [],
  questionInfo,
  availableDemographics = [],
  activeFilters = {},
  onFilterToggle,
  getXAxisLabel,
  availableMapResponses = [],
  selectedMapResponse,
  onMapResponseChange,
}) {
  const hasRounds = mapRoundsWithData?.length > 0
  const maxIndex = Math.max(0, (mapRoundsWithData?.length || 1) - 1)

  return (
    <div className="map-card">
      <div className="map-card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
        <Typography className="card-title-custom" sx={{ fontSize: '1rem', mb: 1 }}>
          Mapa Interativo do Brasil
        </Typography>
        
        {/* Controles compactos em uma linha */}
        <Box sx={{ mb: 1.5 }}>
          <Grid container spacing={1} alignItems="center">
            {/* Seletor de resposta */}
            <Grid item xs={12} md={mapRoundsWithData.length > 1 ? 6 : 12}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5, display: "block" }}>
                Visualizar Resposta
              </Typography>
              <Dropdown onSelect={onMapResponseChange} style={{ width: "100%" }}>
                <Dropdown.Toggle as={ResponseSelectorToggle} id="response-selector-dropdown">
                  <span style={{ fontSize: '12px' }}>{selectedMapResponse || "Selecione"}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu as={ResponseSelectorMenu}>
                  {availableMapResponses.map((response) => (
                    <Dropdown.Item
                      key={response}
                      eventKey={response}
                      active={selectedMapResponse === response}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "4px",
                        margin: "2px 0",
                        fontSize: "12px",
                        fontWeight: selectedMapResponse === response ? "600" : "400",
                        backgroundColor: selectedMapResponse === response ? "#e3f2fd" : "transparent",
                      }}
                    >
                      {response}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Grid>

            {/* Slider de rodadas (se houver múltiplas) */}
            {mapRoundsWithData.length > 1 && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5, display: "block" }}>
                  Rodada: {getXAxisLabel?.(mapRoundsWithData[selectedMapRoundIndex]) || "N/A"}
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
                    type="range"
                    min={0}
                    max={maxIndex}
                    value={selectedMapRoundIndex}
                    onChange={(e) => onRoundIndexChange?.(Number.parseInt(e.target.value))}
                    className="single-range-slider"
                    style={{ width: '100%' }}
                    aria-label="Selecionar rodada"
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                      Recente
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                      Antiga
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Mapa - ocupa o espaço restante */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="map-container" style={{ flexGrow: 1, height: '100%' }}>
            {hasRounds && mapData.length > 0 && selectedMapResponse ? (
              <InteractiveBrazilMap
                responses={mapData}
                selectedQuestion={questionInfo}
                selectedMapResponse={selectedMapResponse}
                onStateClick={() => {}}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "text.secondary",
                }}
              >
                <Typography sx={{ fontSize: '13px' }}>
                  {hasRounds && mapData.length > 0
                    ? "Selecione uma resposta para visualizar o mapa."
                    : "Nenhum dado geográfico para a rodada selecionada."}
                </Typography>
              </Box>
            )}
          </div>
        </Box>

        {/* Filtros demográficos compactos - removidos pois estão ocupando muito espaço */}
      </div>
    </div>
  )
}