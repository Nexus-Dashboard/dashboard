"use client"
import { Offcanvas, Nav, Button, Accordion, Form, Badge } from "react-bootstrap"
import { House, Upload, X, Funnel, Filter } from "react-bootstrap-icons"
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

  // Estilos customizados
  const customStyles = {
    offcanvas: {
      width: "340px",
      background: "linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)",
      borderRight: "1px solid rgba(0,0,0,0.05)"
    },
    header: {
      background: "linear-gradient(135deg, #000000 0%, #000000 100%)",
      borderBottom: "none",
      padding: "20px 24px",
      color: "#ffffff",
      position: "relative",
      overflow: "hidden"
    },
    headerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
      pointerEvents: "none"
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      margin: 0,
      color: "#ffffff",
      textShadow: "0 1px 3px rgba(0,0,0,0.2)",
      display: "flex",
      alignItems: "center",
      position: "relative",
      zIndex: 1
    },
    closeButton: {
      background: "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: "8px",
      color: "#ffffff",
      padding: "8px 10px",
      transition: "all 0.3s ease",
      position: "relative",
      zIndex: 1
    },
    body: {
      padding: 0,
      background: "#ffffff"
    },
    navigationSection: {
      padding: "24px",
      background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      position: "relative"
    },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.5px",
      color: "#6c757d",
      marginBottom: "16px",
      textTransform: "uppercase"
    },
    navLink: {
      display: "flex",
      alignItems: "center",
      padding: "12px 16px",
      borderRadius: "10px",
      marginBottom: "8px",
      transition: "all 0.3s ease",
      cursor: "pointer",
      border: "1px solid transparent",
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "none"
    },
    navLinkActive: {
      background: "linear-gradient(135deg, #181818 0%, #000000 100%)",
      color: "#ffffff",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
      border: "1px solid rgba(102, 126, 234, 0.2)"
    },
    navLinkInactive: {
      background: "rgba(255,255,255,0.7)",
      color: "#495057",
      border: "1px solid rgba(0,0,0,0.08)"
    },
    filtersSection: {
      padding: "24px"
    },
    filtersHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px"
    },
    filtersTitle: {
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.5px",
      color: "#6c757d",
      margin: 0,
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    badge: {
      background: "linear-gradient(135deg, #1b1b1b 0%, #000000 100%)",
      border: "none",
      borderRadius: "12px",
      padding: "4px 8px",
      fontSize: "11px",
      fontWeight: "600"
    },
    clearButton: {
      background: "linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)",
      border: "none",
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: "12px",
      fontWeight: "500",
      color: "#ffffff",
      transition: "all 0.3s ease",
      boxShadow: "0 2px 8px rgba(220, 53, 69, 0.25)"
    },
    accordionItem: {
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: "10px",
      marginBottom: "12px",
      overflow: "hidden",
      background: "#ffffff"
    },
    accordionHeader: {
      background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
      border: "none",
      padding: 0
    },
    accordionButton: {
      padding: "16px 20px",
      border: "none",
      background: "transparent",
      fontSize: "14px",
      fontWeight: "500",
      color: "#495057",
      transition: "all 0.3s ease"
    },
    accordionBody: {
      padding: "16px 20px",
      background: "#ffffff",
      borderTop: "1px solid rgba(0,0,0,0.05)"
    },
    checkbox: {
      marginBottom: "12px"
    },
    checkboxLabel: {
      fontSize: "13px",
      color: "#495057",
      fontWeight: "400",
      cursor: "pointer",
      transition: "color 0.2s ease"
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: "#6c757d"
    },
    emptyIcon: {
      fontSize: "36px",
      color: "#dee2e6",
      marginBottom: "12px"
    },
    emptyText: {
      fontSize: "14px",
      fontWeight: "500",
      margin: 0
    }
  }

  return (
    <Offcanvas show={show} onHide={onHide} placement="start" style={customStyles.offcanvas}>
      <Offcanvas.Header style={customStyles.header}>
        <div style={customStyles.headerOverlay}></div>
        <Offcanvas.Title style={customStyles.title}>
          <Funnel className="me-2" size={20} />
          Navegação e Filtros
        </Offcanvas.Title>
        <Button 
          style={customStyles.closeButton}
          onClick={onHide}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255,255,255,0.3)"
            e.target.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255,255,255,0.2)"
            e.target.style.transform = "scale(1)"
          }}
        >
          <X size={16} />
        </Button>
      </Offcanvas.Header>

      <Offcanvas.Body style={customStyles.body}>
        {/* Navigation Section */}
        <div style={customStyles.navigationSection}>
          <h6 style={customStyles.sectionTitle}>
            <House size={14} />
            Navegação
          </h6>
          <Nav className="flex-column">
            <Nav.Link
              style={{
                ...customStyles.navLink,
                ...(location.pathname === "/" 
                  ? customStyles.navLinkActive 
                  : customStyles.navLinkInactive
                )
              }}
              onClick={() => handleNavigation("/")}
              onMouseEnter={(e) => {
                if (location.pathname !== "/") {
                  e.target.style.background = "rgba(102, 126, 234, 0.1)"
                  e.target.style.transform = "translateX(4px)"
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/") {
                  e.target.style.background = "rgba(255,255,255,0.7)"
                  e.target.style.transform = "translateX(0)"
                }
              }}
            >
              <House className="me-3" size={16} />
              Home
            </Nav.Link>
            <Nav.Link
              style={{
                ...customStyles.navLink,
                ...(location.pathname === "/upload" 
                  ? customStyles.navLinkActive 
                  : customStyles.navLinkInactive
                )
              }}
              onClick={() => handleNavigation("/upload")}
              onMouseEnter={(e) => {
                if (location.pathname !== "/upload") {
                  e.target.style.background = "rgba(102, 126, 234, 0.1)"
                  e.target.style.transform = "translateX(4px)"
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/upload") {
                  e.target.style.background = "rgba(255,255,255,0.7)"
                  e.target.style.transform = "translateX(0)"
                }
              }}
            >
              <Upload className="me-3" size={16} />
              Upload de Dados
            </Nav.Link>
          </Nav>
        </div>

        {/* Filters Section */}
        <div style={customStyles.filtersSection}>
          <div style={customStyles.filtersHeader}>
            <h6 style={customStyles.filtersTitle}>
              <Filter size={14} />
              Filtros Demográficos
              {activeFiltersCount > 0 && (
                <Badge style={customStyles.badge}>
                  {activeFiltersCount}
                </Badge>
              )}
            </h6>
            {activeFiltersCount > 0 && (
              <Button 
                style={customStyles.clearButton}
                onClick={clearAllFilters}
                onMouseEnter={(e) => {
                  e.target.style.transform = "scale(1.05)"
                  e.target.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.35)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "scale(1)"
                  e.target.style.boxShadow = "0 2px 8px rgba(220, 53, 69, 0.25)"
                }}
              >
                Limpar Tudo
              </Button>
            )}
          </div>

          <Accordion flush>
            {availableDemographics.map((demographic, index) => (
              <Accordion.Item key={demographic.key} eventKey={index.toString()} style={customStyles.accordionItem}>
                <Accordion.Header style={customStyles.accordionHeader}>
                  <div className="d-flex justify-content-between align-items-center w-100 me-3">
                    <span style={{ fontSize: "14px", fontWeight: "500", color: "#495057" }}>
                      {demographic.label}
                    </span>
                    {filters[demographic.key]?.length > 0 && (
                      <Badge style={{
                        ...customStyles.badge,
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px"
                      }}>
                        {filters[demographic.key].length}
                      </Badge>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body style={customStyles.accordionBody}>
                  {demographic.values.map((value) => (
                    <Form.Check
                      key={value}
                      type="checkbox"
                      id={`${demographic.key}-${value}`}
                      label={value}
                      checked={(filters[demographic.key] || []).includes(value)}
                      onChange={(e) => handleFilterChange(demographic.key, value, e.target.checked)}
                      style={customStyles.checkbox}
                      className="custom-checkbox"
                    />
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>

          {availableDemographics.length === 0 && (
            <div style={customStyles.emptyState}>
              <div style={customStyles.emptyIcon}>🔍</div>
              <p style={customStyles.emptyText}>Nenhum filtro disponível</p>
            </div>
          )}
        </div>
      </Offcanvas.Body>

      <style jsx>{`
        .custom-checkbox .form-check-input:checked {
          background: linear-gradient(135deg, #0e0e0e 0%, #000000 100%);
          border-color: #0f0f0f;
        }
        
        .custom-checkbox .form-check-label {
          font-size: 13px;
          color: #495057;
          font-weight: 400;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .custom-checkbox .form-check-label:hover {
          color: #000000;
        }
        
        .accordion-button:not(.collapsed) {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          color: #000000;
          font-weight: 600;
        }
        
        .accordion-button:focus {
          box-shadow: none;
          border-color: rgba(102, 126, 234, 0.2);
        }
        
        .accordion-button::after {
          filter: hue-rotate(220deg);
        }
      `}</style>
    </Offcanvas>
  )
}

export default OffcanvasNavigation