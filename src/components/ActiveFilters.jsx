"use client"
import { Badge, Button } from "react-bootstrap"
import { X } from "react-bootstrap-icons"
import "./ActiveFilters.css"

const ActiveFilters = ({ filters, demographics, onRemoveFilter, onClearFilters }) => {
  if (Object.keys(filters).length === 0) return null

  return (
    <div className="active-filters">
      <div className="d-flex align-items-center mb-2">
        <h5 className="active-filters-title me-2">Filtros Ativos:</h5>
        <Button variant="link" size="sm" className="clear-all-btn p-0" onClick={onClearFilters}>
          Limpar todos
        </Button>
      </div>

      <div className="filter-badges">
        {Object.entries(filters).map(([key, values]) => {
          if (values.length === 0) return null

          const demographic = demographics.find((d) => d.key === key)
          const label = demographic?.label || key

          return (
            <Badge key={key} bg="light" text="dark" className="filter-badge">
              <span className="filter-name">{label}:</span>
              <span className="filter-values">{values.join(", ")}</span>
              <Button variant="link" size="sm" className="remove-filter-btn" onClick={() => onRemoveFilter(key)}>
                <X size={14} />
              </Button>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

export default ActiveFilters
