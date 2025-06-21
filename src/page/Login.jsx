"use client"

import React from "react"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "../contexts/AuthContext"
import { BarChart3 } from "lucide-react"
import { useNavigate } from "react-router-dom"

const Login = () => {
  const { login, isAuthenticated, isAuthorized } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential)
    }
  }

  const handleError = () => {
    console.error("Erro no login com Google")
    alert("Erro ao fazer login com o Google. Por favor, tente novamente.")
  }

  // Se já estiver autenticado e autorizado, redireciona para a home
  React.useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      navigate("/home", { replace: true })
    }
  }, [isAuthenticated, isAuthorized, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: "url('/images/banner-background.webp')",
        }}
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
      </div>

      {/* Login Content */}
      <div className="relative z-10 max-w-md w-full mx-4">
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "12px",
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
            padding: "2.5rem",
            backdropFilter: "blur(5px)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#183EFF",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                color: "#333",
                marginBottom: "0.5rem",
                fontFamily: "Rawline, sans-serif",
              }}
            >
              Dashboard Secom/PR
            </h1>
            <p
              style={{
                color: "#666",
                fontSize: "1rem",
                fontFamily: "Rawline, sans-serif",
              }}
            >
              Acesse as pesquisas de opinião pública
            </p>
          </div>

          {/* Google Login Button */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p
              style={{
                fontSize: "0.75rem",
                color: "#888",
                fontFamily: "Rawline, sans-serif",
              }}
            >
              Apenas usuários com e-mails autorizados da Secom/PR podem acessar este sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
