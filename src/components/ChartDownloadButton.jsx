"use client"
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap"
import { Download } from "react-bootstrap-icons"

const ChartDownloadButton = ({ chartData, filename = "chart-data", questionLabel }) => {
  const downloadCSV = () => {
    // Format data for CSV
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add headers
    if (chartData && chartData.length > 0) {
      // Handle line chart data
      if (chartData[0].data) {
        // Add question as first row
        csvContent += `"${questionLabel}"\r\n`

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
      // Handle bar chart data
      else {
        // Add question as first row
        csvContent += `"${questionLabel}"\r\n`

        // Add headers
        csvContent += "Resposta,Percentual\r\n"

        // Add data rows
        chartData.forEach((item) => {
          csvContent += `"${item.response}",${item.percentage}\r\n`
        })
      }

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `${filename}.csv`)
      document.body.appendChild(link)

      // Trigger download
      link.click()

      // Clean up
      document.body.removeChild(link)
    }
  }

  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>Baixar dados em CSV</Tooltip>}>
      <Button variant="outline-secondary" size="sm" onClick={downloadCSV} className="chart-download-btn">
        <Download /> Exportar
      </Button>
    </OverlayTrigger>
  )
}

export default ChartDownloadButton
