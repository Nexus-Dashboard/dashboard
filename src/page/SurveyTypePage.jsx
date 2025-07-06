"use client"
import { Container, Row, Col, Card, Button, Image } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { Phone, Users, BarChart3 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import "./SurveyTypePage.css"

const SURVEY_TYPES = [
  {
    id: "telefonica",
    title: "Pesquisas Telefônicas",
    description: "Pesquisas realizadas por meio de entrevistas telefônicas",
    icon: Phone,
    color: "#1e40af",
  },
  {
    id: "f2f",
    title: "Pesquisas F2F",
    description: "Pesquisas Face a Face realizadas presencialmente",
    icon: Users,
    color: "#059669",
  },
]

export default function SurveyTypePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleSurveyTypeClick = (surveyType) => {
    // Navega para a página de temas passando o tipo de pesquisa
    navigate(`/themes/${surveyType.id}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="survey-type-page-wrapper">
      <header className="main-header">
        <Container className="d-flex justify-content-between align-items-center">
          <Image src="/nexus-logo.png" alt="Nexus Logo" className="header-logo-nexus" />
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </Container>
      </header>

      <main className="content-area">
        <Container>
          <div className="page-title-section">
            <Image src="governo-federal-logo.png" alt="Governo Federal" className="gov-logo" />
            <h1 className="main-title">PESQUISAS DE OPINIÃO PÚBLICA</h1>
            <h2 className="main-subtitle">Selecione o Tipo de Pesquisa</h2>
            <p className="main-description">Escolha entre pesquisas telefônicas ou face a face para análise</p>
          </div>

          <Row className="g-4 justify-content-center">
            {SURVEY_TYPES.map((surveyType) => {
              const IconComponent = surveyType.icon
              return (
                <Col key={surveyType.id} lg={5} md={6} sm={12}>
                  <Card
                    className="survey-type-card"
                    onClick={() => handleSurveyTypeClick(surveyType)}
                    style={{ "--card-color": surveyType.color }}
                  >
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                      <div className="survey-type-icon-wrapper">
                        <IconComponent size={48} color="white" />
                      </div>
                      <h3 className="survey-type-card-title">{surveyType.title}</h3>
                      <p className="survey-type-card-description">{surveyType.description}</p>
                      <Button variant="dark" size="sm" className="view-themes-btn">
                        <BarChart3 size={14} className="me-2" />
                        Ver Temas
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Container>
      </main>

      <footer className="page-footer">
        <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
      </footer>
    </div>
  )
}
