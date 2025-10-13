"use client"

import { Button } from "@mui/material"
import { User, MapPin, CircleDollarSign } from "lucide-react"

const ICONS = {
  Feminino: <User size={16} />,
  Masculino: <User size={16} />,
  "Centro-Oeste": <MapPin size={16} />,
  Nordeste: <MapPin size={16} />,
  Norte: <MapPin size={16} />,
  Sudeste: <MapPin size={16} />,
  Sul: <MapPin size={16} />, 

  "até 1 SM": <CircleDollarSign size={16} />,
  "mais de 1 até 2 SM": <CircleDollarSign size={16} />,
  "mais de 2 até 3 SM": <CircleDollarSign size={16} />,
  "mais de 3 até 5 SM": <CircleDollarSign size={16} />,
  "mais de 5 até 10 SM": <CircleDollarSign size={16} />,
  "mais de 10 SM": <CircleDollarSign size={16} />,
}

const MapFilters = ({ availableDemographics, activeFilters, onFilterToggle }) => {
  const filterGroups = ["Sexo", "Região", "Faixa de Renda"]  

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