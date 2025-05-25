import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, Button, Collapse, Spinner } from 'react-bootstrap';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';
import './dashboard.css';
import ApiBase from '../service/ApiBase';

export default function Pesquisa() {
  const [indices, setIndices] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({ label: '', key: '', type: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  // 1. Load indices.json and all survey responses
  useEffect(() => {
    async function fetchData() {
      try {
        const idxRes = await ApiBase.get('/api/surveys');
        const idxData = idxRes.data;
        setIndices(idxData);

        // Load responses for each survey
        const responsesPromises = idxData.map(s =>
          ApiBase.get(`/api/responsesFlat/${s._id}`).then(r => ({ survey: s, data: r.data }))
        );
        const responses = await Promise.all(responsesPromises);
        setAllResponses(responses);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. Derive question groups
  const questionGroups = useMemo(() => {
    const labelMap = {};
    indices.forEach(survey => {
      survey.variables.forEach(v => {
        const lbl = v.label;
        labelMap[lbl] = labelMap[lbl] || [];
        labelMap[lbl].push({ key: v.key, survey });
      });
    });
    const historic = [];
    const unique = {};
    Object.entries(labelMap).forEach(([label, arr]) => {
      if (arr.length > 1) {
        historic.push({ label, entries: arr });
      } else {
        const sId = arr[0].survey._id;
        unique[sId] = unique[sId] || { survey: arr[0].survey, entries: [] };
        unique[sId].entries.push({ label, key: arr[0].key });
      }
    });
    return { historic, unique: Object.values(unique) };
  }, [indices]);

  // 3. Handle selection
  function handleSelect(e) {
    const [type, label] = e.target.value.split('||');
    setSelected({ type, label });
    setFilters({});
  }

  // 4. Aggregate data based on selection and filters
  const chartData = useMemo(() => {
    if (!selected.label) return null;
    if (selected.type === 'historic') {
      // build time series across surveys
      const grouped = allResponses
        .filter(r => r.survey.variables.some(v => v.label === selected.label))
        .map(r => {
          // count by response option, applying filters
          const counts = {};
          r.data.forEach(item => {
            if (item.questionLabel !== selected.label) return;
            // apply dem filters
            let ok = true;
            Object.entries(filters).forEach(([k, v]) => {
              if (v && item[k] !== v) ok = false;
            });
            if (!ok) return;
            counts[item.response] = (counts[item.response] || 0) + 1;
          });
          return { date: r.survey.date, ...counts };
        });
      return grouped;
    } else if (selected.type === 'unique') {
      // find single survey group
      const grp = questionGroups.unique.find(u =>
        u.entries.some(ent => ent.label === selected.label)
      );
      if (!grp) return null;
      const resp = allResponses.find(r => r.survey._id === grp.survey._id);
      const counts = {};
      resp.data.forEach(item => {
        if (item.questionLabel !== selected.label) return;
        let ok = true;
        Object.entries(filters).forEach(([k, v]) => {
          if (v && item[k] !== v) ok = false;
        });
        if (!ok) return;
        counts[item.response] = (counts[item.response] || 0) + 1;
      });
      return Object.entries(counts).map(([response, count]) => ({ response, count }));
    }
    return null;
  }, [selected, allResponses, filters, questionGroups]);

  if (loading) {
    return <div className="loading"><Spinner animation="border" /> Carregando...</div>;
  }

  return (
    <Container fluid className="dashboard">
      <Row className="align-items-center mb-3">
        <Col md={6}>
          <Form.Label>Selecione a pergunta:</Form.Label>
          <Form.Select onChange={handleSelect}>
            <optgroup label="Com histórico">
              {questionGroups.historic.map(q => (
                <option key={q.label} value={[ 'historic', q.label ]}><strong>{q.label}</strong></option>
              ))}
            </optgroup>
            {questionGroups.unique.map(g => (
              <optgroup key={g.survey._id} label={`Únicas - ${g.survey.title}`}>
                {g.entries.map(e => (
                  <option key={e.key} value={[ 'unique', e.label ]}>{e.label}</option>
                ))}
              </optgroup>
            ))}
          </Form.Select>
        </Col>
        <Col md={6} className="text-end">
          <Button variant="outline-primary" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </Button>
        </Col>
      </Row>

      <Collapse in={showFilters} className="mb-4">
        <div className="filters-panel">
          <Row>
            {/* Exemplo de filtro de sexo */}
            <Col md={3}>
              <Form.Label>Sexo</Form.Label>
              <Form.Select onChange={e => setFilters(f => ({...f, gender: e.target.value}))}>
                <option value="">Todos</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </Form.Select>
            </Col>
            {/* Adicione demais filtros: idade, renda, região */}
          </Row>
        </div>
      </Collapse>

      <Row>
        <Col>
          {selected.type === 'historic' && chartData && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData[0] || {}).filter(k => k !== 'date').map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {selected.type === 'unique' && chartData && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="response" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Col>
      </Row>
    </Container>
  );
}