"use client"

import { useMemo } from "react"
import { Card, Badge } from "react-bootstrap"
import { getResponseColor } from "../../../utils/chartUtils"

export default function ResponseList({
  data,
  variableName,
  variableLabel
}) {
  // Processar e ordenar dados por contagem (maior para menor)
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Filtrar #NULL! e respostas com valor "-1", depois ordenar por contagem
    const filtered = data.filter(item => {
      const response = item.response?.trim()
      return response &&
             response !== '#NULL!' &&
             response !== '#NULL' &&
             response !== '#null' &&
             response !== '-1'
    })

    return filtered.sort((a, b) => b.count - a.count)
  }, [data])

  const customStyles = {
    card: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      overflow: 'hidden',
      height: '100%'
    },
    cardHeader: {
      background: 'linear-gradient(135deg, #1d1d1d 0%, #000000 100%)',
      border: 'none',
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden'
    },
    cardHeaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
      pointerEvents: 'none'
    },
    headerContent: {
      position: 'relative',
      zIndex: 1
    },
    title: {
      color: '#ffffff',
      fontSize: '15px',
      fontWeight: '600',
      margin: 0,
      lineHeight: '1.4',
      textShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    variableBadge: {
      display: 'inline-block',
      background: 'rgba(255,255,255,0.25)',
      color: '#ffffff',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      border: '1px solid rgba(255,255,255,0.4)',
      letterSpacing: '0.5px',
      marginBottom: '8px'
    },
    cardBody: {
      padding: '16px 20px',
      background: '#ffffff',
      maxHeight: '500px',
      overflowY: 'auto'
    },
    listItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      marginBottom: '8px',
      borderRadius: '8px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      border: '1px solid rgba(0,0,0,0.05)',
      transition: 'all 0.2s ease'
    },
    responseText: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#212529',
      flex: 1,
      marginRight: '12px',
      wordBreak: 'break-word'
    },
    statsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexShrink: 0
    },
    countBadge: {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      color: '#ffffff',
      minWidth: '60px',
      textAlign: 'center'
    },
    percentageBadge: {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      background: 'rgba(0,0,0,0.05)',
      color: '#495057',
      minWidth: '55px',
      textAlign: 'center'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#6c757d'
    },
    emptyIcon: {
      fontSize: '36px',
      color: '#dee2e6',
      marginBottom: '12px'
    },
    emptyText: {
      fontSize: '14px',
      fontWeight: '500'
    }
  }

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.cardHeader}>
        <div style={customStyles.cardHeaderOverlay}></div>
        <div style={customStyles.headerContent}>
          {variableName && (
            <div style={customStyles.variableBadge}>{variableName}</div>
          )}
          <h6 style={customStyles.title}>
            {variableLabel ? `Lista de Respostas - ${variableLabel}` : 'Lista de Respostas'}
          </h6>
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        {processedData.length === 0 ? (
          <div style={customStyles.emptyState}>
            <div style={customStyles.emptyIcon}>📋</div>
            <div style={customStyles.emptyText}>Nenhuma resposta disponível</div>
          </div>
        ) : (
          <div>
            {processedData.map((item, idx) => {
              const color = getResponseColor(item.response)
              const useCustomColor = color !== "#999999"

              return (
                <div
                  key={idx}
                  style={{
                    ...customStyles.listItem,
                    borderLeft: useCustomColor ? `4px solid ${color}` : '4px solid #dee2e6'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={customStyles.responseText}>
                    {item.response}
                  </div>
                  <div style={customStyles.statsContainer}>
                    <div style={customStyles.countBadge}>
                      {item.count.toFixed(0)}
                    </div>
                    <div style={customStyles.percentageBadge}>
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
