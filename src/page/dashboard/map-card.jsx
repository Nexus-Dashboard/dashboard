"use client"

import { Box, Typography, Button, Collapse, IconButton } from "@mui/material"
import InteractiveBrazilMap from "../../components/InteractiveBrazilMap"
import React, { useState } from "react"
import { Dropdown } from "react-bootstrap"
import { ChevronDown, ChevronUp, BarChart2, User, MapPin, Filter, CircleDollarSign } from "lucide-react"

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
  const filterGroups = ["Sexo", "Região", "Faixa de Renda"] 
  const relevantFilters = availableDemographics.filter((group) => filterGroups.includes(group.label))

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

  if (relevantFilters.length === 0) return null

  return (
    <Box sx={{ mt: 1, mb: 0 }}>
      {/* Header do Collapse */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          backgroundColor: "#f8f9fa",
          borderRadius: "12px 12px 0 0",
          border: "2px solid #dee2e6",
          borderBottom: isOpen ? "1px solid #dee2e6" : "2px solid #dee2e6",
          cursor: "pointer",
          transition: "all 0.3s ease",
          zIndex: 100,
          position: "relative",
          "&:hover": {
            backgroundColor: "#e9ecef",
            borderColor: "#0d6efd",
          },
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Filter size={16} />
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#495057",
            }}
          >
            Filtros Demográficos
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: "#6c757d", p: 0 }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </IconButton>
      </Box>

      {/* Conteúdo do Collapse */}
      <Collapse in={isOpen}>
        <Box
          sx={{
            p: 1.5,
            backgroundColor: "#ffffff",
            borderRadius: "0 0 12px 12px",
            border: "2px solid #dee2e6",
            borderTop: "none",
            zIndex: 100,
            position: "relative",
          }}
        >
          {relevantFilters.map((group) => (
            <Box key={group.key} sx={{ mb: 1.5, "&:last-child": { mb: 0 } }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#495057",
                  mb: 0.5,
                  display: "block",
                }}
              >
                {group.label}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {group.values
                  .filter(value => {
                    if (group.label === "Faixa de Renda") {
                      const upperCaseValue = value.toUpperCase();
                      return upperCaseValue !== "NÃO LER" && upperCaseValue !== "NS/NR";
                    }
                    return true;
                  })
                  .map((value) => {
                    const isActive = activeFilters[group.key]?.[0] === value;
                    return (
                      <Button
                        key={value}
                        variant={isActive ? "contained" : "outlined"}
                        size="small"
                        onClick={() => onFilterToggle(group.key, value)}
                        startIcon={ICONS[value] || <div style={{ width: 16 }} />}
                        sx={{
                          minWidth: "auto",
                          px: 1,
                          py: 0.25,
                          fontSize: "10px",
                          fontWeight: "500",
                          borderRadius: "16px",
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
                    );
                  })}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

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

        {/* Controles superiores - fixos */}
        <Box sx={{ mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
            {/* Seletor de resposta */}
            <Box sx={{ flex: mapRoundsWithData.length > 1 ? 1 : 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "15px",
                  mb: 1,
                  display: "block",
                  fontWeight: "600",
                  color: "#495057",
                }}
              >
                Resposta Selecionada:
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

            {/* Seletor de rodada (só aparece se há múltiplas rodadas) */}
            {mapRoundsWithData.length > 1 && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "15px",
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

        {/* Container do mapa - área principal que se adapta */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            position: "relative",
          }}
        >
          {/* Mapa */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fafafa",
              borderRadius: "12px",
              border: "1px solid #e9ecef",
              padding: "1rem",
              minHeight: "200px",
              maxHeight: "500px",
              transition: "all 0.3s ease",
              position: "relative",
              zIndex: 1,
            }}
          >
            {hasRounds && mapData.length > 0 ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InteractiveBrazilMap
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
          </Box>

          {/* Filtros - fixos na parte inferior, fora do container do mapa */}
          <CollapsibleMapFilters
            availableDemographics={availableDemographics}
            activeFilters={activeFilters}
            onFilterToggle={onFilterToggle}
          />
        </Box>
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