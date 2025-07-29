"use client"

import { Button } from "@mui/material"
import { User, MapPin } from "lucide-react"

const ICONS = {
  Feminino: <User size={16} />,
  Masculino: <User size={16} />,
  "Centro-Oeste": <MapPin size={16} />,
  Nordeste: <MapPin size={16} />,
  Norte: <MapPin size={16} />,
  Sudeste: <MapPin size={16} />,
  Sul: <MapPin size={16} />,
}

const MapFilters = ({ availableDemographics, activeFilters, onFilterToggle }) => {
  const filterGroups = ["Sexo", "Região"]

  const relevantFilters = availableDemographics.filter((group) => filterGroups.includes(group.label))

  return (
    <div className="map-quick-filters">
      {relevantFilters.map((group) => (
        <div key={group.key} className="filter-button-group">
          {group.values.map((value) => {
            const isActive = activeFilters[group.key]?.[0] === value
            return (
              <Button
                key={value}
                variant={isActive ? "contained" : "outlined"}
                startIcon={ICONS[value] || <div style={{ width: 16 }} />}
                onClick={() => onFilterToggle(group.key, value)}
                className={`filter-button ${isActive ? "active" : ""}`}
              >
                {value}
              </Button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default MapFilters
