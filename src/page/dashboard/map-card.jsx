"use client"

import { Box, Typography } from "@mui/material"
import InteractiveBrazilMap from "../../components/InteractiveBrazilMap"
import MapFilters from "../../components/mapFilters"

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
}) {
  const hasRounds = mapRoundsWithData?.length > 0
  const maxIndex = Math.max(0, (mapRoundsWithData?.length || 1) - 1)

  return (
    <div className="map-card">
      <div className="map-card-content">
        <Typography className="card-title-custom">Mapa Interativo do Brasil</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Visualização geográfica das respostas por estado
        </Typography>

        {mapRoundsWithData.length > 1 && (
          <Box sx={{ mb: 2 }}>
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
          </Box>
        )}

        <div className="map-container">
          {hasRounds && mapData.length > 0 ? (
            <InteractiveBrazilMap responses={mapData} selectedQuestion={questionInfo} onStateClick={() => {}} />
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
              <Typography>Nenhum dado geográfico para a rodada selecionada.</Typography>
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
