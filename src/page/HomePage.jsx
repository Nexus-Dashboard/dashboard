"use client"

import { useState } from "react"
import { Container, Row, Col, Card } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { BarChart3, Users, Heart, GraduationCap, Shield, Building2, TrendingUp, FileText } from "lucide-react"

// Dados mockados dos temas - no futuro virão da API
const TEMAS_PESQUISA = [
  {
    id: "avaliacao-governo",
    titulo: "Avaliação de Governo",
    descricao: "Aprovação e desempenho governamental",
    icon: Building2,
    cor: "#000000",
    rota: "/dashboard/avaliacao-governo",
  },
  {
    id: "saude",
    titulo: "Saúde",
    descricao: "Sistema de saúde e políticas públicas",
    icon: Heart,
    cor: "#000000",
    rota: "/dashboard/saude",
  },
  {
    id: "educacao",
    titulo: "Educação",
    descricao: "Ensino público e qualidade educacional",
    icon: GraduationCap,
    cor: "#000000",
    rota: "/dashboard/educacao",
  },
  {
    id: "seguranca",
    titulo: "Segurança",
    descricao: "Segurança pública e criminalidade",
    icon: Shield,
    cor: "#000000",
    rota: "/dashboard/seguranca",
  },
  {
    id: "economia",
    titulo: "Economia",
    descricao: "Situação econômica e emprego",
    icon: TrendingUp,
    cor: "#000000",
    rota: "/dashboard/economia",
  },
  {
    id: "demografico",
    titulo: "Perfil Demográfico",
    descricao: "Análise demográfica dos entrevistados",
    icon: Users,
    cor: "#000000",
    rota: "/dashboard/demografico",
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [temas] = useState(TEMAS_PESQUISA)

  const handleTemaClick = (tema) => {
    // Por enquanto, redireciona para o dashboard atual
    // No futuro, cada tema terá sua própria página
    navigate("/dashboard")
  }

  const cardStyle = {
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
    height: "280px",
  }

  const overlayStyle = (cor) => ({
    background: `linear-gradient(135deg, ${cor}ee 0%, ${cor}cc 100%)`,
    color: "white",
    padding: "24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
  })

  return (
    <Container fluid className="min-vh-100" style={{ backgroundColor: "#f8f9fa", paddingTop: "40px" }}>
      {/* Header */}
      <div className="text-center mb-5">
        <div className="d-flex justify-content-center align-items-center mb-3">
          <FileText size={48} className="text-primary me-3" />
          <h1
            className="mb-0"
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#1e293b",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            PESQUISAS DE OPINIÃO PÚBLICA
          </h1>
        </div>
        <div className="text-center">
          <p
            className="mb-1"
            style={{
              fontSize: "1.1rem",
              color: "#64748b",
              fontWeight: "500",
            }}
          >
            Secretaria de Comunicação Social da Presidência da República
          </p>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#94a3b8",
              fontWeight: "400",
            }}
          >
            Dashboard de Análise e Monitoramento - Governo Federal
          </p>
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center mb-4">
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#475569",
            marginBottom: "8px",
          }}
        >
          Selecione um Tema para Análise
        </h2>
        <p style={{ color: "#64748b", fontSize: "1rem" }}>
          Explore os dados das pesquisas organizados por área temática
        </p>
      </div>

      {/* Cards Grid */}
      <Row className="g-4 justify-content-center" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {temas.map((tema) => {
          const IconComponent = tema.icon
          return (
            <Col key={tema.id} lg={4} md={6} sm={12}>
              <Card
                style={cardStyle}
                onClick={() => handleTemaClick(tema)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)"
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08)"
                }}
              >
                <div style={overlayStyle(tema.cor)}>
                  {/* Icon */}
                  <div className="d-flex justify-content-center mb-3">
                    <div
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "50%",
                        padding: "16px",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <IconComponent size={40} color="white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: "700",
                        marginBottom: "12px",
                        textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {tema.titulo}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.95rem",
                        opacity: 0.9,
                        lineHeight: "1.4",
                        marginBottom: "0",
                      }}
                    >
                      {tema.descricao}
                    </p>
                  </div>

                  {/* Bottom indicator */}
                  <div className="text-center mt-3">
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                      }}
                    >
                      <BarChart3 size={16} className="me-2" />
                      Ver Análises
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* Footer info */}
      <div className="text-center mt-5 pb-4">
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR
        </p>
      </div>
    </Container>
  )
}
