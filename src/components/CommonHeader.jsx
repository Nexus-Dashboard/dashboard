"use client"

import { Container, Button, Image } from "react-bootstrap"
import { PlayFill } from "react-bootstrap-icons"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

const CommonHeader = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleStartPresentation = () => {
    // Simular inatividade para iniciar o modo apresentação
    // Dispara um evento de timeout no PresentationModeManager
    window.dispatchEvent(new Event('startPresentationMode'))
  }

  // Estilos inline para garantir consistência visual
  const headerStyles = {
    background: '#000000 !important',
    color: 'white',
    padding: '1rem 0',
    borderBottom: '1px solid #495057',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  }

  const logoStyles = {
    height: '40px',
    filter: 'brightness(0) invert(1)'
  }

  const buttonStyles = {
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: '0.5rem'
  }

  return (
    <header className="main-header" style={headerStyles}>
      <Container className="d-flex justify-content-between align-items-center">
        <Image 
          src="/nexus-logo.png" 
          alt="Nexus Logo" 
          className="header-logo-nexus" 
          style={logoStyles}
        />
        <div className="d-flex align-items-center gap-2">
          {/* Botão de Modo Apresentação */}
          <Button
            variant="outline-light"
            size="sm"
            onClick={handleStartPresentation}
            title="Iniciar modo apresentação"
            style={buttonStyles}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)'
              e.target.style.borderColor = 'rgba(255,255,255,0.5)'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)'
              e.target.style.borderColor = 'rgba(255,255,255,0.3)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <PlayFill className="me-1" />
            Apresentação
          </Button>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleLogout}
            style={buttonStyles}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)'
              e.target.style.borderColor = 'rgba(255,255,255,0.5)'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)'
              e.target.style.borderColor = 'rgba(255,255,255,0.3)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            Sair
          </Button>
        </div>       
      </Container>
    </header>
  )
}

export default CommonHeader