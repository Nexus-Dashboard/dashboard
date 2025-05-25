"use client"

import { useMemo } from "react"
import { Row, Col, Alert } from "react-bootstrap"
import DemographicComparisonChart from "./DemographicComparisonChart"

const DemographicComparisons = ({ responses, selectedQuestion, availableDemographics }) => {
  // Find gender demographic (PF01)
  const genderDemographic = useMemo(() => {
    return availableDemographics.find((d) => d.key === "PF01") || null
  }, [availableDemographics])

  // Find income demographic (PF05)
  const incomeDemographic = useMemo(() => {
    return availableDemographics.find((d) => d.key === "PF05") || null
  }, [availableDemographics])

  if (!responses || !selectedQuestion.key) {
    return null
  }

  return (
    <div className="demographic-comparisons mb-4">
      <h3 className="mb-3">Análise Demográfica</h3>

      <Row>
        {genderDemographic ? (
          <Col xs={12} className="mb-4">
            <DemographicComparisonChart
              responses={responses}
              selectedQuestion={selectedQuestion}
              demographicKey="PF01"
              demographicLabel="Gênero"
              demographicValues={genderDemographic.values}
            />
          </Col>
        ) : null}

        {incomeDemographic ? (
          <Col xs={12} className="mb-4">
            <DemographicComparisonChart
              responses={responses}
              selectedQuestion={selectedQuestion}
              demographicKey="PF05"
              demographicLabel="Faixa de Renda"
              demographicValues={incomeDemographic.values}
            />
          </Col>
        ) : null}

        {!genderDemographic && !incomeDemographic && (
          <Col xs={12}>
            <Alert variant="info">
              Dados demográficos de gênero (PF01) e renda (PF05) não estão disponíveis para esta pesquisa.
            </Alert>
          </Col>
        )}
      </Row>
    </div>
  )
}

export default DemographicComparisons
