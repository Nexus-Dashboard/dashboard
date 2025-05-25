"use client"
import { Row, Col, Form, Button, Card, Badge } from "react-bootstrap"
import "./DemographicFilters.css"

const DemographicFilters = ({ availableDemographics, filters, onFilterChange, onClearFilters }) => {
  return (
    <div className="demographic-filters">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="filter-title m-0">Filtros Demográficos</h4>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={onClearFilters}
          disabled={Object.keys(filters).length === 0}
        >
          Limpar Filtros
        </Button>
      </div>

      <Row>
        {availableDemographics.map((demographic) => (
          <Col key={demographic.key} md={6} lg={4} className="mb-3">
            <Card className="filter-group-card">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>{demographic.label}</span>
                {filters[demographic.key]?.length > 0 && (
                  <Badge bg="primary" pill>
                    {filters[demographic.key].length}
                  </Badge>
                )}
              </Card.Header>
              <Card.Body className="filter-options">
                <Form>
                  {demographic.values.map((value) => (
                    <Form.Check
                      key={`${demographic.key}-${value}`}
                      type="checkbox"
                      id={`${demographic.key}-${value}`}
                      label={value}
                      checked={(filters[demographic.key] || []).includes(value)}
                      onChange={(e) => onFilterChange(demographic.key, value, e.target.checked)}
                    />
                  ))}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default DemographicFilters
