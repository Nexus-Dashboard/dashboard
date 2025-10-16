import React from 'react';
import { Box, Typography, CircularProgress, LinearProgress } from "@mui/material";

export default function LoadingWithProgress({ loadingProgress = 0, loadingStage = "" }) {
  // ✅ Removido o reload automático (F5) que estava causando recarregamento da página
  return (
    <Box className="loading-container">
      <CircularProgress size={80} sx={{ mb: 3, color: "#1976d2" }} />
      <Typography variant="h5" color="text.primary" sx={{ mb: 2, fontWeight: 600 }}>
        Carregando Dados da Pergunta
      </Typography>

      {/* ... o resto do seu JSX ... */}

      <Box sx={{ width: "100%", maxWidth: "500px", mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {loadingStage}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {Math.round(loadingProgress)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={loadingProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: "#e3f2fd",
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
              background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
            },
          }}
        />
      </Box>

      <Box sx={{ width: "100%", maxWidth: "500px" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
          Progresso das Etapas:
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { step: "Conectando com a API", threshold: 15 },
            { step: "Buscando dados agrupados", threshold: 40 },
            { step: "Carregando informações de datas", threshold: 70 },
            { step: "Processando dados históricos", threshold: 95 },
            { step: "Finalizando carregamento", threshold: 100 },
          ].map((item, index) => (
            <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: loadingProgress >= item.threshold ? "#4caf50" : "#e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loadingProgress >= item.threshold && (
                  <Typography sx={{ color: "white", fontSize: "10px" }}>✓</Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: loadingProgress >= item.threshold ? "success.main" : "text.secondary",
                  fontWeight: loadingProgress >= item.threshold ? 600 : 400,
                }}
              >
                {item.step}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
        Processando dados históricos e demográficos agrupados...
      </Typography>
    </Box>
  )
}