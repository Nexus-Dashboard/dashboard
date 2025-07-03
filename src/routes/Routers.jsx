"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "../page/HomePage"
import Upload from "../page/upload"
import Dashboard from "../page/Dashboard" // Import the correct Dashboard component
import Login from "../page/Login"
import Register from "../page/Register"
import { useAuth } from "../contexts/AuthContext"
import ThemeQuestionsPage from "../page/ThemeQuestionsPage"

// Componente de Rota Protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

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
          <HomePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/home"
      element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/theme/:themeSlug"
      element={
        <ProtectedRoute>
          <ThemeQuestionsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard" // Changed from /dashboard/:questionCode
      element={
        <ProtectedRoute>
          <Dashboard />
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
