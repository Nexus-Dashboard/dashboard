import { Card, Row, Col, Badge } from "react-bootstrap"
import { formatSurveyTitle, extractWeight } from "../utils/chartUtils"
import "./SurveySummary.css"

const SurveySummary = ({ survey, responses, selectedQuestion }) => {
  if (!survey) return null

  // Calculate total responses and weighted total
  const totalResponses = responses?.length || 0
  const weightedTotal = responses?.reduce((sum, response) => {
    const weight = extractWeight(response)
    return sum + weight
  }, 0)

  // Count valid responses for the selected question
  const validResponses =
    responses?.filter((r) => r[selectedQuestion.key] !== null && r[selectedQuestion.key] !== undefined).length || 0

  return (
    <Card className="survey-summary-card mb-4">
      <Card.Body>
        <h5 className="survey-summary-title">Informações da Pesquisa</h5>
        <Row className="mt-3">
          <Col md={6} className="mb-2">
            <div className="survey-info-item">
              <span className="survey-info-label">Nome:</span>
              <span className="survey-info-value">{survey.name || formatSurveyTitle(survey)}</span>
            </div>
          </Col>
          <Col md={6} className="mb-2">
            <div className="survey-info-item">
              <span className="survey-info-label">Data:</span>
              <span className="survey-info-value">
                {survey.month} {survey.year}
              </span>
            </div>
          </Col>
          <Col md={6} className="mb-2">
            <div className="survey-info-item">
              <span className="survey-info-label">Total de entrevistados:</span>
              <Badge bg="primary" className="survey-info-badge">
                {totalResponses.toLocaleString()}
              </Badge>
            </div>
          </Col>
          <Col md={6} className="mb-2">
            <div className="survey-info-item">
              <span className="survey-info-label">Peso total da amostra:</span>
              <Badge bg="info" className="survey-info-badge">
                {weightedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Badge>
            </div>
          </Col>
          <Col md={6} className="mb-2">
            <div className="survey-info-item">
              <span className="survey-info-label">Respostas válidas para esta pergunta:</span>
              <Badge bg="success" className="survey-info-badge">
                {validResponses.toLocaleString()} ({Math.round((validResponses / totalResponses) * 100)}%)
              </Badge>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default SurveySummary
