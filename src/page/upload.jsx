// upload.jsx
import React, { useState } from 'react';
import SparkMD5 from 'spark-md5';
import * as XLSX from 'xlsx';
import ApiBase from '../service/ApiBase';
import {
  Box, Button, Typography, Container, Paper, CircularProgress,
  Stepper, Step, StepLabel, Alert, Snackbar, LinearProgress,
  useMediaQuery, useTheme, Tooltip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';

// Mapeamento manual para labels mais "bonitos"
const PRETTY_LABELS = {
  UF:         'Estado',
  MUNIC:      'Município',
  /*Regiao:     'Região',
  DATA:       'Data',
  DURACAO:    'Duração',
  HORA_INICIO:'Hora Início',
  HORA_FIM:   'Hora Fim',
  MUNIC:      'Município',
  CIR:        'Capital ou Interior',
  P1:  'Como você avalia o desempenho do Governo Federal?',
  P2:  'Na sua avaliação o desempenho do Governo Federal é mais positivo ou mais negativo?',
  P3:  'Como você avalia o desempenho do Presidente da República?',
  P4:  'Você avalia o desempenho do Presidente como mais positivo ou mais negativo?',
  PF1: 'Sexo',
  PF2_faixas: 'Faixa etária',
  PF3:  'Escolaridade',
  PF4:  'Trabalho remunerado',
  PF5:  'Tipo de emprego',
  PF6:  'Vínculo formal',
  PF7:  'Possui CNPJ?',
  PF8:  'Situação ocupacional',
  PF9:  'Procurou emprego nos últimos 30 dias?',
  PF12: 'Recebe Bolsa Família?',
  PF13: 'Renda individual',
  PF14: 'Renda familiar',
  PF15: 'Religião',*/

};

const LABEL_OVERRIDES = [
  { pattern: /cor(?: ou )?ra[çc]a/i,      label: 'Cor/Raça' },
  { pattern: /quantos anos/i,             label: 'Idade' },
  { pattern: /qual o seu grau de escolaridade/i, label: 'Escolaridade' },
  { pattern: /desempenha algum trabalho remunerado/i,       label: 'Trabalho remunerado' },
  { pattern: /capital/i,           label: 'Capital ou Interior' },
  { pattern: /dataatualizacao/i,           label: 'Data' },
  { pattern: /duracao/i,           label: 'Duração' },
  { pattern: /horainicio/i,           label: 'Hora Início' },
  { pattern: /horafim/i,           label: 'Hora Fim' },
  { pattern: /avalia o desempenho do Governo/i,           label: 'Como você avalia o desempenho do Governo Federal?' },
  { pattern: /sexo/i,           label: 'Sexo' },
  { pattern: /classifica esse trabalho/i,           label: 'Tipo de emprego' },
  { pattern: /possui cnpj/i,           label: 'Possui CNPJ?' },
  { pattern: /voce e aposentado/i,           label: 'Situação ocupacional' },
  { pattern: /trinta dias/i,           label: 'Procurou emprego nos últimos 30 dias?' },
  { pattern: /bolsa familia/i,           label: 'Recebe Bolsa Família?' },
  { pattern: /religiao/i,           label: 'Religião' },
  { pattern: /considerando seus ganhos/i,           label: 'Renda individual' },
  { pattern: /somando a sua renda com a renda/i,           label: 'Renda Familiar' },
  { pattern: /vinculo formal/i,           label: 'CLT' },
  { pattern: /weights/i,           label: 'Peso' },
  { pattern: /uf/i,           label: 'Estado' },
  { pattern: /regiao/i,           label: 'Região' },
  { pattern: /e como voce avalia o desempenho do presidente/i,           label: 'E como voce avalia o desempenho do Presidente da Republica?' },
  { pattern: /na sua avaliacao, o desempenho/i,           label: 'E na sua avaliacao, o desempenho do Governo Federal e regular mais para positivo ou regular mais para negativo?'},
  { pattern: /e voce aprova ou desaprova o desempenho do governo federal/i,           label: 'E voce aprova ou desaprova o desempenho do governo federal?' },
  // …adicione aqui quantos quiser, usando regex para “case‑insensitive”
];

function Upload() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dataFile, setDataFile] = useState(null);
  const [dictFile, setDictFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [alert, setAlert] = useState({ open: false, severity: 'success', message: '' });
  const [progress, setProgress] = useState(0);

  const steps = ['Selecionar arquivos', 'Processar dados', 'Enviar para o servidor'];

  const simulateProgress = () => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress(old => Math.min(old + Math.random() * 5, 100));
      if (progress >= 100) clearInterval(timer);
    }, 200);
    return timer;
  };

  const computeFileHash = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = e => resolve(SparkMD5.ArrayBuffer.hash(e.target.result));
    reader.onerror = reject;
  });

  const showAlert = (severity, message) => setAlert({ open: true, severity, message });
  const handleCloseAlert = () => setAlert(a => ({ ...a, open: false }));

  const truncateFileName = (fileName, maxLength = 25) => {
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const base = fileName.substring(0, fileName.lastIndexOf('.'));
    if (base.length <= maxLength - ext.length - 3) return fileName;
    return `${base.substring(0, maxLength - ext.length - 4)}...${ext}`;
  };

  // Leitura de dados Excel (inalterada)
  const readExcel = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const headerIdx = rows.findIndex(r => r.includes('idEntrevista'));
      if (headerIdx < 0) return reject(new Error("Cabeçalho 'idEntrevista' não encontrado"));
      const header = rows[headerIdx].map(h => String(h).trim());
      const data = rows.slice(headerIdx + 1).map(r => {
        const obj = {}
        header.forEach((key,i) => {
          let cell = r[i]
          // se vier '' ou '#NULL!' (ou '#NULL') trate como null
          if (cell === '' || /^#null!?$/i.test(String(cell))) {
            cell = null
          }
          obj[key] = cell
        })
        return obj
      })
      resolve(data);
    };
    reader.onerror = reject;
  });

  // Helpers de normalização
  const strip = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();

  const normalize = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

  // Leitura do dicionário com engenharia reversa para variáveis e valores
  const readDictFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = e => {
      const wb   = XLSX.read(e.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];               // só a primeira sheet
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
      // 1) Encontrar cabeçalho de PERGUNTAS (Variável | Rótulo | Nível de medição)
      const headerInfoIdx = rows.findIndex(row => {
        const norm = row.map(strip);
        return norm.some(c => /^variavel$/i.test(c))
            && norm.some(c => /^rotulo$/i.test(c))
            && norm.some(c => /^nivel.*medicao$/i.test(c));
      });
      if (headerInfoIdx < 0) {
        return reject(new Error("Cabeçalho de PERGUNTAS não encontrado na primeira sheet"));
      }
      const hdrInfo = rows[headerInfoIdx].map(strip);
      const varIdx  = hdrInfo.findIndex(h => /^variavel$/i.test(h));
      const rotIdx  = hdrInfo.findIndex(h => /^rotulo$/i.test(h));
      const medIdx  = hdrInfo.findIndex(h => /^nivel.*medicao$/i.test(h));
      const posIdx  = hdrInfo.findIndex(h => /^posicao$/i.test(h));
  
      const questionMap = {};
      rows
        .slice(headerInfoIdx + 1)
        .map(r => r.map(strip))
        .filter(cells =>
          cells[varIdx] && !isNaN(Number(cells[posIdx])) && cells[medIdx]
        )
        .forEach(cells => {
          const key       = cells[varIdx];
          const origLabel = cells[rotIdx] || key;
          let lab       = origLabel;
          //  a) aplicação do PRETTY_LABELS (por key)
          if (PRETTY_LABELS[key]) {
            lab = PRETTY_LABELS[key];
          }
          //  b) aplicação dos LABEL_OVERRIDES (por texto)
          for (const { pattern, label: pretty } of LABEL_OVERRIDES) {
            if (pattern.test(origLabel)) {
              lab = pretty;
              break;
            }
          }
          questionMap[key] = { label: lab, type: cells[medIdx] || 'text' };
        });
  
      // 2) Encontrar cabeçalho de VALORES (Valor | Rótulo)
      const headerValIdx = rows.findIndex(row => {
        const norm = row.map(strip).map(c => c.toLowerCase());
        return norm.includes('valor') && norm.includes('rotulo');
      });
      const valueToVar = {};
      if (headerValIdx >= 0) {
        let currVar = null;
        rows
          .slice(headerValIdx + 1)
          .map(r => r.map(strip))
          .forEach(cells => {
            const first = cells[0];
            if (first && isNaN(Number(first))) {
              currVar = first;
            } else if (currVar) {
              const valLab = cells[2];
              if (valLab) valueToVar[ normalize(valLab) ] = currVar;
            }
          });
      }
  
      resolve({ questionMap, valueToVar });
    };
    reader.onerror = reject;
  });

  const handleDataFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDataFile(file);
      showAlert('info', `Arquivo de dados selecionado: ${file.name}`);
    }
  };

  const handleDictFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDictFile(file);
      showAlert('info', `Dicionário selecionado: ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if(!dataFile||!dictFile){ showAlert('error','...'); return; }
    try {
      const fileHash = await computeFileHash(dataFile);
      setLoading(true); setActiveStep(1);
      const progressTimer = simulateProgress();

      const dataJson = await readExcel(dataFile);
      const { questionMap } = await readDictFile(dictFile);

      // 2) para cada linha, monte o objeto direto pelo header key → row[key]
      const combinedData = dataJson.map(row => {
        return Object.fromEntries(
          Object.keys(questionMap).map(key => {
            const q        = questionMap[key]
            // se row[key] for undefined, cai em null; se já foi normalizado pra null, mantém
            const value    = row[key] !== undefined ? row[key] : null
            return [ key, { label: q.label, value } ]
          })
        )
      })
      // 3) extrai array de variables para o Survey
      const variables = Object.entries(questionMap).map(([key, info]) => ({
        key,
        label: info.label,
        type: info.type
      }));

      // 4) monta surveyInfo (nome, mês, ano e variables)
      const surveyName = dictFile.name.replace(/\.[^.]+$/, '');
      const m = surveyName.match(/Tracking\s+(\w+)(?:\s+(\d{4}))?/i);
      const month = m?.[1] || null;
      let year;
      const firstDate = combinedData[0]?.DATA?.value;
      if (firstDate) {
        const parts = String(firstDate).split('/');
        year = parts.length === 3 ? Number(parts[2]) : new Date().getFullYear();
      } else {
        year = new Date().getFullYear();
      }
      const surveyInfo = { name: surveyName, month, year, variables, fileHash };

      // 5) monta payload completo
      const payload = { surveyInfo, data: combinedData };
      console.log(payload)

      setActiveStep(2);
      const response = await ApiBase.put('/api/data', payload);
      clearInterval(progressTimer);
      setProgress(100);
      setLoading(false);

      if (response.status === 201) {
        showAlert('success', 'Dados enviados com sucesso!');
      } else {
        const msg = response.data?.error || 'Erro no envio dos dados!';
        showAlert('error', msg);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setProgress(100);
        setLoading(false);
        showAlert('warning', error.response.data?.error || 'Este arquivo já foi processado.');
        setActiveStep(0);
        return;
      }
      console.error('Erro ao ler ou enviar os arquivos', error);
      showAlert('error', 'Ocorreu um erro no processamento dos arquivos.');
      setLoading(false);
      setActiveStep(0);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, bgcolor: theme.palette.background.paper }}
      >
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          align="center"
          gutterBottom
          color="primary"
          sx={{ mb: 3 }}
        >
          Upload de Dados Excel
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4, display: { xs: 'none', sm: 'flex' } }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Etapa {activeStep + 1} de {steps.length}:{' '}
            <strong>{steps[activeStep]}</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Arquivo de Dados Card */}
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1, borderColor: dataFile ? 'success.main' : 'grey.300', borderWidth: dataFile ? 2 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', boxSizing: 'border-box', maxWidth: '100%' }}
          >
            <Box display="flex" alignItems="center" mb={isMobile ? 2 : 0}>
              <TableChartIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                Arquivo de Dados
              </Typography>
            </Box>
            <Button
              component="label"
              variant="contained"
              startIcon={dataFile ? <CheckCircleIcon /> : <CloudUploadIcon />}
              color={dataFile ? 'success' : 'primary'}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
            >
              {dataFile ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
              <input type="file" accept=".xlsx, .xls" hidden onChange={handleDataFile} />
            </Button>
            {dataFile && (
              <Box sx={{ mt: isMobile ? 2 : 0, ml: isMobile ? 0 : 2, p: 1, borderRadius: 1, bgcolor: 'success.light', color: 'success.contrastText', display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
                <Tooltip title={dataFile.name} placement="top">
                  <Typography variant="body2" noWrap sx={{ maxWidth: { xs: '70vw', sm: '350px', md: '400px' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {truncateFileName(dataFile.name)} ({(dataFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Tooltip>
              </Box>
            )}
          </Paper>

          {/* Dicionário de Variáveis Card */}
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1, borderColor: dictFile ? 'success.main' : 'grey.300', borderWidth: dictFile ? 2 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', boxSizing: 'border-box', maxWidth: '100%' }}
          >
            <Box display="flex" alignItems="center" mb={isMobile ? 2 : 0}>
              <DescriptionIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                Dicionário de Variáveis
              </Typography>
            </Box>
            <Button
              component="label"
              variant="contained"
              startIcon={dictFile ? <CheckCircleIcon /> : <CloudUploadIcon />}
              color={dictFile ? 'success' : 'primary'}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
            >
              {dictFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
              <input
                type="file"
                accept=".xlsx, .xls, .xlsm"
                hidden
                onChange={handleDictFile}
              />
            </Button>
            {dictFile && (
              <Box 
                sx={{
                  mt: isMobile ? 2 : 0,
                  ml: isMobile ? 0 : 2,
                  p: 1, 
                  borderRadius: 1,
                  bgcolor: 'success.light',
                  color: 'success.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
                <Tooltip title={dictFile.name} placement="top">
                  <Typography 
                    variant="body2" 
                    noWrap 
                    sx={{
                      maxWidth: { xs: '70vw', sm: '350px', md: '400px' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {truncateFileName(dictFile.name)} ({(dictFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Tooltip>
              </Box>
            )}
          </Paper>

          {/* Botão Enviar Arquivos */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            {loading && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Box display="flex" justifyContent="center" mt={1}>
                  <Typography variant="body2" color="textSecondary">
                    {Math.round(progress)}%
                  </Typography>
                </Box>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || !dataFile || !dictFile}
              onClick={handleSubmit}
              sx={{ 
                px: { xs: 4, sm: 6 }, 
                py: 1.5,
                width: { xs: '100%', sm: 'auto' }
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Processando...' : 'Enviar Arquivos'}
            </Button>
          </Box>
        </Box>

        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseAlert} 
            severity={alert.severity} 
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
}

export default Upload;