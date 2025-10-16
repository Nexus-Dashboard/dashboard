"use client"

import { IconButton, Button, Box } from "@mui/material"
import { Download, PictureAsPdf, Menu as MenuIcon, ArrowBack } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const DashboardHeader = ({ questionInfo, allHistoricalData, pageRef, onMenuClick }) => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  const downloadPDF = async () => {
    const element = pageRef.current
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#f8f9fa",
    })

    const pdf = new jsPDF("p", "mm", "a4")
    const imgData = canvas.toDataURL("image/png")
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(`dashboard-${questionInfo?.questionText.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`)
  }

  const downloadCSV = () => {
    if (!allHistoricalData || allHistoricalData.length === 0) return

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += `"${questionInfo?.questionText}"\r\n`

    const headers = ["Period", "Response", "WeightedCount", "Count", "TotalWeightedResponses", "TotalResponses"]
    csvContent += headers.join(",") + "\r\n"

    allHistoricalData.forEach((round) => {
      round.distribution.forEach((dist) => {
        const row = [
          round.period,
          `"${dist.response}"`,
          dist.weightedCount,
          dist.count,
          round.totalWeightedResponses,
          round.totalResponses,
        ].join(",")
        csvContent += row + "\r\n"
      })
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `data-${questionInfo?.questionText.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <header className="dashboard-header">
      <Box className="header-left">
        <IconButton color="inherit" onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>
        <h2>{questionInfo?.label || questionInfo?.questionText || "Dashboard"}</h2>
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" color="inherit" startIcon={<ArrowBack />} onClick={handleBack}>
          Voltar
        </Button>
        <Button variant="outlined" color="inherit" startIcon={<Download />} onClick={downloadCSV}>
          Exportar CSV
        </Button>
        <Button variant="contained" className="export-btn-pdf" startIcon={<PictureAsPdf />} onClick={downloadPDF}>
          Exportar PDF
        </Button>
      </Box>
    </header>
  )
}

export default DashboardHeader
