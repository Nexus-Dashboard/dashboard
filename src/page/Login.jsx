"use client"

import React, { useState } from "react"
import { Card, Form, Button, Image, Alert } from "react-bootstrap"
import { useGoogleLogin } from "@react-oauth/google"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeSlash } from "react-bootstrap-icons"
import "./Login.css"

const Login = () => {
  const { login, loginWithGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      // Login com email/senha é verificado pela API, não precisa verificar email autorizado aqui
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Email ou senha inválidos.")
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError("")
      try {
        // Login com Google verifica emails autorizados no AuthContext
        await loginWithGoogle(tokenResponse.access_token)
        navigate("/", { replace: true })
      } catch (err) {
        setError(err.message || "Falha na autenticação com o Google.")
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setError("Erro ao fazer login com o Google. Por favor, tente novamente.")
    },
  })

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="login-page">
      <Image src="/governo-federal-logo.png" alt="Governo Federal" className="login-logo-gov" />
      <Card className="login-card">
        <Card.Body>
          <h2>Dashboard pesquisas de opinião pública</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleEmailPasswordLogin} className="login-form">
            <Form.Group controlId="formBasicEmail">
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            <br />

            <Form.Group controlId="formBasicPassword">
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <div className="password-toggle-icon" onClick={() => !loading && setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </Form.Group>
            <br />

            <Button variant="primary" type="submit" className="login-btn" disabled={loading}>
              {loading ? <div className="spinner-dot"></div> : "Login"}
            </Button>
          </Form>

          <div className="divider">ou</div>

          <Button onClick={() => googleLogin()} variant="light" className="google-login-btn" disabled={loading}>
            <Image src="/google-icon.png" alt="Google icon" className="google-icon" />
            Fazer Login com o Google
          </Button>

          <div className="register-link">
            <Link to="/register" className="back-to-login-link">
              Não possui uma conta? Cadastre-se
            </Link>
          </div>

          <div className="nexus-logo-container">
            <Image src="/nexus-logo.png" alt="Nexus Logo" className="login-logo-nexus" />
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default Login
