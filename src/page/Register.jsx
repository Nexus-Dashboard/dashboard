"use client"

import { useState } from "react"
import { Card, Form, Button, Image, Alert } from "react-bootstrap"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeSlash } from "react-bootstrap-icons"
import ApiBase from "../service/ApiBase"
import "./Login.css"

const Register = () => {
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
      // Enviar dados exatamente como a API espera
      const requestData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "user", // Definir role padrão como 'user'
      }

      console.log("Enviando dados para registro:", { ...requestData, password: "[HIDDEN]" })

      const response = await ApiBase.post("/api/auth/register", requestData)

      console.log("Resposta do registro:", response.data)

      if (response.data.success) {
        setSuccess("Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.")
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        })

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate("/login")
        }, 3000)
      } else {
        setError(response.data.message || "Erro ao realizar cadastro")
      }
    } catch (err) {
      console.error("Erro no cadastro:", err)

      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.errors) {
        // Se houver erros de validação específicos
        setError(err.response.data.errors.join(", "))
      } else if (err.response?.status === 400) {
        if (err.response.data?.message?.includes("já existe")) {
          setError("Este email já está cadastrado no sistema")
        } else {
          setError("Dados inválidos. Verifique as informações e tente novamente.")
        }
      } else if (err.response?.status === 409) {
        setError("Email já está em uso")
      } else if (err.response?.status === 500) {
        setError("Erro interno do servidor. Tente novamente mais tarde.")
      } else {
        setError("Erro ao realizar cadastro. Verifique sua conexão e tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

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
