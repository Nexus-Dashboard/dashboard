"use client"

import { Box, Typography, Grid } from "@mui/material"
import InteractiveBrazilMap from "../../components/InteractiveBrazilMap"
import MapFilters from "../../components/mapFilters"
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
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #dee2e6",
      backgroundColor: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      color: "#495057",
      transition: "all 0.2s ease",
      width: "100%",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <BarChart2 size={16} />
      {children}
    </div>
    <ChevronDown size={14} />
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
      padding: "8px",
      width: "100%",
      maxHeight: "250px",
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
      <div className="map-card-content">
        <Typography className="card-title-custom">Mapa Interativo do Brasil</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Visualização geográfica das respostas por estado. Selecione uma resposta para ver sua distribuição.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {mapRoundsWithData.length > 1 && (
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Rodada: {getXAxisLabel?.(mapRoundsWithData[selectedMapRoundIndex]) || "N/A"}
              </Typography>
              <input
                type="range"
                min={0}
                max={maxIndex}
                value={selectedMapRoundIndex}
                onChange={(e) => onRoundIndexChange?.(Number.parseInt(e.target.value))}
                className="single-range-slider"
                aria-label="Selecionar rodada do mapa"
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Mais recente
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mais antiga
                </Typography>
              </Box>
            </Grid>
          )}
          <Grid item xs={12} md={mapRoundsWithData.length > 1 ? 6 : 12}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Visualizar Resposta
            </Typography>
            <Dropdown onSelect={onMapResponseChange} style={{ width: "100%" }}>
              <Dropdown.Toggle as={ResponseSelectorToggle} id="response-selector-dropdown">
                {selectedMapResponse || "Selecione uma resposta"}
              </Dropdown.Toggle>
              <Dropdown.Menu as={ResponseSelectorMenu}>
                {availableMapResponses.map((response) => (
                  <Dropdown.Item
                    key={response}
                    eventKey={response}
                    active={selectedMapResponse === response}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      margin: "2px 0",
                      fontSize: "14px",
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
        </Grid>

        <div className="map-container">
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
              <Typography>
                {hasRounds && mapData.length > 0
                  ? "Selecione uma resposta para visualizar o mapa."
                  : "Nenhum dado geográfico para a rodada selecionada."}
              </Typography>
            </Box>
          )}
        </div>

        <MapFilters
          availableDemographics={availableDemographics}
          activeFilters={activeFilters}
          onFilterToggle={onFilterToggle}
        />
      </div>
    </div>
  )
}
