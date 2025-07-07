"use client"

import { createContext, useContext, useState, useEffect } from "react"
import ApiBase from "../service/ApiBase"
import axios from "axios"

const AuthContext = createContext(undefined)

// Lista de emails e domínios autorizados
const AUTHORIZED_EMAILS = [
  "marcosvitor1994@gmail.com",
  "vitor.checkmedia@gmail.com"  
]

const AUTHORIZED_DOMAINS = [
  "@presidencia.gov.br",
  "@nexus.com.br",
]

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    const savedToken = localStorage.getItem("token")

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error("Erro ao carregar usuário salvo:", error)
        logout()
      }
    }
    setLoading(false)
  }, [])

  // Função para verificar se o email é autorizado APENAS PARA GOOGLE
  const isEmailAuthorizedForGoogle = (email) => {
    if (!email) return false
    const emailLower = email.toLowerCase()

    // Verificar emails específicos
    if (AUTHORIZED_EMAILS.some((authorizedEmail) => authorizedEmail.toLowerCase() === emailLower)) {
      return true
    }

    // Verificar domínios
    return AUTHORIZED_DOMAINS.some((domain) => emailLower.endsWith(domain.toLowerCase()))
  }

  const login = async (email, password) => {
    try {
      const response = await ApiBase.post("/api/auth/login", { email, password })

      if (response.data && response.data.success) {
        const { token, user: userData } = response.data

        // Verificar se o usuário tem permissão para acessar
        if (!canAccessSystem(userData.role)) {
          throw new Error("Usuário não tem permissão para acessar o sistema. Aguarde aprovação do administrador.")
        }

        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("token", token)
        return userData
      } else {
        throw new Error(response.data.message || "Falha no login")
      }
    } catch (error) {
      console.error("Erro no login:", error)
      logout()
      throw error
    }
  }

  const register = async (userData) => {
    try {
      // Garantir que novos usuários sejam cadastrados como 'user'
      const registrationData = {
        ...userData,
        role: "user", // Forçar role como 'user' para novos cadastros
      }

      const response = await ApiBase.post("/api/auth/register", registrationData)

      if (response.data && response.data.success) {
        // Não fazer login automático para usuários 'user' - eles precisam de aprovação
        throw new Error("Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.")
      } else {
        throw new Error(response.data.message || "Falha no cadastro")
      }
    } catch (error) {
      console.error("Erro no cadastro:", error)
      throw error
    }
  }

  const loginWithGoogle = async (accessToken) => {
    try {
      // 1. Usar o access token para obter informações do usuário do Google
      const googleResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const { email, name, picture } = googleResponse.data

      // Verificar se o email do Google é autorizado
      if (!isEmailAuthorizedForGoogle(email)) {
        throw new Error("Email do Google não autorizado para acesso ao sistema. Entre em contato com o administrador.")
      }

      // 2. Enviar as informações para a sua API para obter um token de sessão
      const apiResponse = await ApiBase.post("/api/auth/google", {
        email,
        name,
        picture,
      })

      if (apiResponse.data && apiResponse.data.success) {
        const { token, user: userData } = apiResponse.data

        // Usuários do Google automaticamente recebem role 'viewer'
        const googleUser = {
          ...userData,
          role: userData.role || "viewer",
        }

        setUser(googleUser)
        localStorage.setItem("user", JSON.stringify(googleUser))
        localStorage.setItem("token", token)
        return googleUser
      } else {
        throw new Error(apiResponse.data.message || "Falha no login com Google")
      }
    } catch (error) {
      console.error("Erro no login com Google:", error)
      logout()
      // Fallback para desenvolvimento
      if (error.response && error.response.status === 404) {
        console.warn("Simulando login com Google pois a rota /api/auth/google não foi encontrada.")
        const googleUserInfo = (
          await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        ).data

        // Verificar se o email é autorizado mesmo no fallback
        if (!isEmailAuthorizedForGoogle(googleUserInfo.email)) {
          throw new Error(
            "Email do Google não autorizado para acesso ao sistema. Entre em contato com o administrador.",
          )
        }

        const simulatedUser = {
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          picture: googleUserInfo.picture,
          role: "viewer", // Usuários Google recebem role 'viewer'
        }
        setUser(simulatedUser)
        localStorage.setItem("user", JSON.stringify(simulatedUser))
        localStorage.setItem("token", "google-simulated-token")
        return simulatedUser
      }
      throw error.response?.data || new Error("Não foi possível autenticar com Google.")
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
  }

  // Função para verificar se o usuário pode acessar o sistema
  const canAccessSystem = (role) => {
    return ["admin", "viewer"].includes(role)
  }

  // Função para verificar se o usuário é admin
  const isAdmin = () => {
    return user?.role === "admin"
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        canAccessSystem,
        isEmailAuthorizedForGoogle, // Renomeado para deixar claro que é só para Google
        login,
        register,
        loginWithGoogle,
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
