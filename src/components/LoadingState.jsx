import { Spinner, Container } from "react-bootstrap"

const LoadingState = ({ message = "Carregando dados...", subMessage = null }) => {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "300px" }}>
      <Spinner animation="border" role="status" variant="primary" />
      <p className="mt-3 text-muted">{message}</p>
      {subMessage && <p className="text-muted small">{subMessage}</p>}
    </Container>
  )
}

export default LoadingState
