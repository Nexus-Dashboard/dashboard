import { Routes, Route } from "react-router-dom"
import SurveyDashboard from "../components/SurveyDashboard"
import Upload from "../page/upload"
import TimelinePage from "../page/TimelinePage"

const Routers = () => (
  <Routes>
    <Route path="/" element={<SurveyDashboard />} />
    <Route path="/upload" element={<Upload />} />
    <Route path="/teste" element={<TimelinePage />} />
  </Routes>
)

export default Routers
