"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Image, Spinner } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import {
  BarChart3,
  Users,
  Heart,
  GraduationCap,
  Shield,
  Building2,
  TrendingUp,
  FileText,
  Globe,
  CloudSun,
  Briefcase,
  Train,
  Palette,
  MessageSquare,
} from "lucide-react"
import ApiBase from "../service/ApiBase"
import { useAuth } from "../contexts/AuthContext"
import "./HomePage.css"

// Mapeamento de temas da API para ícones, descrições e títulos personalizados
const themeConfig = {
  "Popularidade tracking": {
    title: "Avaliação de Governo",
    description: "Aprovação e desempenho governamental",
    icon: Building2,
  },
  Saúde: {
    title: "Saúde",
    description: "Sistema de saúde e políticas públicas",
    icon: Heart,
  },
  Educação: {
    title: "Educação",
    description: "Ensino público e qualidade educacional",
    icon: GraduationCap,
  },
  "Segurança e Violência": {
    title: "Segurança",
    description: "Segurança pública e criminalidade",
    icon: Shield,
  },
  "Economia brasileira": {
    title: "Economia",
    description: "Situação econômica e emprego",
    icon: TrendingUp,
  },
  "Economia familiar": {
    title: "Economia Familiar",
    description: "Análise da situação econômica das famílias",
    icon: Users,
  },
  "Programas Sociais e Emprego": {
    title: "Programas Sociais",
    description: "Impacto e avaliação de programas sociais",
    icon: Briefcase,
  },
  "Meio Ambiente": {
    title: "Meio Ambiente",
    description: "Políticas de sustentabilidade e preservação",
    icon: CloudSun,
  },
  "Relações internacionais": {
    title: "Relações Internacionais",
    description: "Cenário e política externa",
    icon: Globe,
  },
  Transporte: {
    title: "Transporte",
    description: "Mobilidade urbana e infraestrutura",
    icon: Train,
  },
  "Cultura e Turismo": {
    title: "Cultura e Turismo",
    description: "Fomento e acesso à cultura e turismo",
    icon: Palette,
  },
  "Meios de Comunicação e Redes Sociais": {
    title: "Mídia e Redes Sociais",
    description: "Consumo de informação e tendências",
    icon: MessageSquare,
  },
  // Adicione outros mapeamentos conforme necessário
}

const defaultThemeConfig = {
  title: "Análise de Tema",
  description: "Explore os dados desta área temática",
  icon: FileText,
}

export default function HomePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [temas, setTemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setLoading(true)
        const response = await ApiBase.get("/api/data/themes")
        if (response.data && response.data.success) {
          const apiThemes = response.data.themes

          // Ordenar para que "Popularidade tracking" venha primeiro
          apiThemes.sort((a, b) => {
            if (a.theme === "Popularidade tracking") return -1
            if (b.theme === "Popularidade tracking") return 1
            return 0
          })

          // Mapear e enriquecer os dados dos temas
          const processedTemas = apiThemes.map((tema) => {
            const config = themeConfig[tema.theme] || defaultThemeConfig
            return {
              id: tema.slug, // Usar o slug como ID
              slug: tema.slug, // Manter o slug para a rota
              apiTheme: tema.theme,
              questionCount: tema.questionCount,
              ...config,
            }
          })
          setTemas(processedTemas)
        } else {
          setError("Não foi possível carregar os temas.")
        }
      } catch (err) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
        console.error("Erro ao buscar temas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchThemes()
  }, [])

  const handleTemaClick = (tema) => {
    // Navega para a nova página de perguntas, usando o slug do tema
    navigate(`/theme/${tema.slug}`)
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="home-page-wrapper">
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
            <h2 className="main-subtitle">Selecione um Tema para Análise</h2>
            <p className="main-description">Explore os dados das pesquisas organizados por área temática</p>
          </div>

          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando temas...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger text-center">
              <p className="mb-0">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <Row className="g-4 justify-content-center">
              {temas.map((tema) => {
                const IconComponent = tema.icon
                return (
                  <Col key={tema.id} lg={4} md={6} sm={12}>
                    <Card className="theme-card" onClick={() => handleTemaClick(tema)}>
                      <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                        <div className="theme-icon-wrapper">
                          <IconComponent size={32} color="white" />
                        </div>
                        <h3 className="theme-card-title">{tema.title}</h3>
                        <p className="theme-card-description">{tema.description}</p>
                        <Button variant="dark" size="sm" className="view-analysis-btn">
                          <BarChart3 size={14} className="me-2" />
                          Ver Análises
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
      </footer>
    </div>
  )
}
