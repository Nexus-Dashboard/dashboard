"use client"

import { Box, Button, Typography } from "@mui/material"

const DemographicFilters = ({ availableDemographics, onFilterChange, activeFilters }) => {
  if (!availableDemographics || availableDemographics.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 3, borderTop: "1px solid #e0e0e0", pt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: "bold" }}>
        Filtros Demográficos
      </Typography>
      {availableDemographics.map((group) => (
        <Box key={group.key} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary", display: "block", mb: 1 }}>
            {group.label}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {group.values.map((value) => (
              <Button
                key={value}
                variant={activeFilters[group.key] === value ? "contained" : "outlined"}
                onClick={() => onFilterChange(group.key, value)}
                sx={{
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: 400,
                  py: 0.5,
                  px: 1.5,
                  fontSize: "0.8rem",
                }}
              >
                {value}
              </Button>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default DemographicFilters
