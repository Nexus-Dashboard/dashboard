"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "../page/HomePage"
import Upload from "../page/upload"
import Dashboard from "../page/Dashboard"
import Login from "../page/Login"
import Register from "../page/Register"
import { useAuth } from "../contexts/AuthContext"
import ThemeQuestionsPage from "../page/ThemeQuestionsPage"
import SurveyTypePage from "../page/SurveyTypePage"
import UserManagementPage from "../page/UserManagementPage"

// Componente de Rota Protegida
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, canAccessSystem, isAdmin, user } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "20px",
          color: "#666",
        }}
      >
        Carregando autenticação...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Verificar se o usuário pode acessar o sistema
  if (!canAccessSystem(user?.role)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#666",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h3>Acesso Negado</h3>
        <p>Sua conta está aguardando aprovação do administrador.</p>
        <p>Entre em contato com o suporte para mais informações.</p>
        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = "/login"
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Fazer Login Novamente
        </button>
      </div>
    )
  }

  // Verificar se é rota apenas para admin
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />
  }

  return children
}

const Routers = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <SurveyTypePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/themes/:surveyType"
      element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/theme/:surveyType/:themeSlug"
      element={
        <ProtectedRoute>
          <ThemeQuestionsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute adminOnly={true}>
          <UserManagementPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/upload"
      element={
        <ProtectedRoute>
          <Upload />
        </ProtectedRoute>
      }
    />
  </Routes>
)

export default Routers
