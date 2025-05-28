"use client"
import { Button, ButtonGroup, OverlayTrigger, Tooltip } from "react-bootstrap"
import { Download, FileEarmarkPdf } from "react-bootstrap-icons"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const ExportButtons = ({ chartData, questionLabel, chartRef }) => {
  const downloadCSV = () => {
    if (!chartData || chartData.length === 0) return

    let csvContent = "data:text/csv;charset=utf-8,"

    // Add question as first row
    csvContent += `"${questionLabel}"\r\n`

    // Handle line chart data
    if (chartData[0].data) {
      // Add headers (date + all series)
      csvContent += "Data,"
      csvContent += chartData.map((series) => `"${series.id}"`).join(",")
      csvContent += "\r\n"

      // Get all unique dates
      const allDates = new Set()
      chartData.forEach((series) => {
        series.data.forEach((point) => allDates.add(point.x))
      })

      // Sort dates
      const sortedDates = Array.from(allDates).sort()

      // Add data rows
      sortedDates.forEach((date) => {
        let row = `"${date}",`

        chartData.forEach((series) => {
          const point = series.data.find((p) => p.x === date)
          row += `${point ? point.y : 0},`
        })

        csvContent += row.slice(0, -1) + "\r\n" // Remove trailing comma
      })
    }

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${questionLabel.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`)
    document.body.appendChild(link)

    // Trigger download
    link.click()

    // Clean up
    document.body.removeChild(link)
  }

  const downloadPDF = async () => {
    if (!chartRef?.current) return

    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF("l", "mm", "a4") // landscape orientation

      // Add title
      pdf.setFontSize(16)
      pdf.setFont(undefined, "bold")
      pdf.text("Dashboard de Pesquisas", 20, 20)

      pdf.setFontSize(12)
      pdf.setFont(undefined, "normal")
      pdf.text(questionLabel, 20, 30)

      // Add current date
      pdf.setFontSize(10)
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 40)

      // Capture the chart area
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")

      // Calculate dimensions to fit the page
      const imgWidth = 250 // A4 landscape width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add the chart image
      pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight)

      // Add footer
      const pageHeight = pdf.internal.pageSize.height
      pdf.setFontSize(8)
      pdf.text("Dashboard de Pesquisas - Relatório Exportado", 20, pageHeight - 10)

      // Save the PDF
      pdf.save(`dashboard_${questionLabel.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      alert("Erro ao gerar PDF. Tente novamente.")
    }
  }

  return (
    <ButtonGroup size="sm">
      <OverlayTrigger placement="top" overlay={<Tooltip>Exportar dados em CSV</Tooltip>}>
        <Button variant="outline-primary" onClick={downloadCSV}>
          <Download className="me-1" />
          CSV
        </Button>
      </OverlayTrigger>

      <OverlayTrigger placement="top" overlay={<Tooltip>Exportar gráfico em PDF</Tooltip>}>
        <Button variant="outline-danger" onClick={downloadPDF}>
          <FileEarmarkPdf className="me-1" />
          PDF
        </Button>
      </OverlayTrigger>
    </ButtonGroup>
  )
}

export default ExportButtons
