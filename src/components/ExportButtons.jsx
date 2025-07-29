"use client"
import { Button } from "react-bootstrap"
import { Download, FileEarmarkPdf } from "react-bootstrap-icons"

const ExportButtons = ({ onExportCSV, onExportPDF, csvDisabled, pdfDisabled }) => {
  return (
    <div className="d-grid gap-2">
      <Button variant="success" onClick={onExportCSV} disabled={csvDisabled}>
        <Download className="me-2" />
        Exportar CSV
      </Button>
      <Button variant="danger" onClick={onExportPDF} disabled={pdfDisabled}>
        <FileEarmarkPdf className="me-2" />
        Exportar PDF
      </Button>
    </div>
  )
}

export default ExportButtons
