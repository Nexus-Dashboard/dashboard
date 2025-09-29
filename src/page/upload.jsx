"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Image } from "react-bootstrap"
import { CloudUpload, CheckCircle, FileEarmarkArrowUp, Book, ArrowLeft, Eye } from "react-bootstrap-icons"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import "./HomePage.css"

// Mapeamento para labels mais descritivos
const PRETTY_LABELS = {
  UF: "Estado",
  MUNIC: "Município",
  DATA: "Data",
  DURACAO: "Duração",
  HORA_INICIO: "Hora Início",
  HORA_FIM: "Hora Fim",
  CIR: "Capital/Interior",
  Regiao: "Região",
  PF1: "Sexo",
}

const LABEL_OVERRIDES = [
  { pattern: /cor(?: ou )?ra[çc]a/i, label: "Cor/Raça" },
  { pattern: /quantos anos/i, label: "Idade" },
  { pattern: /qual o seu grau de escolaridade/i, label: "Escolaridade" },
  { pattern: /desempenha algum trabalho remunerado/i, label: "Trabalho remunerado" },
  { pattern: /capital/i, label: "Capital ou Interior" },
  { pattern: /avalia o desempenho do Governo/i, label: "Como você avalia o desempenho do Governo Federal?" },
  { pattern: /sexo/i, label: "Sexo" },
  { pattern: /weights/i, label: "Peso" },
  { pattern: /uf/i, label: "Estado" },
  { pattern: /regiao/i, label: "Região" },
]

function Upload() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [dataFile, setDataFile] = useState(null)
  const [dictFile, setDictFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [alert, setAlert] = useState({ show: false, variant: "success", message: "" })

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
          
          if (headerIdx < 0) {
            return reject(new Error("Coluna 'idEntrevista' não encontrada no arquivo de dados."))
          }
          
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
          
          let questionMap = {}
          let foundValidSheet = false
          
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName]
            
            if (!ws['!ref']) continue
            
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
            
            const headerInfoIdx = rows.findIndex((row) => {
              const norm = row.map(strip)
              const hasVariable = norm.some((c) => /^variavel$/i.test(c) || /^variable$/i.test(c))
              const hasLabel = norm.some((c) => /^rotulo$/i.test(c) || /^label$/i.test(c) || /^pergunta$/i.test(c))
              return hasVariable && hasLabel
            })
            
            if (headerInfoIdx >= 0) {
              const hdrInfo = rows[headerInfoIdx].map(strip)
              const varIdx = hdrInfo.findIndex((h) => /^variavel$/i.test(h) || /^variable$/i.test(h))
              const rotIdx = hdrInfo.findIndex((h) => /^rotulo$/i.test(h) || /^label$/i.test(h) || /^pergunta$/i.test(h))
              
              rows
                .slice(headerInfoIdx + 1)
                .map((r) => r.map(strip))
                .filter((cells) => cells[varIdx] && cells[varIdx].trim())
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
                  
                  questionMap[key] = { label: lab, type: "text", originalLabel: origLabel }
                })
              
              foundValidSheet = true
              break
            }
          }
          
          if (!foundValidSheet) {
            return reject(new Error("Estrutura do dicionário não reconhecida. Esperado colunas 'variavel' e 'rotulo'."))
          }
          
          resolve({ questionMap })
        } catch (err) {
          reject(new Error("Falha ao ler o arquivo de dicionário."))
        }
      }
      reader.onerror = reject
    })

  const handleAnalyzeFiles = async () => {
    if (!dataFile && !dictFile) {
      showAlert("warning", "Selecione pelo menos um arquivo para analisar.")
      return
    }

    setLoading(true)
    console.clear()
    
    try {
      let processedData = null
      let questionMap = null
      let surveyInfo = null

      console.log("🚀 INICIANDO ANÁLISE DOS ARQUIVOS")
      console.log("=" .repeat(50))

      // Processar arquivo de dados
      if (dataFile) {
        console.log("\n📊 PROCESSANDO ARQUIVO DE DADOS")
        console.log(`📁 Arquivo: ${dataFile.name}`)
        console.log(`📏 Tamanho: ${(dataFile.size / 1024 / 1024).toFixed(2)} MB`)
        
        processedData = await readExcel(dataFile)
        console.log(`✅ Dados processados: ${processedData.length} registros`)
        console.log(`📝 Colunas: ${Object.keys(processedData[0] || {}).length}`)
      }

      // Processar dicionário
      if (dictFile) {
        console.log("\n📚 PROCESSANDO DICIONÁRIO")
        console.log(`📁 Arquivo: ${dictFile.name}`)
        console.log(`📏 Tamanho: ${(dictFile.size / 1024).toFixed(2)} KB`)
        
        const dictResult = await readDictFile(dictFile)
        questionMap = dictResult.questionMap
        console.log(`✅ Variáveis mapeadas: ${Object.keys(questionMap).length}`)

        // Extrair informações da pesquisa
        const surveyName = dictFile.name.replace(/\.(xlsx|xlsm)$/i, "")
        const rodadaMatch = surveyName.match(/Rodada\s+(\d+)/i) || surveyName.match(/RODADA\s+(\d+)/i)
        const rodada = rodadaMatch ? parseInt(rodadaMatch[1], 10) : null
        const yearMatch = surveyName.match(/(\d{4})/)
        const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()

        surveyInfo = {
          name: surveyName,
          rodada: rodada,
          year: year,
          totalVariables: Object.keys(questionMap).length
        }

        console.log(`📋 Nome da pesquisa: ${surveyInfo.name}`)
        console.log(`🔢 Rodada: ${surveyInfo.rodada}`)
        console.log(`📅 Ano: ${surveyInfo.year}`)
      }

      // Mostrar resultados em JSON
      console.log("\n" + "=".repeat(50))
      console.log("📊 RESULTADOS COMPLETOS EM JSON")
      console.log("=".repeat(50))

      if (surveyInfo) {
        console.log("\n📋 INFORMAÇÕES DA PESQUISA:")
        console.log(JSON.stringify(surveyInfo, null, 2))
      }

      if (questionMap) {
        console.log("\n📚 DICIONÁRIO DE VARIÁVEIS (primeiras 20):")
        const first20Variables = Object.fromEntries(
          Object.entries(questionMap).slice(0, 20)
        )
        console.log(JSON.stringify(first20Variables, null, 2))
        
        console.log("\n📚 DICIONÁRIO COMPLETO DE VARIÁVEIS:")
        console.log(JSON.stringify(questionMap, null, 2))
      }

      if (processedData) {
        console.log("\n📊 DADOS PROCESSADOS (primeiras 10 linhas):")
        console.log(JSON.stringify(processedData.slice(0, 10), null, 2))
        
        console.log("\n📊 DADOS PROCESSADOS (primeiras 100 linhas):")
        console.log(JSON.stringify(processedData.slice(0, 100), null, 2))
        
        console.log("\n📊 AMOSTRA DE UMA LINHA COMPLETA:")
        console.log(JSON.stringify(processedData[0], null, 2))
      }

      // Análise de correspondência
      if (processedData && questionMap) {
        const dataColumns = Object.keys(processedData[0] || {})
        const dictVariables = Object.keys(questionMap)
        
        const columnsInDict = dataColumns.filter(col => dictVariables.includes(col))
        const columnsNotInDict = dataColumns.filter(col => !dictVariables.includes(col))
        const dictVariablesNotInData = dictVariables.filter(var_ => !dataColumns.includes(var_))
        
        const correspondence = {
          totalDataColumns: dataColumns.length,
          totalDictVariables: dictVariables.length,
          columnsInDict: columnsInDict.length,
          columnsNotInDict: columnsNotInDict.length,
          dictVariablesNotInData: dictVariablesNotInData.length,
          matchPercentage: Math.round((columnsInDict.length / dataColumns.length) * 100)
        }

        console.log("\n🔍 ANÁLISE DE CORRESPONDÊNCIA:")
        console.log(JSON.stringify(correspondence, null, 2))

        if (columnsNotInDict.length > 0) {
          console.log("\n⚠️ COLUNAS SEM CORRESPONDÊNCIA NO DICIONÁRIO:")
          console.log(JSON.stringify(columnsNotInDict, null, 2))
        }

        if (dictVariablesNotInData.length > 0) {
          console.log("\n⚠️ VARIÁVEIS DO DICIONÁRIO NÃO ENCONTRADAS NOS DADOS:")
          console.log(JSON.stringify(dictVariablesNotInData, null, 2))
        }
      }

      // Estrutura final que seria enviada para API (sem enviar)
      if (processedData && questionMap && surveyInfo) {
        const finalStructure = {
          surveyInfo: {
            name: surveyInfo.name,
            month: surveyInfo.rodada,
            year: surveyInfo.year,
            variables: Object.entries(questionMap).map(([key, info]) => ({
              key,
              label: info.label,
              type: info.type,
            }))
          },
          data: processedData.map((row) => ({
            entrevistadoId: String(row.idEntrevista),
            rodada: surveyInfo.rodada,
            year: surveyInfo.year,
            answers: Object.keys(row)
              .filter((key) => key !== "idEntrevista")
              .map((key) => ({
                k: key,
                v: row[key],
              })),
          })).slice(0, 100) // Limitando a 100 registros para o log
        }

        console.log("\n📤 ESTRUTURA FINAL (primeiros 100 registros):")
        console.log(JSON.stringify(finalStructure, null, 2))
      }

      console.log("\n✅ ANÁLISE CONCLUÍDA!")
      console.log("=".repeat(50))

      // Salvar resultados para exibir na interface
      setResults({
        surveyInfo,
        dataRecords: processedData?.length || 0,
        variablesCount: questionMap ? Object.keys(questionMap).length : 0,
        correspondence: processedData && questionMap ? {
          matchPercentage: Math.round((Object.keys(processedData[0] || {}).filter(col => 
            Object.keys(questionMap).includes(col)
          ).length / Object.keys(processedData[0] || {}).length) * 100)
        } : null
      })

      showAlert("success", "Análise concluída! Verifique o console para os dados completos em JSON.")

    } catch (error) {
      console.error("❌ ERRO NA ANÁLISE:", error)
      showAlert("danger", `Erro na análise: ${error.message}`)
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
            <h1 className="page-title">Análise de Arquivos de Pesquisa</h1>
            <p className="page-description">Analise os arquivos de dados e dicionário de variáveis da pesquisa.</p>
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
                        accept=".xlsm,.xlsx"
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
                  variant="primary"
                  size="lg"
                  disabled={loading || (!dataFile && !dictFile)}
                  onClick={handleAnalyzeFiles}
                  style={{ minWidth: "250px" }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="me-2" />
                      Analisar e Mostrar Dados em JSON
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-3 text-center">
                <small className="text-muted">
                  ℹ️ Os dados completos em formato JSON serão exibidos no console do navegador (F12)
                </small>
              </div>
            </Card.Body>
          </Card>

          {/* Resultado da Análise */}
          {results && (
            <Card className="mt-4">
              <Card.Header>
                <h5 className="mb-0">📊 Resumo da Análise</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <div className="text-center p-3 bg-primary text-white rounded mb-3">
                      <h4>{results.dataRecords.toLocaleString()}</h4>
                      <small>Registros Processados</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center p-3 bg-success text-white rounded mb-3">
                      <h4>{results.variablesCount}</h4>
                      <small>Variáveis Mapeadas</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    {results.correspondence && (
                      <div className="text-center p-3 bg-info text-white rounded mb-3">
                        <h4>{results.correspondence.matchPercentage}%</h4>
                        <small>Taxa de Correspondência</small>
                      </div>
                    )}
                  </Col>
                </Row>
                
                {results.surveyInfo && (
                  <div className="mt-3">
                    <h6>📋 Informações da Pesquisa</h6>
                    <ul className="list-unstyled">
                      <li><strong>Nome:</strong> {results.surveyInfo.name}</li>
                      <li><strong>Rodada:</strong> {results.surveyInfo.rodada}</li>
                      <li><strong>Ano:</strong> {results.surveyInfo.year}</li>
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 p-3 bg-light rounded">
                  <h6 className="text-primary">💡 Dados Disponíveis no Console:</h6>
                  <ul className="mb-0">
                    <li>📊 Dados completos das primeiras 100 linhas em JSON</li>
                    <li>📚 Dicionário completo de variáveis em JSON</li>
                    <li>📋 Informações da pesquisa em JSON</li>
                    <li>🔍 Análise de correspondência em JSON</li>
                    <li>📤 Estrutura final formatada para API em JSON</li>
                  </ul>
                </div>
              </Card.Body>
            </Card>
          )}
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