"use client"

import React, { useState } from "react"
import { Card, Form, Button, Image, Alert } from "react-bootstrap"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeSlash } from "react-bootstrap-icons"
import "./Login.css"

const Register = () => {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório")
      return false
    }
    if (!formData.email.trim()) {
      setError("Email é obrigatório")
      return false
    }
    if (formData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      setSuccess("Cadastro realizado com sucesso! Redirecionando...")
      setTimeout(() => {
        navigate("/home", { replace: true })
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao realizar cadastro. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="login-page">
      <Image src="/governo-federal-logo.png" alt="Governo Federal" className="login-logo-gov" />
      <Card className="login-card">
        <Card.Body>
          <h2>Cadastro no sistema de pesquisas de opinião pública</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit} className="login-form">
            <Form.Group controlId="formBasicName">
              <Form.Control
                type="text"
                placeholder="Nome completo"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </Form.Group>
            <br />

            <Form.Group controlId="formBasicEmail">
              <Form.Control
                type="email"
                placeholder="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </Form.Group>
            <br />

            <Form.Group controlId="formBasicPassword">
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha (mínimo 6 caracteres)"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <div className="password-toggle-icon" onClick={() => !loading && setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </Form.Group>
            <br />

            <Form.Group controlId="formBasicConfirmPassword">
              <div className="password-input-container">
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar senha"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <div
                  className="password-toggle-icon"
                  onClick={() => !loading && setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </Form.Group>
            <br />

            <Button variant="primary" type="submit" className="login-btn" disabled={loading}>
              {loading ? <div className="spinner-dot"></div> : "Cadastrar"}
            </Button>
          </Form>

          <div className="divider">ou</div>

          <div className="register-link">
            <Link to="/login" className="back-to-login-link">
              Já possui uma conta? Fazer login
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

export default Register
