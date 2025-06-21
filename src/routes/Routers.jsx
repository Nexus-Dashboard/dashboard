"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "../page/HomePage"
import Upload from "../page/upload"
import TimelinePage from "../page/TimelinePage"
import Login from "../page/Login"
import { useAuth } from "../contexts/AuthContext"

// Componente de Rota Protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthorized, loading } = useAuth()

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

  if (!isAuthorized) {
    return <Navigate to="/login" replace />
  }

  return children
}

const Routers = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
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
      path="/dashboard"
      element={
        <ProtectedRoute>
          <TimelinePage />
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
