"use client"

import { Box, FormControlLabel, Checkbox, Typography, Chip } from "@mui/material"

const DemographicFilters = ({ availableDemographics, onFilterChange, activeFilters }) => {
  if (!availableDemographics || availableDemographics.length === 0) {
    return null
  }

  const handleFilterToggle = (key, value) => {
    const currentValues = activeFilters[key] || []
    const isSelected = currentValues.includes(value)

    let newValues
    if (isSelected) {
      // Remove o valor
      newValues = currentValues.filter(v => v !== value)
    } else {
      // Adiciona o valor
      newValues = [...currentValues, value]
    }

    // Criar novo objeto de filtros mantendo todos os outros filtros
    const newFilters = { ...activeFilters }

    if (newValues.length > 0) {
      newFilters[key] = newValues
    } else {
      // Remove a chave se não houver valores
      delete newFilters[key]
    }

    // Chama onFilterChange com o novo objeto completo de filtros
    onFilterChange(newFilters)
  }

  const getActiveCount = (key) => {
    return activeFilters[key]?.length || 0
  }

  return (
    <Box sx={{ mt: 3, borderTop: "1px solid #e0e0e0", pt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: "bold" }}>
        Filtros Demográficos
      </Typography>
      {availableDemographics.map((group) => (
        <Box key={group.key} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
              {group.label}
            </Typography>
            {getActiveCount(group.key) > 0 && (
              <Chip
                label={getActiveCount(group.key)}
                size="small"
                color="primary"
                sx={{ height: "18px", fontSize: "0.7rem" }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {group.values.map((value) => (
              <FormControlLabel
                key={value}
                control={
                  <Checkbox
                    checked={(activeFilters[group.key] || []).includes(value)}
                    onChange={() => handleFilterToggle(group.key, value)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                    {value}
                  </Typography>
                }
                sx={{ ml: 0 }}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default DemographicFilters
