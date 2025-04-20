import React, { useState, useMemo } from 'react';
import ApiBase from '../service/ApiBase';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveLine } from '@nivo/line';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';

export default function Dashboard() {
  // 1) seleciona survey e pergunta
  const [surveyId, setSurveyId] = useState('');
  const [questionKey, setQuestionKey] = useState('');

  // 2) busca lista de surveys
  const { data: surveys, isLoading: sLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => ApiBase.get('/api/surveys').then(r => r.data)
  })
  
  // 3) busca respostas quando surveyId mudar
  const { data: responses, isLoading: rLoading } = useQuery({
    queryKey: ['responses', surveyId],
    queryFn: () => ApiBase.get(`/api/responses/${surveyId}`).then(r => r.data),
    enabled: Boolean(surveyId)
  })

  // 4) extrai lista de perguntas do survey selecionado
  const questions = useMemo(() => {
    const s = surveys?.find(s => s._id === surveyId);
    return s?.variables || [];
  }, [surveys, surveyId]);

  // 5) monta série histórica: 
  // para cada survey, conta % de cada resposta na pergunta selecionada
  const chartData = useMemo(() => {
    if (!responses || !questionKey) return [];
    // agrupa por surveyId (cada objeto já é de uma única survey)
    // aqui usamos createdAt para ordenar “no tempo”
    const byDate = [...responses].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    // mapeia valor → série de pontos
    const seriesMap = {};
    byDate.forEach(resp => {
      const ans = resp.answers.find(a => a.key === questionKey);
      const val = ans?.value ?? 'Nulo';
      const date = new Date(resp.createdAt).toLocaleDateString();
      seriesMap[val] = seriesMap[val] || [];
      seriesMap[val].push({ x: date, y: 1 });
    });
    // converter contagens em % por data
    const dates = [...new Set(byDate.map(r=> new Date(r.createdAt).toLocaleDateString()))];
    return Object.entries(seriesMap).map(([key, points]) => ({
      id: key,
      data: dates.map(d => {
        const total = byDate.filter(r=> new Date(r.createdAt).toLocaleDateString() === d).length;
        const count = points.filter(p=> p.x === d).length;
        return { x: d, y: total ? (count/total)*100 : 0 };
      })
    }));
  }, [responses, questionKey]);

  if (sLoading || (surveyId && rLoading)) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Survey</InputLabel>
          <Select
            value={surveyId}
            label="Survey"
            onChange={e => {
              setSurveyId(e.target.value);
              setQuestionKey('');
            }}
          >
            {surveys.map(s => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} disabled={!surveyId}>
          <InputLabel>Pergunta</InputLabel>
          <Select
            value={questionKey}
            label="Pergunta"
            onChange={e => setQuestionKey(e.target.value)}
          >
            {questions.map(q => (
              <MenuItem key={q.key} value={q.key}>
                {q.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ height: 400, p: 2 }}>
        {chartData.length ? (
          <ResponsiveLine
            data={chartData}
            margin={{ top: 40, right: 20, bottom: 60, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 100, stacked: false, reverse: false }}
            axisLeft={{ legend: 'Percentual (%)', legendPosition: 'middle', legendOffset: -50 }}
            axisBottom={{ legend: 'Data', legendPosition: 'middle', legendOffset: 40 }}
            enablePoints={true}
            pointSize={8}
            useMesh={true}
            legends={[{
              anchor: 'bottom-right', direction: 'column',
              translateX: 100, itemWidth: 80, itemHeight: 20,
              symbolSize: 12, symbolShape: 'circle'
            }]}
          />
        ) : (
          <Typography align="center" color="text.secondary" p={4}>
            Selecione uma survey e uma pergunta para ver o gráfico.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}