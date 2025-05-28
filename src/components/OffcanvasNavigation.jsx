"use client"
import { Offcanvas, Nav, Button, Accordion, Form, Badge } from "react-bootstrap"
import { House, Upload, X, Funnel } from "react-bootstrap-icons"
import { useNavigate, useLocation } from "react-router-dom"

const OffcanvasNavigation = ({
  show,
  onHide,
  availableDemographics = [],
  filters = {},
  onFilterChange,
  onClearFilters,
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigation = (path) => {
    navigate(path)
    onHide()
  }

  const handleFilterChange = (demographicKey, value, checked) => {
    if (onFilterChange) {
      onFilterChange(demographicKey, value, checked)
    }
  }

  const clearAllFilters = () => {
    if (onClearFilters) {
      onClearFilters()
    }
  }

  const activeFiltersCount = Object.values(filters).reduce((count, values) => count + values.length, 0)

  return (
    <Offcanvas show={show} onHide={onHide} placement="start" style={{ width: "320px" }}>
      <Offcanvas.Header className="border-bottom">
        <Offcanvas.Title className="d-flex align-items-center">
          <Funnel className="me-2" />
          Navegação e Filtros
        </Offcanvas.Title>
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          <X />
        </Button>
      </Offcanvas.Header>

      <Offcanvas.Body className="p-0">
        {/* Navigation Section */}
        <div className="p-3 border-bottom bg-light">
          <h6 className="text-muted mb-3">NAVEGAÇÃO</h6>
          <Nav className="flex-column">
            <Nav.Link
              className={`d-flex align-items-center py-2 px-3 rounded mb-1 ${
                location.pathname === "/" ? "bg-primary text-white" : "text-dark"
              }`}
              onClick={() => handleNavigation("/")}
              style={{ cursor: "pointer" }}
            >
              <House className="me-2" />
              Dashboard
            </Nav.Link>
            <Nav.Link
              className={`d-flex align-items-center py-2 px-3 rounded mb-1 ${
                location.pathname === "/upload" ? "bg-primary text-white" : "text-dark"
              }`}
              onClick={() => handleNavigation("/upload")}
              style={{ cursor: "pointer" }}
            >
              <Upload className="me-2" />
              Upload de Dados
            </Nav.Link>
          </Nav>
        </div>

        {/* Filters Section */}
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-muted mb-0">
              FILTROS DEMOGRÁFICOS
              {activeFiltersCount > 0 && (
                <Badge bg="primary" className="ms-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </h6>
            {activeFiltersCount > 0 && (
              <Button variant="outline-danger" size="sm" onClick={clearAllFilters}>
                Limpar
              </Button>
            )}
          </div>

          <Accordion flush>
            {availableDemographics.map((demographic, index) => (
              <Accordion.Item key={demographic.key} eventKey={index.toString()}>
                <Accordion.Header>
                  <div className="d-flex justify-content-between align-items-center w-100 me-3">
                    <span>{demographic.label}</span>
                    {filters[demographic.key]?.length > 0 && (
                      <Badge bg="primary" pill>
                        {filters[demographic.key].length}
                      </Badge>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body className="py-2">
                  {demographic.values.map((value) => (
                    <Form.Check
                      key={value}
                      type="checkbox"
                      id={`${demographic.key}-${value}`}
                      label={value}
                      checked={(filters[demographic.key] || []).includes(value)}
                      onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                      className="mb-2"
                    />
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>

          {availableDemographics.length === 0 && (
            <div className="text-center text-muted py-4">
              <p>Nenhum filtro disponível</p>
            </div>
          )}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}

export default OffcanvasNavigation
