import { Routes, Route } from "react-router-dom"
import Upload from "../page/upload"
import TimelinePage from "../page/TimelinePage"

const Routers = () => (
  <Routes>
    <Route path="/" element={<TimelinePage />} />
    <Route path="/home" element={<TimelinePage />} />
    <Route path="/upload" element={<Upload />} />
  </Routes>
)

export default Routers
