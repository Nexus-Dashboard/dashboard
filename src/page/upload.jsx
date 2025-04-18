// upload.jsx
import React, { useState } from 'react';
import SparkMD5 from 'spark-md5';
import * as XLSX from 'xlsx';
import ApiBase from '../service/ApiBase';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
  LinearProgress,
  useMediaQuery,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';

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
      setProgress((old) => Math.min(old + Math.random() * 5, 100));
      if (progress >= 100) clearInterval(timer);
    }, 200);
    return timer;
  };

  const computeFileHash = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = e => {
        const hash = SparkMD5.ArrayBuffer.hash(e.target.result);
        resolve(hash);
      };
      reader.onerror = reject;
    });
  };

  const showAlert = (severity, message) => setAlert({ open: true, severity, message });
  const handleCloseAlert = () => setAlert((a) => ({ ...a, open: false }));

  const truncateFileName = (fileName, maxLength = 25) => {
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const base = fileName.substring(0, fileName.lastIndexOf('.'));
    if (base.length <= maxLength - ext.length - 3) return fileName;
    return `${base.substring(0, maxLength - ext.length - 4)}...${ext}`;
  };

  // Substitua sua função readExcel antiga por esta:

  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsBinaryString(file);
      reader.onload = (e) => {
        const wb    = XLSX.read(e.target.result, { type: 'binary' });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        // 1) encontra a linha de cabeçalho real (que contém "idEntrevista")
        const headerIdx = rows.findIndex(r => r.includes('idEntrevista'));
        if (headerIdx < 0) return reject(new Error("Cabeçalho 'idEntrevista' não encontrado"));
        // 2) mapeia e limpa cada título
        const header = rows[headerIdx].map(h => String(h).trim());
        // 3) monta objeto para cada linha subsequente
        const data = rows.slice(headerIdx + 1).map(r => {
          const obj = {};
          header.forEach((key, i) => {
            if (key) obj[key] = r[i];
          });
          return obj;
        });
        resolve(data);
      };
      reader.onerror = reject;
    });
  };
  // Função readDictFile atualizada
  const readDictFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsBinaryString(file);
      reader.onload = (e) => {
        const wb   = XLSX.read(e.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Procurar linha que contenha Variável, Rótulo e Nível de medição
        const headerIdx = rows.findIndex(
          r => r.includes('Variável') && r.includes('Rótulo') && r.includes('Nível de medição')
        );
        if (headerIdx < 0)
          return reject(new Error("Cabeçalho 'Variável'/'Rótulo' não encontrado"));

        const header = rows[headerIdx];
        const varIdx = header.indexOf('Variável');
        const rotIdx = header.indexOf('Rótulo');
        const medIdx = header.indexOf('Nível de medição');

        const map = {};
        rows.slice(headerIdx + 1)
          // manter só as linhas de definição (onde Nível de medição não é vazio)
          .filter(r => r[varIdx])
          .forEach(r => {
            map[String(r[varIdx]).trim()] = {
              label: String(r[rotIdx]).trim(),
              type:  medIdx >= 0 && r[medIdx] ? String(r[medIdx]).trim() : 'text'
            };
          });

        resolve(map);
      };
      reader.onerror = reject;
    });
  };


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
    if (!dataFile || !dictFile) {
      showAlert('error', 'Por favor, selecione os dois arquivos.');
      return;
    }
    try {

      // 0) calcula hash do arquivo de dados
     const fileHash = await computeFileHash(dataFile);
      setLoading(true);
      setActiveStep(1);
      const progressTimer = simulateProgress();

      // 1) lê arquivos
      const dataJson = await readExcel(dataFile);
      const dictMap = await readDictFile(dictFile);

      // 2) renomeia cada campo com todas as melhorias:
      const combinedData = dataJson.map(row =>
        Object.fromEntries(
          Object.entries(row).map(([col, val]) => {
            const varName = col.trim();
            let label = dictMap[varName]?.label || varName;
            label = label
              .replace(/['"]/g, '')
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/Entrevistador:.*/gi, '')
              .trim();
            return [ varName, { label, value: val } ];
          })
        )
      ); 

      
      // 3) extrai array de variables para o Survey
      const variables = Object.entries(dictMap).map(([key, info]) => ({
        key,
        label: info.label.trim(),
        type: info.type || 'text'
      }));

      // 4) monta surveyInfo (nome, mês, ano e variables)
      const surveyName = dictFile.name.replace(/\.[^.]+$/, '');
      const m = surveyName.match(/Tracking\s+(\w+)(?:\s+(\d{4}))?/i);
      const month = m?.[1] || null;
      const year  = m?.[2] ? Number(m[2]) : new Date().getFullYear();
      const surveyInfo = { name: surveyName, month, year, variables, fileHash };

      // 5) monta payload completo
      const payload = { surveyInfo, data: combinedData };

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