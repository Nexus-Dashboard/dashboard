"use client"

import { useState } from "react"
import SparkMD5 from "spark-md5"
import * as XLSX from "xlsx"
import ApiBase from "../service/ApiBase"
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, ProgressBar, Image } from "react-bootstrap"
import { CloudUpload, CheckCircle, FileEarmarkArrowUp, Book, ArrowLeft } from "react-bootstrap-icons"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import "./HomePage.css" // Reutilizando estilos

// Mapeamento para labels mais descritivos
const PRETTY_LABELS = {
  UF: "Estado",
  MUNIC: "Município",
  // Adicione outros mapeamentos diretos aqui se necessário
}

const LABEL_OVERRIDES = [
  { pattern: /cor(?: ou )?ra[çc]a/i, label: "Cor/Raça" },
  { pattern: /quantos anos/i, label: "Idade" },
  { pattern: /qual o seu grau de escolaridade/i, label: "Escolaridade" },
  { pattern: /desempenha algum trabalho remunerado/i, label: "Trabalho remunerado" },
  { pattern: /capital/i, label: "Capital ou Interior" },
  { pattern: /dataatualizacao/i, label: "Data" },
  { pattern: /duracao/i, label: "Duração" },
  { pattern: /horainicio/i, label: "Hora Início" },
  { pattern: /horafim/i, label: "Hora Fim" },
  { pattern: /avalia o desempenho do Governo/i, label: "Como você avalia o desempenho do Governo Federal?" },
  { pattern: /sexo/i, label: "Sexo" },
  { pattern: /classifica esse trabalho/i, label: "Tipo de emprego" },
  { pattern: /possui cnpj/i, label: "Possui CNPJ?" },
  { pattern: /voce e aposentado/i, label: "Situação ocupacional" },
  { pattern: /trinta dias/i, label: "Procurou emprego nos últimos 30 dias?" },
  { pattern: /bolsa familia/i, label: "Recebe Bolsa Família?" },
  { pattern: /religiao/i, label: "Religião" },
  { pattern: /considerando seus ganhos/i, label: "Renda individual" },
  { pattern: /somando a sua renda com a renda/i, label: "Renda Familiar" },
  { pattern: /vinculo formal/i, label: "CLT" },
  { pattern: /weights/i, label: "Peso" },
  { pattern: /uf/i, label: "Estado" },
  { pattern: /regiao/i, label: "Região" },
  {
    pattern: /e como voce avalia o desempenho do presidente/i,
    label: "E como voce avalia o desempenho do Presidente da Republica?",
  },
  {
    pattern: /na sua avaliacao, o desempenho/i,
    label:
      "E na sua avaliacao, o desempenho do Governo Federal e regular mais para positivo ou regular mais para negativo?",
  },
  {
    pattern: /e voce aprova ou desaprova o desempenho do governo federal/i,
    label: "E voce aprova ou desaprova o desempenho do governo federal?",
  },
]

function Upload() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [dataFile, setDataFile] = useState(null)
  const [dictFile, setDictFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" })
  const [progress, setProgress] = useState(0)

  const simulateProgress = () => {
    setProgress(0)
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer)
          return 100
        }
        return Math.min(old + Math.random() * 10, 95)
      })
    }, 300)
    return timer
  }

  const computeFileHash = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (e) => resolve(SparkMD5.ArrayBuffer.hash(e.target.result))
      reader.onerror = reject
    })

  const showAlert = (variant, message) => setAlert({ show: true, variant, message })

  const readExcel = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsBinaryString(file)
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
          const headerIdx = rows.findIndex((r) => r.map((c) => String(c).toLowerCase()).includes("identrevista"))
          if (headerIdx < 0) return reject(new Error("Coluna 'idEntrevista' não encontrada no arquivo de dados."))
          const header = rows[headerIdx].map((h) => String(h).trim())
          const data = rows.slice(headerIdx + 1).map((r) => {
            const obj = {}
            header.forEach((key, i) => {
              let cell = r[i]
              if (cell === "" || /^#null!?$/i.test(String(cell))) {
                cell = null
              }
              obj[key] = cell
            })
            return obj
          })
          resolve(data)
        } catch (err) {
          reject(new Error("Falha ao ler o arquivo Excel de dados."))
        }
      }
      reader.onerror = reject
    })

  const strip = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()

  const readDictFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsBinaryString(file)
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

          const headerInfoIdx = rows.findIndex((row) => {
            const norm = row.map(strip)
            return norm.some((c) => /^variavel$/i.test(c)) && norm.some((c) => /^rotulo$/i.test(c))
          })
          if (headerInfoIdx < 0)
            return reject(new Error("Cabeçalho de Variáveis/Rótulos não encontrado no dicionário."))

          const hdrInfo = rows[headerInfoIdx].map(strip)
          const varIdx = hdrInfo.findIndex((h) => /^variavel$/i.test(h))
          const rotIdx = hdrInfo.findIndex((h) => /^rotulo$/i.test(h))

          const questionMap = {}
          rows
            .slice(headerInfoIdx + 1)
            .map((r) => r.map(strip))
            .filter((cells) => cells[varIdx])
            .forEach((cells) => {
              const key = cells[varIdx]
              const origLabel = cells[rotIdx] || key
              let lab = PRETTY_LABELS[key] || origLabel
              for (const { pattern, label: pretty } of LABEL_OVERRIDES) {
                if (pattern.test(origLabel)) {
                  lab = pretty
                  break
                }
              }
              questionMap[key] = { label: lab, type: "text" } // Default type
            })
          resolve({ questionMap })
        } catch (err) {
          reject(new Error("Falha ao ler o arquivo de dicionário."))
        }
      }
      reader.onerror = reject
    })

  const handleSubmit = async () => {
    if (!dataFile || !dictFile) {
      showAlert("danger", "Por favor, selecione o arquivo de dados e o dicionário.")
      return
    }
    setLoading(true)
    setAlert({ show: false })
    const progressTimer = simulateProgress()


    try {
      const fileHash = await computeFileHash(dataFile)
      const dataJson = await readExcel(dataFile)
      const { questionMap } = await readDictFile(dictFile)

      const variables = Object.entries(questionMap).map(([key, info]) => ({
        key,
        label: info.label,
        type: info.type,
      }))

      const surveyName = dictFile.name.replace(/\.(xlsx|xlsm)$/i, "")
      const rodadaMatch = surveyName.match(/Rodada\s+(\d+)/i)
      const rodada = rodadaMatch ? Number.parseInt(rodadaMatch[1], 10) : null
      const yearMatch = surveyName.match(/(\d{4})/)
      const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : new Date().getFullYear()

      const surveyInfo = {
        name: surveyName,
        month: rodada,
        year: year,
        variables,
        fileHashes: [fileHash],
      }

      const processedData = dataJson
        .map((row) => {
          if (!row.idEntrevista) return null
          return {
            entrevistadoId: String(row.idEntrevista),
            rodada: rodada,
            year: year,
            answers: Object.keys(row)
              .filter((key) => key !== "idEntrevista")
              .map((key) => ({
                k: key,
                v: row[key],
              })),
          }
        })
        .filter(Boolean)

      const payload = { surveyInfo, data: processedData }

      const response = await ApiBase.put("/api/data", payload)
      clearInterval(progressTimer)
      setProgress(100)

      if (response.status === 201 || response.status === 200) {
        showAlert("success", "Dados enviados e processados com sucesso!")
        setDataFile(null)
        setDictFile(null)
      } else {
        showAlert("danger", response.data?.error || "Erro no envio dos dados.")
      }
    } catch (error) {
      clearInterval(progressTimer)
      setProgress(0)
      if (error.response?.status === 409) {
        showAlert("warning", error.response.data?.error || "Este arquivo de dados já foi processado anteriormente.")
      } else {
        showAlert("danger", error.message || "Ocorreu um erro no processamento dos arquivos.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page-wrapper">
      <header className="main-header">
        <Container className="d-flex justify-content-between align-items-center">
          <Image src="/nexus-logo.png" alt="Nexus Logo" className="header-logo-nexus" />
          <Button variant="outline-light" size="sm" onClick={() => logout()}>
            Sair
          </Button>
        </Container>
      </header>

      <main className="content-area">
        <Container>
          <div className="page-header">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate("/")} className="back-button">
              <ArrowLeft size={16} className="me-2" />
              Voltar
            </Button>
            <h1 className="page-title">Upload de Novas Pesquisas</h1>
            <p className="page-description">Envie os arquivos de dados e o dicionário de variáveis da pesquisa.</p>
          </div>

          {alert.show && (
            <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
              {alert.message}
            </Alert>
          )}

          <Card className="filters-card">
            <Card.Body>
              <Row className="g-4">
                <Col md={6}>
                  <Form.Group controlId="dataFile" className="text-center">
                    <FileEarmarkArrowUp size={48} className="text-primary mb-3" />
                    <h5 className="mb-3">Arquivo de Dados (.xlsx)</h5>
                    <Form.Label className="btn btn-outline-primary">
                      <CloudUpload className="me-2" />
                      {dataFile ? "Trocar Arquivo" : "Selecionar Arquivo de Dados"}
                      <Form.Control
                        type="file"
                        accept=".xlsx"
                        hidden
                        onChange={(e) => setDataFile(e.target.files[0])}
                      />
                    </Form.Label>
                    {dataFile && (
                      <div className="mt-3 text-success d-flex align-items-center justify-content-center">
                        <CheckCircle className="me-2" />
                        <span>{dataFile.name}</span>
                      </div>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="dictFile" className="text-center">
                    <Book size={48} className="text-primary mb-3" />
                    <h5 className="mb-3">Dicionário de Variáveis (.xlsm)</h5>
                    <Form.Label className="btn btn-outline-primary">
                      <CloudUpload className="me-2" />
                      {dictFile ? "Trocar Dicionário" : "Selecionar Dicionário"}
                      <Form.Control
                        type="file"
                        accept=".xlsm"
                        hidden
                        onChange={(e) => setDictFile(e.target.files[0])}
                      />
                    </Form.Label>
                    {dictFile && (
                      <div className="mt-3 text-success d-flex align-items-center justify-content-center">
                        <CheckCircle className="me-2" />
                        <span>{dictFile.name}</span>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>
              <hr className="my-4" />
              <div className="text-center">
                <Button
                  variant="dark"
                  size="lg"
                  disabled={loading || !dataFile || !dictFile}
                  onClick={handleSubmit}
                  style={{ minWidth: "200px" }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Processando...</span>
                    </>
                  ) : (
                    "Enviar e Processar"
                  )}
                </Button>
              </div>
              {loading && <ProgressBar animated now={progress} className="mt-3" />}
            </Card.Body>
          </Card>
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p>Sistema de Monitoramento Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}

export default Upload
