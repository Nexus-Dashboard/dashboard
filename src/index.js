import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"
import "bootstrap/dist/css/bootstrap.min.css"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from "./contexts/AuthContext"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId="817600868083-2nmpbvf4emg6a21hrl4esjjo5g3ohepv.apps.googleusercontent.com">
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

reportWebVitals()
