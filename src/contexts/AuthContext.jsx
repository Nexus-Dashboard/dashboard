"use client"

import { createContext, useContext, useState, useEffect } from "react"
import ApiBase from "../service/ApiBase"
import axios from "axios"

const AuthContext = createContext(undefined)

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

  const login = async (email, password) => {
    try {
      const response = await ApiBase.post("/api/auth/login", { email, password })

      if (response.data && response.data.success) {
        const { token, user: userData } = response.data
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
      const response = await ApiBase.post("/api/auth/register", userData)

      if (response.data && response.data.success) {
        const { token, user: newUser } = response.data
        setUser(newUser)
        localStorage.setItem("user", JSON.stringify(newUser))
        localStorage.setItem("token", token)
        return newUser
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

      // 2. Enviar as informações para a sua API para obter um token de sessão
      const apiResponse = await ApiBase.post("/api/auth/google", {
        email,
        name,
        picture,
      })

      if (apiResponse.data && apiResponse.data.success) {
        const { token, user: userData } = apiResponse.data
        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("token", token)
        return userData
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
        const simulatedUser = {
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          picture: googleUserInfo.picture,
          role: "user",
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

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
