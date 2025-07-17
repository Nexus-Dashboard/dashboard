"use client"

import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap"
import { HelpCircle } from 'lucide-react'

const AnswerOptionsDisplay = ({ possibleAnswers, maxDisplay = 3, variant = "primary" }) => {
  if (!possibleAnswers || possibleAnswers.length === 0) {
    return (
      <Badge bg="secondary" pill className="d-flex align-items-center gap-1">
        <HelpCircle size={12} />
        Resposta Aberta
      </Badge>
    )
  }

  const displayAnswers = possibleAnswers.slice(0, maxDisplay)
  const remainingCount = possibleAnswers.length - maxDisplay

  const getAnswerTypeColor = (answers) => {
    const labels = answers.map(a => a.label.toLowerCase())
    
    if (labels.some(l => l.includes("ótimo") && l.includes("péssimo"))) {
      return "success"
    }
    if (labels.some(l => l.includes("aprova") && l.includes("desaprova"))) {
      return "warning"
    }
    if (labels.some(l => l.includes("sim") && l.includes("não"))) {
      return "info"
    }
    
    return variant
  }

  const badgeColor = getAnswerTypeColor(possibleAnswers)

  const renderTooltipContent = () => (
    <div>
      <strong>Todas as opções de resposta:</strong>
      <ul className="mb-0 mt-1 ps-3">
        {possibleAnswers.map((answer, index) => (
          <li key={index} className="small">
            {answer.label}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="d-flex flex-wrap gap-1 align-items-center">
      {displayAnswers.map((answer, index) => (
        <Badge key={index} bg={badgeColor} pill className="small">
          {answer.label}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip>{renderTooltipContent()}</Tooltip>}
        >
          <Badge bg={badgeColor} pill className="small" style={{ cursor: 'help' }}>
            +{remainingCount} mais
          </Badge>
        </OverlayTrigger>
      )}
      
      <Badge bg="light" text="dark" pill className="small">
        {possibleAnswers.length} opções
      </Badge>
    </div>
  )
}

export default AnswerOptionsDisplay