"use client"

import { Box, Button, Typography } from "@mui/material"
import { Male, Female } from "@mui/icons-material"

const DemographicFilters = ({ availableDemographics, onFilterChange, activeFilters }) => {
  // Hardcoded filters for now, as per the design.
  // This can be made dynamic using `availableDemographics` later.
  const filters = [
    { key: "PF1", value: "Feminino", icon: <Female fontSize="small" /> },
    { key: "PF1", value: "Masculino", icon: <Male fontSize="small" /> },
    { key: "PF14", value: "Até 2 SM", label: "Até 2 SM" },
    { key: "PF14", value: "Mais de 2 a 5 SM", label: "2 a 5 SM" },
    { key: "PF14", value: "Mais de 5 SM", label: "+ de 5 SM" },
  ]

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: "bold" }}>
        Filtros Demográficos
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {filters.map((filter) => (
          <Button
            key={filter.label || filter.value}
            variant={activeFilters[filter.key] === filter.value ? "contained" : "outlined"}
            startIcon={filter.icon}
            onClick={() => onFilterChange(filter.key, filter.value)}
            sx={{ borderRadius: "20px", textTransform: "none" }}
          >
            {filter.label || filter.value}
          </Button>
        ))}
      </Box>
    </Box>
  )
}

export default DemographicFilters
