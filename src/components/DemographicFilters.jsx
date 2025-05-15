"use client"
import {
  Box,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Button,
  Chip,
  Grid,
  useTheme,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { alpha } from "@mui/material/styles"

const DemographicFilters = ({ availableDemographics, filters, onFilterChange, onClearFilters }) => {
  const theme = useTheme()

  const handleFilterChange = (demographicKey, value, checked) => {
    onFilterChange(demographicKey, value, checked)
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" color="primary.dark">
          Filtros Demográficos
        </Typography>
        <Button variant="text" color="primary" onClick={onClearFilters} disabled={Object.keys(filters).length === 0}>
          Limpar Filtros
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {availableDemographics.map((demographic) => (
          <Grid item xs={12} md={6} lg={4} key={demographic.key}>
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                "&:before": { display: "none" },
                borderRadius: 1,
                mb: 1,
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  "&.Mui-expanded": {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                }}
              >
                <Typography fontWeight="medium">
                  {demographic.label}
                  {filters[demographic.key]?.length > 0 && (
                    <Chip
                      size="small"
                      label={filters[demographic.key].length}
                      color="primary"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ maxHeight: 200, overflow: "auto", p: 1 }}>
                <FormGroup>
                  {demographic.values.map((value) => (
                    <FormControlLabel
                      key={value}
                      control={
                        <Checkbox
                          size="small"
                          checked={(filters[demographic.key] || []).includes(value)}
                          onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                        />
                      }
                      label={<Typography variant="body2">{value}</Typography>}
                    />
                  ))}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default DemographicFilters