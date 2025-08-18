// src/components/RegionFilter.jsx
"use client"

import { Form, Badge } from "react-bootstrap"
import { STATES_BY_REGION } from "../utils/regionMapping"

const RegionFilter = ({ 
  selectedRegions = [], 
  onRegionChange, 
  showStateCounts = true 
}) => {
  
  const handleRegionToggle = (region, checked) => {
    if (checked) {
      onRegionChange([...selectedRegions, region]);
    } else {
      onRegionChange(selectedRegions.filter(r => r !== region));
    }
  };

  const getStateCount = (region) => {
    return STATES_BY_REGION[region]?.length || 0;
  };

  return (
    <div className="region-filter">
      {Object.keys(STATES_BY_REGION).sort().map(region => (
        <div key={region} className="mb-2">
          <Form.Check
            type="checkbox"
            id={`region-${region}`}
            label={
              <div className="d-flex justify-content-between align-items-center w-100">
                <span>{region}</span>
                {showStateCounts && (
                  <Badge bg="secondary" pill className="ms-2">
                    {getStateCount(region)} estados
                  </Badge>
                )}
              </div>
            }
            checked={selectedRegions.includes(region)}
            onChange={(e) => handleRegionToggle(region, e.target.checked)}
            className="custom-checkbox"
          />
          
          {/* Mostrar estados da região quando selecionada */}
          {selectedRegions.includes(region) && (
            <div className="ms-4 mt-1">
              <small className="text-muted">
                Estados: {STATES_BY_REGION[region].join(", ")}
              </small>
            </div>
          )}
        </div>
      ))}
      
      {selectedRegions.length > 0 && (
        <div className="mt-3 p-2 bg-light rounded">
          <small className="text-muted d-block mb-1">
            <strong>Regiões selecionadas:</strong>
          </small>
          <div className="d-flex flex-wrap gap-1">
            {selectedRegions.map(region => (
              <Badge key={region} bg="primary" pill>
                {region}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionFilter;