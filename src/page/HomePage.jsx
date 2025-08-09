"use client"

import { useState, useEffect, useCallback } from "react"
import { Container, Row, Col, Card, Button, Form, InputGroup, Spinner } from "react-bootstrap"
import { useNavigate, useParams } from "react-router-dom"
import { Folder, Search, ArrowLeft, Filter } from "lucide-react"
import ApiBase from "../service/ApiBase"
import CommonHeader from "../components/CommonHeader"
import "./HomePage.css"

export default function HomePage() {
  const navigate = useNavigate()
  const { surveyType } = useParams()

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

        // Construir parâmetros da requisição baseado no tipo de pesquisa
        const params = {}
        if (surveyType === "f2f") {
          params.type = "f2f"
        } else if (surveyType === "telefonica") {
          params.type = "telephonic"
        }

        const response = await ApiBase.get("/api/data/themes", { params })

        if (response.data && response.data.success) {
          const fetchedThemes = response.data.themes

          // Processar os temas vindos da API
          const processedThemes = fetchedThemes.map((theme) => {
            let themeName = theme.theme

            // Mapear temas de popularidade para "Avaliação do Governo" baseado no tipo de pesquisa
            if (surveyType === "f2f" && theme.theme === "Popularidade Face a Face") {
              themeName = "Avaliação do Governo"
            } else if (surveyType === "telefonica" && theme.theme === "Popularidade tracking") {
              themeName = "Avaliação do Governo"
            }

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
            return a.theme.localeCompare(b.theme, "pt-BR")
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
  }, [surveyType])

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

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedRound("")
  }

  const getSurveyTypeTitle = () => {
    return surveyType === "telefonica" ? "Pesquisas Telefônicas" : "Pesquisas Face-to-Face"
  }
  
  const handleBack = useCallback(() => navigate(-1), [navigate])

  return (
    <div className="home-page-wrapper">
      <CommonHeader />

      <main className="content-area">
        <Container>
          <div className="page-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="page-title">{getSurveyTypeTitle()}</h1>
                <p className="page-description">
                  {loading
                    ? "Carregando temas disponíveis..."
                    : `Explore ${filteredThemes.length} temas de pesquisa disponíveis`}
                </p>
              </div>
              <Button variant="outline-secondary" onClick={handleBack} className="back-button">
                  <ArrowLeft size={16} className="me-2" />
                  Voltar
              </Button>
            </div>
            
          </div>

          {/* Filters Card */}
          <Card className="filters-card">
            <Card.Body>
              
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
                    <Form.Select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)}>
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