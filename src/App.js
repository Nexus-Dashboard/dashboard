// App.js
import { BrowserRouter as Router } from "react-router-dom"
import Routers from "./routes/Routers"
import "bootstrap/dist/css/bootstrap.min.css"
import { PresentationModeManager } from "./components/PresentationModeManager"

function App() {
  return (
    <Router>
      <PresentationModeManager />
      <Routers />
    </Router>
  )
}

export default App
