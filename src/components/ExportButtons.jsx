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

  const buttonStyles = {
    container: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    csvButton: {
      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(40, 167, 69, 0.25)',
      cursor: 'pointer'
    },
    pdfButton: {
      background: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(220, 53, 69, 0.25)',
      cursor: 'pointer'
    },
    icon: {
      fontSize: '16px'
    }
  }

  const customTooltipStyle = {
    backgroundColor: '#2c3e50',
    color: '#ffffff',
    fontSize: '12px',
    borderRadius: '6px',
    padding: '6px 10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }

  return (
    <div style={buttonStyles.container}>
      <OverlayTrigger 
        placement="top" 
        overlay={
          <Tooltip style={customTooltipStyle}>
            Exportar dados em formato CSV
          </Tooltip>
        }
      >
        <button
          style={buttonStyles.csvButton}
          onClick={downloadCSV}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.25)'
          }}
        >
          <Download style={buttonStyles.icon} />
          <span>Exportar CSV</span>
        </button>
      </OverlayTrigger>

      <OverlayTrigger 
        placement="top" 
        overlay={
          <Tooltip style={customTooltipStyle}>
            Exportar gráfico em formato PDF
          </Tooltip>
        }
      >
        <button
          style={buttonStyles.pdfButton}
          onClick={downloadPDF}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.25)'
          }}
        >
          <FileEarmarkPdf style={buttonStyles.icon} />
          <span>Exportar PDF</span>
        </button>
      </OverlayTrigger>
    </div>
  )
}

export default ExportButtons