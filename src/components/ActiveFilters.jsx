import { Box, Typography, Chip } from "@mui/material"

const ActiveFilters = ({ filters, availableDemographics, onRemoveFilter }) => {
  if (Object.keys(filters).length === 0) return null

  return (
    <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
        Filtros ativos:
      </Typography>
      {Object.entries(filters).map(([key, values]) => {
        if (values.length === 0) return null

        const demographic = availableDemographics.find((d) => d.key === key)
        return (
          <Chip
            key={key}
            size="small"
            label={`${demographic?.label || key}: ${values.length} selecionado${values.length > 1 ? "s" : ""}`}
            color="primary"
            variant="outlined"
            onDelete={() => onRemoveFilter(key)}
          />
        )
      })}
    </Box>
  )
}

export default ActiveFilters