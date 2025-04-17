import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import ApiBase from '../service/ApiBase'
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
      setProgress((oldProgress) => {
        const newProgress = Math.min(oldProgress + Math.random() * 5, 100);
        if (newProgress === 100) {
          clearInterval(timer);
        }
        return newProgress;
      });
    }, 200);
    return timer;
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

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const truncateFileName = (fileName, maxLength = 25) => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    
    if (nameWithoutExtension.length <= maxLength - extension.length - 3) {
      return fileName;
    }
    
    return `${nameWithoutExtension.substring(0, maxLength - extension.length - 4)}...${extension}`;
  };

  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsBinaryString(file);
      reader.onload = (e) => {
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(jsonData);
      };
      reader.onerror = (error) => reject(error);
    });
  };
 
  const handleSubmit = async () => {
    if (!dataFile || !dictFile) {
      showAlert('error', "Por favor, selecione os dois arquivos.");
      return;
    }

    try {
      setLoading(true);
      setActiveStep(1);
      const progressTimer = simulateProgress();

      // 1) lê os dois arquivos
        const dataJson = await readExcel(dataFile);
        const dictJson = await readExcel(dictFile);

        // 2) cria um objeto coluna→rótulo
        const dictMap = dictJson.reduce((map, { coluna, rotulo }) => {
        map[coluna] = rotulo;
        return map;
        }, {});

        // 3) renomeia cada campo de cada registro usando o rótulo
        const combinedData = dataJson.map(row =>
        Object.fromEntries(
            Object.entries(row).map(([col, val]) => [
            dictMap[col] || col,
            val
            ])
        )
        );

        // 4) monta o payload só com o array rotulado
        const payload = { data: combinedData };


      setActiveStep(2);
      console.log(payload)

      const response = await ApiBase.put('/api/data', payload);
      console.log(response)
      clearInterval(progressTimer);
      setProgress(100);
      setLoading(false);

      if (response.ok) {
        showAlert('success', "Dados enviados com sucesso!");
        setDataFile(null);
        setDictFile(null);
        setActiveStep(0);
      } else {
        showAlert('error', "Erro no envio dos dados!");
      }
    } catch (error) {
      console.error("Erro ao ler ou enviar os arquivos", error);
      showAlert('error', "Ocorreu um erro no processamento dos arquivos.");
      setLoading(false);
      setActiveStep(0);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 4 }, 
          borderRadius: 2,
          bgcolor: theme.palette.background.paper
        }}
      >
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          align="center" 
          gutterBottom 
          color="primary"
          sx={{ mb: 3 }}
        >
          Upload de Dados Excel
        </Typography>
        
        <Stepper 
          activeStep={activeStep} 
          sx={{ 
            mb: 4,
            display: { xs: 'none', sm: 'flex' }
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box 
          sx={{ 
            display: { xs: 'flex', sm: 'none' },
            justifyContent: 'center',
            mb: 3
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Etapa {activeStep + 1} de {steps.length}: <strong>{steps[activeStep]}</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Arquivo de Dados Card */}
            <Paper
            variant="outlined"
            sx={{
               /* width: '100%', */
               /* removido width para não somar ao padding e estourar */
                p: { xs: 2, sm: 3 },
                borderRadius: 1,
                borderColor: dataFile ? 'success.main' : 'grey.300',
                borderWidth: dataFile ? 2 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
               boxSizing: 'border-box',         // garante que padding/border cabem na largura
               maxWidth: '100%'                  // evita qualquer valor acima do container
            }}
            >
            <Box display="flex" alignItems="center" mb={isMobile ? 2 : 0}>
              <TableChartIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">Arquivo de Dados</Typography>
            </Box>
            <Button
              component="label"
              variant="contained"
              startIcon={dataFile ? <CheckCircleIcon /> : <CloudUploadIcon />}
              color={dataFile ? "success" : "primary"}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {dataFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
              <input
                type="file"
                accept=".xlsx, .xls"
                hidden
                onChange={handleDataFile}
              />
            </Button>
            {dataFile && (
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
                <Tooltip title={dataFile.name} placement="top">
                  <Typography 
                    variant="body2" 
                    noWrap 
                    sx={{
                      maxWidth: { xs: '70vw', sm: '350px', md: '400px' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {truncateFileName(dataFile.name)} ({(dataFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Tooltip>
              </Box>
            )}
          </Paper>

          {/* Dicionário de Variáveis Card */}
          <Paper
            variant="outlined"
            sx={{
               /* width: '100%', */
               /* removido width para não somar ao padding e estourar */
                p: { xs: 2, sm: 3 },
                borderRadius: 1,
                borderColor: dataFile ? 'success.main' : 'grey.300',
                borderWidth: dataFile ? 2 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
               boxSizing: 'border-box',         // garante que padding/border cabem na largura
               maxWidth: '100%'                  // evita qualquer valor acima do container
            }}
            >
            <Box display="flex" alignItems="center" mb={isMobile ? 2 : 0}>
              <DescriptionIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">Dicionário de Variáveis</Typography>
            </Box>
            <Button
              component="label"
              variant="contained"
              startIcon={dictFile ? <CheckCircleIcon /> : <CloudUploadIcon />}
              color={dictFile ? "success" : "primary"}
              size={isMobile ? "small" : "medium"}
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