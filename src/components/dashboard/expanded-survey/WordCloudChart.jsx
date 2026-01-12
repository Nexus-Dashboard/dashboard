"use client"

import { useMemo } from "react"
import { Card } from "react-bootstrap"
import ReactWordcloud from "react-wordcloud"
import { getResponseColor } from "../../../utils/chartUtils"

export default function WordCloudChart({
  data,
  questionText,
  variableName,
  variableLabel,
  sampleSize,
  originalSampleSize
}) {
  // Processar dados para o formato da word cloud
  const wordCloudData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Filtrar #NULL! e respostas com valor "-1", depois converter para formato { text, value }
    const filtered = data.filter(item => {
      const response = item.response?.trim()
      return response &&
             response !== '#NULL!' &&
             response !== '#NULL' &&
             response !== '#null' &&
             response !== '-1'
    })

    // Converter para formato da word cloud
    return filtered.map(item => ({
      text: item.response,
      value: item.count, // Usar count direto para tamanho da palavra
      percentage: item.percentage
    }))
  }, [data])

  // Opções do word cloud
  const options = {
    rotations: 2,
    rotationAngles: [0, 90],
    fontSizes: [16, 80],
    padding: 4,
    deterministic: true,
    enableTooltip: true,
    tooltipOptions: {
      allowHTML: true,
      theme: 'dark'
    }
  }

  // Callbacks do word cloud
  const callbacks = {
    getWordColor: (word) => {
      // Tentar usar cor do sistema, senão usar gradiente de azul
      const color = getResponseColor(word.text)
      if (color !== "#999999") {
        return color
      }

      // Gradiente baseado na frequência
      const maxValue = Math.max(...wordCloudData.map(w => w.value))
      const ratio = word.value / maxValue

      // Azul escuro para palavras mais frequentes, azul claro para menos frequentes
      const darkBlue = { r: 30, g: 58, b: 138 }
      const lightBlue = { r: 147, g: 197, b: 253 }

      const r = Math.round(darkBlue.r + (lightBlue.r - darkBlue.r) * (1 - ratio))
      const g = Math.round(darkBlue.g + (lightBlue.g - darkBlue.g) * (1 - ratio))
      const b = Math.round(darkBlue.b + (lightBlue.b - darkBlue.b) * (1 - ratio))

      return `rgb(${r}, ${g}, ${b})`
    },
    getWordTooltip: (word) => {
      const wordData = wordCloudData.find(w => w.text === word.text)
      return `<div style="padding: 8px 12px; background: rgba(0,0,0,0.92); color: white; border-radius: 8px; font-size: 13px;">
        <strong>${word.text}</strong><br/>
        Contagem: ${word.value}<br/>
        Porcentagem: ${wordData?.percentage?.toFixed(1)}%
      </div>`
    }
  }

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
      padding: '20px 24px',
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
      fontSize: '16px',
      fontWeight: '500',
      margin: 0,
      lineHeight: '1.4',
      textShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    variableBadge: {
      display: 'inline-block',
      background: 'rgba(255,255,255,0.25)',
      color: '#ffffff',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '800',
      border: '1px solid rgba(255,255,255,0.4)',
      letterSpacing: '0.8px'
    },
    cardBody: {
      padding: '24px',
      background: '#ffffff'
    },
    cloudContainer: {
      height: '500px',
      width: '100%',
      borderRadius: '12px',
      background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
      color: '#6c757d'
    },
    emptyIcon: {
      fontSize: '48px',
      color: '#dee2e6',
      marginBottom: '16px'
    },
    emptyText: {
      fontSize: '16px',
      fontWeight: '500',
      marginBottom: '8px'
    }
  }

  if (!wordCloudData.length) {
    return (
      <Card style={customStyles.card}>
        <Card.Header style={customStyles.cardHeader}>
          <div style={customStyles.cardHeaderOverlay}></div>
          <div style={customStyles.headerContent}>
            <span style={customStyles.variableBadge}>{variableName}</span>
            <h6 style={{...customStyles.title, marginTop: '8px'}}>Nenhum dado disponível</h6>
            {variableLabel && (
              <p style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '14px',
                fontWeight: '400',
                fontStyle: 'italic',
                margin: '8px 0 0 0',
                lineHeight: '1.4'
              }}>
                {variableLabel}
              </p>
            )}
          </div>
        </Card.Header>
        <Card.Body style={customStyles.cardBody}>
          <div style={customStyles.emptyState}>
            <div style={customStyles.emptyIcon}>☁️</div>
            <div style={customStyles.emptyText}>Nenhum dado disponível</div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.cardHeader}>
        <div style={customStyles.cardHeaderOverlay}></div>
        <div style={customStyles.headerContent}>
          {variableName && (
            <span style={customStyles.variableBadge}>{variableName}</span>
          )}
          {questionText && (
            <h6 style={{...customStyles.title, marginTop: '8px', marginBottom: 0}}>{questionText}</h6>
          )}
          {variableLabel && (
            <p style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '14px',
              fontWeight: '400',
              fontStyle: 'italic',
              margin: '8px 0 0 0',
              lineHeight: '1.4'
            }}>
              {variableLabel}
            </p>
          )}
        </div>
      </Card.Header>
      <Card.Body style={customStyles.cardBody}>
        <div style={customStyles.cloudContainer}>
          <ReactWordcloud
            words={wordCloudData}
            options={options}
            callbacks={callbacks}
          />
        </div>

        {/* Informação de Amostra */}
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '1px solid #90caf9',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#1565c0'
            }}
          >
            <strong>Amostra:</strong> {sampleSize} de {originalSampleSize} respostas | <strong>Respostas únicas:</strong> {wordCloudData.length}
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
