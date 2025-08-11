"use client"

import { Box, Typography, Button, Collapse, IconButton } from "@mui/material"
import InteractiveBrazilMap from "../../components/InteractiveBrazilMap"
import React, { useState } from "react"
import { Dropdown } from "react-bootstrap"
import { ChevronDown, ChevronUp, BarChart2, User, MapPin, Filter } from "lucide-react"

// Custom Toggle for the response selector dropdown
const ResponseSelectorToggle = React.forwardRef(({ children, onClick }, ref) => (
  <div
    ref={ref}
    onClick={(e) => {
      e.preventDefault()
      onClick(e)
    }}
    style={{
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "12px 16px",
      borderRadius: "10px",
      border: "2px solid #dee2e6",
      backgroundColor: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      color: "#495057",
      transition: "all 0.3s ease",
      width: "100%",
      justifyContent: "space-between",
      minHeight: "48px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    }}
    onMouseEnter={(e) => {
      e.target.style.borderColor = "#0d6efd"
      e.target.style.backgroundColor = "#f8f9fa"
      e.target.style.transform = "translateY(-1px)"
      e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)"
    }}
    onMouseLeave={(e) => {
      e.target.style.borderColor = "#dee2e6"
      e.target.style.backgroundColor = "#ffffff"
      e.target.style.transform = "translateY(0)"
      e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <BarChart2 size={18} />
      <span style={{ fontWeight: "600" }}>{children}</span>
    </div>
    <ChevronDown size={16} />
  </div>
))
ResponseSelectorToggle.displayName = "ResponseSelectorToggle"

// Custom Menu for the response selector dropdown
const ResponseSelectorMenu = React.forwardRef(({ children, style, className, "aria-labelledby": labeledBy }, ref) => (
  <div
    ref={ref}
    style={{
      ...style,
      backgroundColor: "#ffffff",
      border: "2px solid #dee2e6",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
      padding: "8px",
      width: "100%",
      maxHeight: "250px",
      overflowY: "auto",
      zIndex: 1000,
    }}
    className={className}
    aria-labelledby={labeledBy}
  >
    <ul className="list-unstyled" style={{ margin: 0 }}>
      {children}
    </ul>
  </div>
))
ResponseSelectorMenu.displayName = "ResponseSelectorMenu"

const CollapsibleMapFilters = ({ availableDemographics, activeFilters, onFilterToggle }) => {
  const [isOpen, setIsOpen] = useState(false)
  const filterGroups = ["Sexo", "Região"]
  const relevantFilters = availableDemographics.filter((group) => filterGroups.includes(group.label))

  const ICONS = {
    Feminino: <User size={16} />,
    Masculino: <User size={16} />,
    "Centro-Oeste": <MapPin size={16} />,
    Nordeste: <MapPin size={16} />,
    Norte: <MapPin size={16} />,
    Sudeste: <MapPin size={16} />,
    Sul: <MapPin size={16} />,
  }

  if (relevantFilters.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header do Collapse */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          backgroundColor: "#f8f9fa",
          borderRadius: "12px 12px 0 0",
          border: "2px solid #dee2e6",
          borderBottom: isOpen ? "1px solid #dee2e6" : "2px solid #dee2e6",
          cursor: "pointer",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "#e9ecef",
            borderColor: "#0d6efd",
          },
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Filter size={18} />
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#495057",
            }}
          >
            Filtros Demográficos
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: "#6c757d" }}>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </IconButton>
      </Box>

      {/* Conteúdo do Collapse */}
      <Collapse in={isOpen}>
        <Box
          sx={{
            p: 2,
            backgroundColor: "#ffffff",
            borderRadius: "0 0 12px 12px",
            border: "2px solid #dee2e6",
            borderTop: "none",
          }}
        >
          {relevantFilters.map((group) => (
            <Box key={group.key} sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#495057",
                  mb: 1,
                  display: "block",
                }}
              >
                {group.label}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {group.values.map((value) => {
                  const isActive = activeFilters[group.key]?.[0] === value
                  return (
                    <Button
                      key={value}
                      variant={isActive ? "contained" : "outlined"}
                      size="small"
                      onClick={() => onFilterToggle(group.key, value)}
                      startIcon={ICONS[value] || <div style={{ width: 16 }} />}
                      sx={{
                        minWidth: "auto",
                        px: 1.5,
                        py: 0.5,
                        fontSize: "11px",
                        fontWeight: "500",
                        borderRadius: "20px",
                        textTransform: "none",
                        transition: "all 0.2s ease",
                        ...(isActive
                          ? {
                              backgroundColor: "#0d6efd",
                              borderColor: "#0d6efd",
                              color: "#ffffff",
                              boxShadow: "0 2px 4px rgba(13, 110, 253, 0.3)",
                            }
                          : {
                              backgroundColor: "#ffffff",
                              borderColor: "#dee2e6",
                              color: "#6c757d",
                              "&:hover": {
                                backgroundColor: "#e3f2fd",
                                borderColor: "#0d6efd",
                                color: "#0d6efd",
                              },
                            }),
                      }}
                    >
                      {value}
                    </Button>
                  )
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

const InteractiveBrazilMapWithTooltip = ({ responses, selectedQuestion, selectedMapResponse, onStateClick }) => {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })

  const handleMouseEnter = (event, stateData) => {
    if (!stateData || !responses) return

    // Calcular estatísticas para o estado
    const stateResponses = responses.filter((r) => r.UF === stateData.uf)
    const totalResponses = stateResponses.length

    if (totalResponses === 0) return

    // Contar respostas para a resposta selecionada
    const selectedResponses = stateResponses.filter((r) => r[selectedQuestion?.variable] === selectedMapResponse).length

    // Calcular porcentagem
    const percentage = ((selectedResponses / totalResponses) * 100).toFixed(1)

    // Calcular margem de erro: raiz quadrada de (1/N)
    const marginOfError = (Math.sqrt(1 / totalResponses) * 100).toFixed(1)

    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content: {
        state: stateData.name,
        percentage: percentage,
        marginOfError: marginOfError,
        totalResponses: totalResponses,
        selectedResponse: selectedMapResponse,
      },
    })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: null })
  }

  const handleMouseMove = (event) => {
    if (tooltip.visible) {
      setTooltip((prev) => ({
        ...prev,
        x: event.clientX,
        y: event.clientY,
      }))
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <InteractiveBrazilMap
        responses={responses}
        selectedQuestion={selectedQuestion}
        selectedMapResponse={selectedMapResponse}
        onStateClick={onStateClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      />

      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            background: "rgba(0, 0, 0, 0.9)",
            color: "white",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            pointerEvents: "none",
            maxWidth: "250px",
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "4px" }}>{tooltip.content.state}</div>
          <div style={{ marginBottom: "2px" }}>
            <strong>{tooltip.content.selectedResponse}:</strong> {tooltip.content.percentage}%
          </div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>Margem de erro: ±{tooltip.content.marginOfError}pp</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>({tooltip.content.totalResponses} respostas)</div>
        </div>
      )}
    </div>
  )
}

export default function MapCard({
  mapRoundsWithData = [],
  selectedMapRoundIndex = 0,
  onRoundIndexChange,
  mapData = [],
  questionInfo,
  availableDemographics = [],
  activeFilters = {},
  onFilterToggle,
  getXAxisLabel,
  availableMapResponses = [],
  selectedMapResponse,
  onMapResponseChange,
}) {
  const hasRounds = mapRoundsWithData?.length > 0
  const maxIndex = Math.max(0, (mapRoundsWithData?.length || 1) - 1)

  return (
    <div className="map-card">
      <div
        className="map-card-content"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "1.5rem",
        }}
      >
        <Typography className="card-title-custom" sx={{ fontSize: "1.1rem", mb: 2, fontWeight: 600 }}>
          Mapa Interativo do Brasil
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
            {/* Seletor de resposta - 50% quando há múltiplas rodadas, 100% quando há apenas uma */}
            <Box sx={{ flex: mapRoundsWithData.length > 1 ? 1 : 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "12px",
                  mb: 1,
                  display: "block",
                  fontWeight: "600",
                  color: "#495057",
                }}
              >
                Visualizar Resposta
              </Typography>
              <Dropdown onSelect={onMapResponseChange} style={{ width: "100%" }}>
                <Dropdown.Toggle as={ResponseSelectorToggle} id="response-selector-dropdown">
                  <span style={{ fontSize: "14px" }}>{selectedMapResponse || "Selecione uma resposta"}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu as={ResponseSelectorMenu}>
                  {availableMapResponses.map((response) => (
                    <Dropdown.Item
                      key={response}
                      eventKey={response}
                      active={selectedMapResponse === response}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        margin: "4px 0",
                        fontSize: "14px",
                        fontWeight: selectedMapResponse === response ? "600" : "400",
                        backgroundColor: selectedMapResponse === response ? "#e3f2fd" : "transparent",
                        transition: "all 0.2s ease",
                        border: "none",
                      }}
                    >
                      {response}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Box>

            {mapRoundsWithData.length > 1 && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "12px",
                    mb: 1,
                    display: "block",
                    fontWeight: "600",
                    color: "#495057",
                  }}
                >
                  Rodada: {getXAxisLabel?.(mapRoundsWithData[selectedMapRoundIndex]) || "N/A"}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    border: "2px solid #dee2e6",
                    minHeight: "48px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={maxIndex}
                    value={selectedMapRoundIndex}
                    onChange={(e) => onRoundIndexChange?.(Number.parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      height: "6px",
                      borderRadius: "5px",
                      background: "#dee2e6",
                      outline: "none",
                      cursor: "pointer",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                    aria-label="Selecionar rodada"
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#6c757d", fontWeight: "500" }}>
                      Mais Recente
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#6c757d", fontWeight: "500" }}>
                      Mais Antiga
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Mapa - ocupa o espaço restante e centralizado */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            mt: 2,
            // position: "relative", // Removed position relative to avoid overlap
          }}
        >
          <div
            style={{
              flexGrow: 1,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fafafa",
              borderRadius: "12px",
              border: "1px solid #e9ecef",
              padding: "1rem",
              // minHeight: "350px", // Reduced minimum height for better responsiveness
              minHeight: "280px",
              transition: "all 0.3s ease", // Added transition for smooth height changes
            }}
          >
            {hasRounds && mapData.length > 0 && selectedMapResponse ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InteractiveBrazilMapWithTooltip
                  responses={mapData}
                  selectedQuestion={questionInfo}
                  selectedMapResponse={selectedMapResponse}
                  onStateClick={() => {}}
                />
              </div>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "text.secondary",
                  textAlign: "center",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <MapPin size={48} style={{ color: "#dee2e6" }} />
                <Typography sx={{ fontSize: "14px", fontWeight: "500" }}>
                  {hasRounds && mapData.length > 0
                    ? "Selecione uma resposta para visualizar o mapa"
                    : "Nenhum dado geográfico disponível para a rodada selecionada"}
                </Typography>
              </Box>
            )}
          </div>
        </Box>

        {/* Filtros moved outside the container flexGrow to avoid overlap */}
        <CollapsibleMapFilters
          availableDemographics={availableDemographics}
          activeFilters={activeFilters}
          onFilterToggle={onFilterToggle}
        />
      </div>

      {/* Estilos CSS para o slider customizado */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #0b5ed7;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          background: #0b5ed7;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}
