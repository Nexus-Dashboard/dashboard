"use client"

import { useState } from "react"
import { Container, Row, Col, Card, Button, Image } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { Phone, Users, Settings, Upload } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import "./SurveyTypePage.css"

export default function SurveyTypePage() {
  const navigate = useNavigate()
  const { logout, isAdmin } = useAuth()
  const [selectedType, setSelectedType] = useState(null)

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    navigate(`/themes/${type}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleUserManagement = () => {
    navigate("/admin/users")
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
            <Image src="/governo-federal-logo.png" alt="Governo Federal" className="gov-logo" />
            <h1 className="main-title">Selecione o Tipo de Pesquisa</h1>
            <p className="main-description">Escolha o tipo de pesquisa que deseja visualizar</p>
          </div>

          <Row className="survey-type-cards">
            <Col lg={4} md={6} className="mb-4">
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

            <Col lg={4} md={6} className="mb-4">
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

            <Col lg={4} md={6} className="mb-4">
              <Card className={`survey-type-card upload-card`} onClick={() => navigate("/upload")}>
                <Card.Body>
                  <div className="card-icon upload-icon" style={{ background: "rgb(0, 0, 0)", color: "white" }}>
                    <Upload size={48} />
                  </div>
                  <Card.Title className="card-title">Upload de Dados</Card.Title>
                  <Card.Text className="card-description">
                    Envie novas pesquisas e dicionários de variáveis para o sistema.
                  </Card.Text>
                  <Button variant="dark" className="select-button">
                    Acessar
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Card de Administração - Visível apenas para admins */}
            {isAdmin() && (
              <Col lg={4} md={6} className="mb-4">
                <Card className="survey-type-card admin-card" onClick={handleUserManagement}>
                  <Card.Body>
                    <div className="card-icon admin-icon">
                      <Settings size={48} />
                    </div>
                    <Card.Title className="card-title">Gerenciar Usuários</Card.Title>
                    <Card.Text className="card-description">
                      Administrar usuários, permissões e acessos do sistema
                    </Card.Text>
                    <Button variant="dark" className="select-button">
                      Acessar
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            )}
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
