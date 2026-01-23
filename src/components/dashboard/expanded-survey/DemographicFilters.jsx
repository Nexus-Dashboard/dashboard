"use client"

import { Accordion, Form, Badge, Button } from "react-bootstrap"
import { Funnel, X } from "react-bootstrap-icons"

export default function DemographicFilters({
  demographicVariables = [],
  politicalVariables = [],
  filters = {},
  onFilterChange,
  onClearFilters
}) {
  const handleFilterToggle = (demographicKey, value, checked, groupedValues = null) => {
    const currentValues = filters[demographicKey] || []

    let newValues
    if (checked) {
      // Se for filtro político-atitudinal com valores agrupados, adicionar todos os valores do grupo
      if (groupedValues && groupedValues[value]) {
        // Adicionar o valor agrupado (ex: "Ótimo/Bom")
        newValues = [...currentValues, value]
      } else {
        // Adicionar valor simples
        newValues = [...currentValues, value]
      }
    } else {
      // Remover valor
      newValues = currentValues.filter(v => v !== value)
    }

    // Criar novo objeto de filtros
    const newFilters = { ...filters }

    if (newValues.length > 0) {
      newFilters[demographicKey] = newValues
    } else {
      delete newFilters[demographicKey]
    }

    onFilterChange(newFilters)
  }

  const activeFiltersCount = Object.values(filters).reduce(
    (count, values) => count + values.length,
    0
  )

  const customStyles = {
    container: {
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      border: '1px solid rgba(0,0,0,0.05)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '2px solid rgba(0,0,0,0.08)'
    },
    title: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#212529',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    badge: {
      background: 'linear-gradient(135deg, #1b1b1b 0%, #000000 100%)',
      borderRadius: '12px',
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: '600'
    },
    clearButton: {
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '6px 14px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#ffffff',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(220, 53, 69, 0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    accordionItem: {
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '10px',
      marginBottom: '12px',
      overflow: 'hidden',
      background: '#ffffff'
    },
    accordionHeader: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
      padding: 0
    },
    accordionBody: {
      padding: '16px 20px',
      maxHeight: '300px',
      overflowY: 'auto',
      background: '#ffffff'
    },
    checkbox: {
      marginBottom: '10px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#6c757d'
    }
  }

  if (!demographicVariables.length && !politicalVariables.length) {
    return (
      <div style={customStyles.container}>
        <div style={customStyles.emptyState}>
          <Funnel size={36} style={{ color: '#dee2e6', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
            Nenhum filtro disponível
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={customStyles.container}>
      <div style={customStyles.header}>
        <h6 style={customStyles.title}>
          <Funnel size={16} />
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
            onClick={onClearFilters}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
            }}
          >
            <X size={14} />
            Limpar
          </Button>
        )}
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {/* Filtros Demográficos */}
          {demographicVariables.length > 0 && (
            <>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#212529',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '2px solid rgba(0,0,0,0.08)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Filtros Demográficos
              </div>
              <Accordion flush>
                {demographicVariables.map((demographic, index) => {
                  const activeCount = filters[demographic.key]?.length || 0

                  return (
                    <Accordion.Item
                      key={demographic.key}
                      eventKey={index.toString()}
                      style={customStyles.accordionItem}
                    >
                      <Accordion.Header style={customStyles.accordionHeader}>
                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                            {demographic.label}
                          </span>
                          {activeCount > 0 && (
                            <Badge
                              style={{
                                background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}
                            >
                              {activeCount}
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
                            onChange={(e) =>
                              handleFilterToggle(demographic.key, value, e.target.checked)
                            }
                            style={customStyles.checkbox}
                          />
                        ))}
                      </Accordion.Body>
                    </Accordion.Item>
                  )
                })}
              </Accordion>
            </>
          )}

          {/* Filtros Político-Atitudinais */}
          {politicalVariables.length > 0 && (
            <>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#212529',
                marginTop: '20px',
                marginBottom: '12px',
                paddingTop: '16px',
                paddingBottom: '8px',
                borderTop: '3px solid #dc3545',
                borderBottom: '2px solid rgba(220, 53, 69, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: 'linear-gradient(90deg, rgba(220, 53, 69, 0.05) 0%, transparent 100%)'
              }}>
                🗳️ Filtros Político-Atitudinais
              </div>
              <Accordion flush>
                {politicalVariables.map((political, index) => {
                  const activeCount = filters[political.key]?.length || 0
                  const startIndex = demographicVariables.length

                  return (
                    <Accordion.Item
                      key={political.key}
                      eventKey={(startIndex + index).toString()}
                      style={{
                        ...customStyles.accordionItem,
                        borderLeft: '3px solid #dc3545'
                      }}
                    >
                      <Accordion.Header style={customStyles.accordionHeader}>
                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                            {political.label}
                          </span>
                          {activeCount > 0 && (
                            <Badge
                              style={{
                                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}
                            >
                              {activeCount}
                            </Badge>
                          )}
                        </div>
                      </Accordion.Header>
                      <Accordion.Body style={customStyles.accordionBody}>
                        {political.values.map((value) => (
                          <Form.Check
                            key={value}
                            type="checkbox"
                            id={`${political.key}-${value}`}
                            label={value}
                            checked={(filters[political.key] || []).includes(value)}
                            onChange={(e) =>
                              handleFilterToggle(political.key, value, e.target.checked, political.groupedValues)
                            }
                            style={customStyles.checkbox}
                          />
                        ))}
                      </Accordion.Body>
                    </Accordion.Item>
                  )
                })}
              </Accordion>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
