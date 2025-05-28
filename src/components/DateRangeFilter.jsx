"use client"

import { useState, useEffect } from "react"
import { Card, Form, Row, Col, Button } from "react-bootstrap"
import { ChevronDown, ChevronUp, Calendar } from "react-bootstrap-icons"

const DateRangeFilter = ({ surveys = [], onDateRangeChange, selectedRange }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [availableDates, setAvailableDates] = useState([])

  // Extract and sort available dates from surveys
  useEffect(() => {
    if (surveys.length > 0) {
      const dates = surveys
        .map((survey) => {
          const month = survey.month || ""
          const year = survey.year || ""
          if (month && year) {
            // Convert month name to number
            const monthMap = {
              Janeiro: "01",
              Fevereiro: "02",
              Março: "03",
              Abril: "04",
              Maio: "05",
              Junho: "06",
              Julho: "07",
              Agosto: "08",
              Setembro: "09",
              Outubro: "10",
              Novembro: "11",
              Dezembro: "12",
            }
            const monthNum = monthMap[month] || "01"
            return {
              date: `${year}-${monthNum}-01`,
              display: `${month} ${year}`,
              survey,
            }
          }
          return null
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      setAvailableDates(dates)

      // Set initial range if not already set
      if (dates.length > 0 && !selectedRange) {
        const firstDate = dates[0].date
        const lastDate = dates[dates.length - 1].date
        setStartDate(firstDate)
        setEndDate(lastDate)
        if (onDateRangeChange) {
          onDateRangeChange({ start: firstDate, end: lastDate })
        }
      }
    }
  }, [surveys, selectedRange, onDateRangeChange])

  // Update local state when selectedRange changes
  useEffect(() => {
    if (selectedRange) {
      setStartDate(selectedRange.start || "")
      setEndDate(selectedRange.end || "")
    }
  }, [selectedRange])

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setStartDate(value)
      if (onDateRangeChange) {
        onDateRangeChange({ start: value, end: endDate })
      }
    } else {
      setEndDate(value)
      if (onDateRangeChange) {
        onDateRangeChange({ start: startDate, end: value })
      }
    }
  }

  const resetRange = () => {
    if (availableDates.length > 0) {
      const firstDate = availableDates[0].date
      const lastDate = availableDates[availableDates.length - 1].date
      setStartDate(firstDate)
      setEndDate(lastDate)
      if (onDateRangeChange) {
        onDateRangeChange({ start: firstDate, end: lastDate })
      }
    }
  }

  if (availableDates.length === 0) {
    return null
  }

  return (
    <Card className="mb-3">
      <Card.Header
        className="d-flex justify-content-between align-items-center py-2 px-3"
        style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center">
          <Calendar className="me-2 text-primary" />
          <span className="fw-medium">Período</span>
        </div>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </Card.Header>

      {isExpanded && (
        <Card.Body className="py-3">
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Data Inicial</Form.Label>
                <Form.Select size="sm" value={startDate} onChange={(e) => handleDateChange("start", e.target.value)}>
                  {availableDates.map((item) => (
                    <option key={item.date} value={item.date}>
                      {item.display}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Data Final</Form.Label>
                <Form.Select size="sm" value={endDate} onChange={(e) => handleDateChange("end", e.target.value)}>
                  {availableDates.map((item) => (
                    <option key={item.date} value={item.date}>
                      {item.display}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">{availableDates.length} período(s) disponível(is)</small>
            <Button variant="outline-secondary" size="sm" onClick={resetRange}>
              Resetar
            </Button>
          </div>
        </Card.Body>
      )}
    </Card>
  )
}

export default DateRangeFilter
