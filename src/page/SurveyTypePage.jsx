"use client"

import { useState } from "react"
import { Container, Row, Col, Card, Button, Image } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { Phone, Users } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import "./SurveyTypePage.css"
import CommonHeader from "../components/CommonHeader"


export default function SurveyTypePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [selectedType, setSelectedType] = useState(null)

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    
    // Navegar diretamente para o tema específico de cada tipo
    if (type === 'telefonica') {
      navigate('/theme/telefonica/popularidade-tracking')
    } else if (type === 'f2f') {
      navigate('/theme/f2f/popularidade-face-a-face')
    }
  }

  return (
    <div className="survey-type-page-wrapper">
      <CommonHeader />

      <main className="content-area">
        <Container>
          <div className="page-title-section">
            <Image src="/governo-federal-logo.png" alt="Governo Federal" className="gov-logo" />
            <h1 className="main-title">Selecione o Tipo de Pesquisa</h1>
            <p className="main-description">Escolha o tipo de pesquisa que deseja visualizar</p>
          </div>

          {/* Cards centralizados quando não é admin */}
          <Row className={`survey-type-cards ${!isAdmin() ? 'justify-content-center' : ''}`}>
            {/* Card Telefônicas - SEMPRE VISÍVEL */}
            <Col lg={6} md={6} >
              <Card
                className={`survey-type-card telefonica ${selectedType === "telefonica" ? "selected" : ""}`}
                onClick={() => handleTypeSelect("telefonica")}
              >
                <Card.Body>
                  <div className="card-icon telefonica-icon">
                    <Phone size={48} />
                  </div>
                  <Card.Title className="card-title">Telefônicas</Card.Title>
                  <Card.Text className="card-description">
                    Pesquisas realizadas por meio de entrevistas telefônicas com a população
                  </Card.Text>
                  <Button variant="dark" className="select-button">
                    Selecionar
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Card F2F - OCULTO POR ENQUANTO */}
            {
            <Col lg={6} md={6} >
              <Card
                className={`survey-type-card f2f ${selectedType === "f2f" ? "selected" : ""}`}
                onClick={() => handleTypeSelect("f2f")}
              >
                <Card.Body>
                  <div className="card-icon f2f-icon">
                    <Users size={48} />
                  </div>
                  <Card.Title className="card-title">F2F (Face a Face)</Card.Title>
                  <Card.Text className="card-description">
                    Pesquisas realizadas através de entrevistas presenciais face a face
                  </Card.Text>
                  <Button variant="dark" className="select-button">
                    Selecionar
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            }
          </Row>
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <Row>
            <Col md={12} className="text-center">
              <p className="footer-text">Sistema de Pesquisas • Secom/PR</p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  )
}