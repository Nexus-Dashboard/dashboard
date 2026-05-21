"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Image, Badge } from "react-bootstrap"
import {
  CloudUpload,
  CheckCircle,
  FileEarmarkArrowUp,
  ArrowLeft,
  Eye,
  ArrowRepeat,
  BoxArrowUpRight,
  ExclamationTriangle,
  CloudUploadFill,
  ArrowClockwise,
} from "react-bootstrap-icons"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import ApiBase from "../service/ApiBase"
import "./HomePage.css"

const SHEETS_INDEX_URL =
  "https://docs.google.com/spreadsheets/d/1h27lqHA9TD0IqM6A9M5JE8KyB7LySUt08dvBdCdyx0o/edit?gid=0#gid=0"

const INDEX_FILE_ID = "1h27lqHA9TD0IqM6A9M5JE8KyB7LySUt08dvBdCdyx0o"

function Upload() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  // --- Index state ---
  const [indexRounds, setIndexRounds] = useState(null)       // string[] | null
  const [indexLoading, setIndexLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  // --- Upload state ---
  const [dataFile, setDataFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [processedData, setProcessedData] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)

  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" })
  const showAlert = (variant, message) => setAlert({ show: true, variant, message })

  // Buscar rodadas do index ao montar
  useEffect(() => {
    fetchIndexRounds()
  }, [])

  const fetchIndexRounds = async () => {
    setIndexLoading(true)
    try {
      const res = await ApiBase.get(`/api/google/file/${INDEX_FILE_ID}`)
      const sheets = res.data.fileData?.sheets || {}
      // A planilha pode estar na aba "Página1" ou "base" — pega a primeira disponível
      const sheetData = sheets["Página1"] || sheets["base"] || Object.values(sheets)[0] || []

      if (sheetData.length < 2) {
        setIndexRounds([])
        return
      }

      const headers = sheetData[0]
      const colIdx = headers.indexOf("Número da Pesquisa")
      if (colIdx === -1) {
        setIndexRounds([])
        return
      }

      const rounds = [
        ...new Set(
          sheetData
            .slice(1)
            .map((row) => String(row[colIdx] ?? "").trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => Number(a) - Number(b))

      setIndexRounds(rounds)
    } catch (e) {
      setIndexRounds([])
    } finally {
      setIndexLoading(false)
    }
  }

  // Verifica se a rodada do arquivo já está no index
  // Normaliza ambos os lados para número para evitar divergência "59" vs 59
  const rodadaInIndex =
    results?.surveyInfo?.rodada != null &&
    indexRounds != null &&
    indexRounds.some((r) => Number(r) === Number(results.surveyInfo.rodada))

  // --- Leitura do Excel ---
  const readExcel = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsBinaryString(file)
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

          const headerIdx = rows.findIndex((r) =>
            r.map((c) => String(c).toLowerCase()).includes("identrevista")
          )

          if (headerIdx < 0) {
            return reject(new Error("Coluna 'idEntrevista' não encontrada no arquivo de dados."))
          }

          const normalizeKey = (k) => k.replace(/^(P)([1-9])$/, "$10$2")
          const header = rows[headerIdx].map((h) => normalizeKey(String(h).trim()))
          const data = rows.slice(headerIdx + 1).map((r) => {
            const obj = {}
            header.forEach((key, i) => {
              let cell = r[i]
              if (cell === "" || /^#null!?$/i.test(String(cell))) cell = null
              obj[key] = cell
            })
            return obj
          })

          resolve(data)
        } catch {
          reject(new Error("Falha ao ler o arquivo Excel de dados."))
        }
      }
      reader.onerror = reject
    })

  // --- Analisar arquivo ---
  const handleAnalyzeFiles = async () => {
    if (!dataFile) {
      showAlert("warning", "Selecione um arquivo de dados para analisar.")
      return
    }

    setLoading(true)
    setResults(null)
    setProcessedData(null)
    setUploadResult(null)
    console.clear()

    try {
      console.log("🚀 INICIANDO ANÁLISE DO ARQUIVO")
      console.log("=".repeat(50))
      console.log(`📁 Arquivo: ${dataFile.name}`)
      console.log(`📏 Tamanho: ${(dataFile.size / 1024 / 1024).toFixed(2)} MB`)

      const parsed = await readExcel(dataFile)
      console.log(`✅ Dados processados: ${parsed.length} registros`)
      console.log(`📝 Colunas: ${Object.keys(parsed[0] || {}).length}`)

      const surveyName = dataFile.name.replace(/\.(xlsx|xlsm)$/i, "")
      const rodadaMatch =
        surveyName.match(/Rodada\s+(\d+)/i) || surveyName.match(/RODADA\s+(\d+)/i)
      const rodada = rodadaMatch ? parseInt(rodadaMatch[1], 10) : null
      const yearMatch = surveyName.match(/(\d{4})/)
      const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()

      const surveyInfo = {
        name: surveyName,
        rodada,
        year,
        totalVariables: Object.keys(parsed[0] || {}).length,
      }

      console.log("\n📋 INFORMAÇÕES DA PESQUISA:")
      console.log(JSON.stringify(surveyInfo, null, 2))
      console.log("\n📊 DADOS PROCESSADOS (primeiras 10 linhas):")
      console.log(JSON.stringify(parsed.slice(0, 10), null, 2))
      console.log("\n✅ ANÁLISE CONCLUÍDA!")
      console.log("=".repeat(50))

      setProcessedData(parsed)
      setResults({ surveyInfo, dataRecords: parsed.length })
      showAlert("success", "Análise concluída! Verifique o console para os dados completos em JSON.")
    } catch (error) {
      console.error("❌ ERRO NA ANÁLISE:", error)
      showAlert("danger", `Erro na análise: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Quantas respostas enviar por requisição.
  // A Vercel limita o corpo da requisição a 4.5 MB; ~500 registros ficam bem abaixo disso.
  const UPLOAD_CHUNK_SIZE = 500

  // --- Enviar para o banco (em lotes) ---
  const handleUploadSurvey = async () => {
    if (!processedData || !results?.surveyInfo) return

    setUploadLoading(true)
    setUploadResult(null)
    setUploadProgress(null)

    try {
      const { surveyInfo } = results

      const responses = processedData.map((row) => ({
        entrevistadoId: String(row.idEntrevista || ""),
        answers: Object.entries(row)
          .filter(([key]) => key !== "idEntrevista")
          .map(([k, v]) => ({ k, v })),
      }))

      const totalChunks = Math.ceil(responses.length / UPLOAD_CHUNK_SIZE)
      let totalInserted = 0
      let lastSurveyId = null

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * UPLOAD_CHUNK_SIZE
        const chunk = responses.slice(start, start + UPLOAD_CHUNK_SIZE)

        setUploadProgress({ current: chunkIndex + 1, total: totalChunks })

        const response = await ApiBase.post("/api/migration/upload-survey", {
          surveyName: surveyInfo.name,
          rodada: surveyInfo.rodada,
          year: surveyInfo.year,
          responses: chunk,
          chunkIndex,
          totalChunks,
        })

        totalInserted += response.data.responsesInserted || 0
        lastSurveyId = response.data.surveyId
      }

      setUploadResult({
        success: true,
        data: {
          message: `Pesquisa "${surveyInfo.name}" importada com sucesso!`,
          surveyId: lastSurveyId,
          responsesInserted: totalInserted,
        },
      })
      showAlert("success", `${totalInserted} respostas inseridas com sucesso no banco!`)
    } catch (error) {
      const message = error.response?.data?.error || error.message || "Erro desconhecido"
      setUploadResult({ success: false, message })
      showAlert("danger", `Erro no envio: ${message}`)
    } finally {
      setUploadLoading(false)
      setUploadProgress(null)
    }
  }

  // --- Sincronizar index-answers ---
  const handleSyncIndexAnswers = async () => {
    setSyncLoading(true)
    setSyncResult(null)

    try {
      const response = await ApiBase.get("/api/migration/sync-index")
      setSyncResult({ success: true, data: response.data })
      showAlert("success", "Sincronização concluída!")
      // Recarregar rodadas após sincronizar
      fetchIndexRounds()
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Erro desconhecido"
      setSyncResult({ success: false, message })
      showAlert("danger", `Erro na sincronização: ${message}`)
    } finally {
      setSyncLoading(false)
    }
  }

  // Mensagem de bloqueio do botão de upload
  const uploadBlockReason = (() => {
    if (!results) return null
    if (!results.surveyInfo.rodada) return "Rodada não detectada no nome do arquivo."
    if (indexRounds === null) return "Verificando index..."
    if (!rodadaInIndex)
      return `Rodada ${results.surveyInfo.rodada} não encontrada no index. Preencha a planilha e rode a sincronização antes de enviar.`
    return null
  })()

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
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate("/")}
              className="back-button"
            >
              <ArrowLeft size={16} className="me-2" />
              Voltar
            </Button>
            <h1 className="page-title">Importação de Pesquisas</h1>
            <p className="page-description">
              Siga a ordem: primeiro sincronize o índice, depois envie o arquivo de dados.
            </p>
          </div>

          {alert.show && (
            <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
              {alert.message}
            </Alert>
          )}

          {/* ── CARD 1: Index ────────────────────────────────── */}
          <Card className="mb-4">
            <Card.Header className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Badge bg="dark" style={{ fontSize: "0.85rem" }}>1</Badge>
                <h5 className="mb-0">Índice de Perguntas</h5>
              </div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={fetchIndexRounds}
                disabled={indexLoading}
                title="Atualizar lista de rodadas"
              >
                <ArrowClockwise size={14} className={indexLoading ? "spin" : ""} />
              </Button>
            </Card.Header>
            <Card.Body>
              {/* Rodadas no index */}
              <div className="mb-3">
                <p className="text-muted small mb-2">
                  Rodadas presentes no index do banco{" "}
                  <code>telephonic</code>:
                </p>
                {indexLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : indexRounds && indexRounds.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {indexRounds.map((r) => (
                      <Badge
                        key={r}
                        bg={
                          results?.surveyInfo?.rodada != null &&
                          Number(r) === Number(results.surveyInfo.rodada)
                            ? "success"
                            : "secondary"
                        }
                        style={{ fontSize: "0.8rem" }}
                      >
                        Rodada {r}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-warning small">Nenhuma rodada encontrada no index.</span>
                )}
              </div>

              <Alert variant="warning" className="d-flex align-items-start gap-2 mb-3">
                <ExclamationTriangle size={18} className="flex-shrink-0 mt-1" />
                <div className="small">
                  <strong>Antes de sincronizar:</strong> confirme que a planilha abaixo está
                  preenchida com a rodada que será importada.
                </div>
              </Alert>

              <div className="mb-4">
                <a
                  href={SHEETS_INDEX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                >
                  <BoxArrowUpRight className="me-2" />
                  Abrir Planilha de Index no Google Sheets
                </a>
              </div>

              <div className="d-flex align-items-center gap-3 flex-wrap">
                <Button
                  variant="dark"
                  disabled={syncLoading}
                  onClick={handleSyncIndexAnswers}
                  style={{ minWidth: "240px" }}
                >
                  {syncLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" />
                      <span className="ms-2">Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRepeat className="me-2" />
                      Rodar sync-index
                    </>
                  )}
                </Button>
                <small className="text-muted">
                  Chama <code>/api/migration/sync-index</code>
                </small>
              </div>

              {syncResult && (
                <div
                  className={`mt-3 p-3 rounded ${
                    syncResult.success
                      ? "bg-success bg-opacity-10 border border-success"
                      : "bg-danger bg-opacity-10 border border-danger"
                  }`}
                >
                  {syncResult.success ? (
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircle className="text-success" size={18} />
                      <strong className="text-success">Sincronização concluída com sucesso</strong>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <ExclamationTriangle className="text-danger" size={18} />
                      <span className="text-danger">
                        <strong>Erro:</strong> {syncResult.message}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* ── CARD 2: Upload ───────────────────────────────── */}
          <Card className="mb-4">
            <Card.Header className="d-flex align-items-center gap-2">
              <Badge bg="dark" style={{ fontSize: "0.85rem" }}>2</Badge>
              <h5 className="mb-0">Upload do Arquivo de Dados</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <Form.Group controlId="dataFile">
                  <FileEarmarkArrowUp size={48} className="text-primary mb-3" />
                  <h5 className="mb-3">Arquivo de Dados (.xlsx)</h5>
                  <Form.Label className="btn btn-outline-primary">
                    <CloudUpload className="me-2" />
                    {dataFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
                    <Form.Control
                      type="file"
                      accept=".xlsx"
                      hidden
                      onChange={(e) => {
                        setDataFile(e.target.files[0])
                        setResults(null)
                        setProcessedData(null)
                        setUploadResult(null)
                      }}
                    />
                  </Form.Label>
                  {dataFile && (
                    <div className="mt-3 text-success d-flex align-items-center justify-content-center gap-2">
                      <CheckCircle size={16} />
                      <span>{dataFile.name}</span>
                    </div>
                  )}
                </Form.Group>
              </div>

              <hr className="my-4" />

              <div className="text-center">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={loading || !dataFile}
                  onClick={handleAnalyzeFiles}
                  style={{ minWidth: "250px" }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" />
                      <span className="ms-2">Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="me-2" />
                      Analisar Arquivo
                    </>
                  )}
                </Button>
                <div className="mt-2">
                  <small className="text-muted">
                    Dados completos exibidos no console do navegador (F12)
                  </small>
                </div>
              </div>

              {/* Resultado da análise + botão de envio */}
              {results && (
                <div className="mt-4 p-3 bg-light rounded">
                  <Row className="text-center mb-3">
                    <Col md={6}>
                      <div className="p-3 bg-primary text-white rounded">
                        <h4>{results.dataRecords.toLocaleString()}</h4>
                        <small>Registros</small>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 bg-secondary text-white rounded">
                        <h4>{results.surveyInfo.totalVariables}</h4>
                        <small>Colunas</small>
                      </div>
                    </Col>
                  </Row>

                  <ul className="list-unstyled mb-3 small">
                    <li><strong>Nome:</strong> {results.surveyInfo.name}</li>
                    <li>
                      <strong>Rodada:</strong>{" "}
                      {results.surveyInfo.rodada ? (
                        <Badge bg={rodadaInIndex ? "success" : "warning"} text={rodadaInIndex ? undefined : "dark"}>
                          {results.surveyInfo.rodada}
                          {rodadaInIndex ? " ✓ no index" : " ✗ não está no index"}
                        </Badge>
                      ) : (
                        <span className="text-danger">Não detectada</span>
                      )}
                    </li>
                    <li><strong>Ano:</strong> {results.surveyInfo.year}</li>
                  </ul>

                  {/* Bloco de aviso quando rodada não está no index */}
                  {results.surveyInfo.rodada && !rodadaInIndex && indexRounds !== null && (
                    <Alert variant="danger" className="d-flex align-items-start gap-2 py-2 small">
                      <ExclamationTriangle size={16} className="flex-shrink-0 mt-1" />
                      <span>
                        A Rodada <strong>{results.surveyInfo.rodada}</strong> ainda não está no índice.
                        Preencha a planilha e rode a sincronização no <strong>Passo 1</strong> antes de
                        enviar.
                      </span>
                    </Alert>
                  )}

                  <div className="text-center">
                    <Button
                      variant="success"
                      size="lg"
                      disabled={uploadLoading || !!uploadBlockReason}
                      onClick={handleUploadSurvey}
                      style={{ minWidth: "280px" }}
                    >
                      {uploadLoading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" />
                          <span className="ms-2">
                            {uploadProgress
                              ? `Enviando lote ${uploadProgress.current}/${uploadProgress.total}...`
                              : "Enviando para o banco..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <CloudUploadFill className="me-2" />
                          Enviar para o Banco de Dados
                        </>
                      )}
                    </Button>

                    {uploadBlockReason && (
                      <div className="mt-2">
                        <small className="text-danger">{uploadBlockReason}</small>
                      </div>
                    )}
                  </div>

                  {uploadResult && (
                    <div
                      className={`mt-3 p-3 rounded ${
                        uploadResult.success
                          ? "bg-success bg-opacity-10 border border-success"
                          : "bg-danger bg-opacity-10 border border-danger"
                      }`}
                    >
                      {uploadResult.success ? (
                        <>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <CheckCircle className="text-success" size={18} />
                            <strong className="text-success">{uploadResult.data.message}</strong>
                          </div>
                          <small className="text-muted">
                            Survey ID: <code>{uploadResult.data.surveyId}</code> ·{" "}
                            {uploadResult.data.responsesInserted} respostas inseridas
                          </small>
                        </>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <ExclamationTriangle className="text-danger" size={18} />
                          <span className="text-danger">
                            <strong>Erro:</strong> {uploadResult.message}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </main>

      <footer className="page-footer">
        <Container>
          <p>Sistema de Análise de Pesquisas • Secom/PR</p>
        </Container>
      </footer>
    </div>
  )
}

export default Upload
