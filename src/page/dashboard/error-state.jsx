"use client"
import { Box, Typography, Button } from "@mui/material"

export default function ErrorState({ title, message, onRetry }) {
  return (
    <Box className="error-container">
      <Typography variant="h5" color="error" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="contained" onClick={onRetry} sx={{ mt: 2 }}>
          Tentar Novamente
        </Button>
      )}
    </Box>
  )
}
