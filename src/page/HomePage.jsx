"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Image, Spinner, Form, InputGroup } from "react-bootstrap"
import { useNavigate, useParams } from "react-router-dom"
import { Folder, ChevronRight, Search, ArrowLeft, Filter, X } from "lucide-react"
import ApiBase from "../service/ApiBase"
import { useAuth } from "../contexts/AuthContext"
import "./HomePage.css"

export default function HomePage() {
  const navigate = useNavigate()
  const { surveyType } = useParams()
  const { logout } = useAuth()

  const [themes, setThemes] = useState([])
  const [filteredThemes, setFilteredThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRound, setSelectedRound] = useState("")
  const [availableRounds, setAvailableRounds] = useState([])

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await ApiBase.get("/api/data/themes")

        if (response.data && response.data.success) {
          const fetchedThemes = response.data.themes

          // Processar os temas vindos da API
          const processedThemes = fetchedThemes.map((theme) => {
            // Renomear "Popularidade tracking" para "Avaliação do Governo"
            const themeName = theme.theme === "Popularidade tracking" ? "Avaliação do Governo" : theme.theme

            return {
              ...theme,
              theme: themeName,
              rounds: theme.Rodadas || [], // Usar o campo Rodadas da API
              id: theme.id || theme.slug,
            }
          })

          // Separar "Avaliação do Governo" dos demais temas
          const avaliacaoIndex = processedThemes.findIndex((t) => t.theme === "Avaliação do Governo")
          let avaliacaoTheme = null
          let otherThemes = processedThemes

          if (avaliacaoIndex > -1) {
            avaliacaoTheme = processedThemes[avaliacaoIndex]
            otherThemes = processedThemes.filter((_, index) => index !== avaliacaoIndex)
          }

          // Ordenar os demais temas por quantidade de rodadas (decrescente) e depois por nome
          otherThemes.sort((a, b) => {
            const roundsCountA = a.rounds.length
            const roundsCountB = b.rounds.length
            
            // Primeiro critério: quantidade de rodadas (decrescente)
            if (roundsCountB !== roundsCountA) {
              return roundsCountB - roundsCountA
            }
            
            // Segundo critério: ordem alfabética
            return a.theme.localeCompare(b.theme, 'pt-BR')
          })

          // Recompor a lista final com "Avaliação do Governo" no topo
          const finalThemes = avaliacaoTheme ? [avaliacaoTheme, ...otherThemes] : otherThemes

          // Extrair todas as rodadas disponíveis
          const allRounds = new Set()
          finalThemes.forEach((theme) => {
            theme.rounds.forEach((round) => allRounds.add(round))
          })
          const sortedRounds = Array.from(allRounds).sort((a, b) => b - a)

          setThemes(finalThemes)
          setFilteredThemes(finalThemes)
          setAvailableRounds(sortedRounds)
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

  useEffect(() => {
    let filtered = themes

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((theme) => theme.theme.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Filter by specific round
    if (selectedRound) {
      filtered = filtered.filter((theme) => theme.rounds.includes(Number.parseInt(selectedRound)))
    }

    setFilteredThemes(filtered)
  }, [themes, searchTerm, selectedRound])

  const handleThemeClick = (theme) => {
    navigate(`/theme/${surveyType}/${theme.slug}`)
  }

  const handleBackClick = () => {
    navigate("/")
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedRound("")
  }

  const getSurveyTypeTitle = () => {
    return surveyType === "telefonica" ? "Pesquisas Telefônicas" : "Pesquisas Face-to-Face"
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
          <div className="page-header">
            <Button variant="outline-secondary" size="sm" onClick={handleBackClick} className="back-button">
              <ArrowLeft size={16} className="me-2" />
              Voltar para Tipos de Pesquisa
            </Button>
            <h1 className="page-title">{getSurveyTypeTitle()}</h1>
            <p className="page-description">
              {loading
                ? "Carregando temas disponíveis..."
                : `Explore ${filteredThemes.length} temas de pesquisa disponíveis`}
            </p>
          </div>

          
          {/* Filters Card - CORRIGIDO */}
          <Card className="filters-card">
            <Card.Body>
              <div className="filters-header">
                <Filter size={20} className="text-primary" />
                <h6>Filtros de Busca</h6>
              </div>
              
              <div className="filters-row">
                <div className="filter-search">
                  <Form.Group>
                    <Form.Label>Buscar tema</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <Search size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </div>
                
                <div className="filter-round">
                  <Form.Group>
                    <Form.Label>Filtrar por rodada</Form.Label>
                    <Form.Select 
                      value={selectedRound} 
                      onChange={(e) => setSelectedRound(e.target.value)}
                    >
                      <option value="">Todas as rodadas</option>
                      {availableRounds.map((round) => (
                        <option key={round} value={round}>
                          Rodada {round}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
                
                <div className="filter-clear">
                  <Form.Label>&nbsp;</Form.Label>
                  <Button
                    variant="outline-secondary"
                    onClick={handleClearFilters}
                    className="clear-filters-btn d-block w-100"
                    disabled={!searchTerm && !selectedRound}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {loading && (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Carregando temas disponíveis...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <p className="mb-0">{error}</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={handleBackClick}>
                Voltar ao Início
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="themes-grid">
              <div className="themes-header mb-3">
                <h5 className="mb-0">
                  {filteredThemes.length} tema{filteredThemes.length !== 1 ? "s" : ""} encontrado
                  {filteredThemes.length !== 1 ? "s" : ""}
                  {selectedRound && ` na rodada ${selectedRound}`}
                </h5>
              </div>

              {filteredThemes.length === 0 ? (
                <div className="empty-state">
                  <Search size={48} className="text-muted mb-3" />
                  <h4 className="text-muted">Nenhum tema encontrado</h4>
                  <p className="text-muted">Tente ajustar os filtros ou termos de busca.</p>
                </div>
              ) : (
                <Row className="g-4">
                  {filteredThemes.map((theme) => (
                    <Col key={theme.id} lg={4} md={6}>
                      <Card className="theme-card" onClick={() => handleThemeClick(theme)}>
                        <Card.Body>
                          <div className="theme-icon-wrapper">
                            <Folder size={24} color="white" />
                          </div>

                          <div className="flex-grow-1">
                            <h5 className="theme-card-title">{theme.theme}</h5>
                            <p className="theme-card-description">
                              Análise detalhada de dados relacionados a {theme.theme.toLowerCase()}
                            </p>
                          </div>

                          <div className="theme-footer">
                            
                            <Button variant="dark" size="sm" className="view-analysis-btn w-100">
                              Ver Análises
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          )}
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p>Dados atualizados em tempo real • Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}