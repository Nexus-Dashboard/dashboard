import { Link, useLocation } from "react-router-dom"
import { Navbar, Nav, Container } from "react-bootstrap"
import "./Navigation.css"

const Navigation = () => {
  const location = useLocation()

  return (
    <Navbar bg="white" expand="lg" className="app-navbar">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="brand">
          Dashboard SECOM
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={location.pathname === "/" ? "active" : ""}>
              Dashboard Principal
            </Nav.Link>
            <Nav.Link as={Link} to="/timeline" className={location.pathname === "/timeline" ? "active" : ""}>
              Linha do Tempo
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation
