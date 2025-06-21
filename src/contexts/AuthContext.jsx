"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { jwtDecode } from "jwt-decode"

const AuthContext = createContext(undefined)

// Emails específicos autorizados
const AUTHORIZED_EMAILS = [  
  "vitor.checkmedia@gmail.com",
  "marcosvitor1994@gmail.com"
]

// Domínios autorizados (permite qualquer email desses domínios)
const AUTHORIZED_DOMAINS = [
  "naccom.com.br",
  "bb.com.br",
  "nmbb.com.br",
  // Adicione aqui os domínios corporativos da Secom/PR
  "secom.gov.br",
  "presidencia.gov.br",
]

// Função para verificar se o email está autorizado
const isEmailAuthorized = (email) => {
  // Verifica se o email está na lista específica
  if (AUTHORIZED_EMAILS.includes(email)) {
    return true
  }

  // Verifica se o domínio do email está autorizado
  const domain = email.split("@")[1]
  return AUTHORIZED_DOMAINS.includes(domain)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há um usuário salvo no localStorage
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error("Erro ao carregar usuário salvo:", error)
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  const login = (credential) => {
    try {
      const decoded = jwtDecode(credential)

      console.log("Token decodificado:", decoded) // Para debug

      const userData = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        sub: decoded.sub,
      }

      console.log("Dados do usuário:", userData) // Para debug

      if (isEmailAuthorized(userData.email)) {
        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("token", credential)
      } else {
        alert("Seu e-mail não está autorizado a acessar este sistema. Por favor, use uma conta autorizada.")
        console.warn("Tentativa de login com e-mail não autorizado:", userData.email)
        // Opcional: Limpar qualquer estado de login parcial
        setUser(null)
        localStorage.removeItem("user")
        localStorage.removeItem("token")
      }
    } catch (error) {
      console.error("Erro ao decodificar token:", error)
      alert("Erro ao processar o login. Tente novamente.")
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
  }

  const isAuthenticated = !!user
  const isAuthorized = user ? isEmailAuthorized(user.email) : false

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthorized,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
