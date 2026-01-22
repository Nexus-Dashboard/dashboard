import React, { useState } from 'react';
import { Dropdown, Form } from 'react-bootstrap';
import { Calendar, ChevronDown } from 'lucide-react';

// Custom Toggle
const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
  <div
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    style={{
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      fontWeight: '500',
      color: '#495057',
      transition: 'all 0.2s ease',
      width: '100%', // <-- ALTERAÇÃO 1: Garante que o botão ocupe todo o espaço
      justifyContent: 'space-between'
    }}
    onMouseEnter={(e) => {
      e.target.style.borderColor = '#0d6efd'
      e.target.style.backgroundColor = '#f8f9fa'
    }}
    onMouseLeave={(e) => {
      e.target.style.borderColor = '#dee2e6'
      e.target.style.backgroundColor = '#ffffff'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Calendar size={16} />
      {children}
    </div>
    <ChevronDown size={14} />
  </div>
));

// Custom Menu (sem alterações aqui)
const CustomMenu = React.forwardRef(
  ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
    const [value, setValue] = useState('');
    
    return (
      <div
        ref={ref}
        style={{
          ...style,
          backgroundColor: '#ffffff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          padding: '8px',
          minWidth: '250px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
        className={className}
        aria-labelledby={labeledBy}
      >
        <Form.Control
          autoFocus
          size="sm"
          placeholder="Buscar período..."
          onChange={(e) => setValue(e.target.value)}
          value={value}
          style={{
            marginBottom: '8px',
            borderRadius: '6px',
            border: '1px solid #dee2e6'
          }}
        />
        <ul className="list-unstyled" style={{ margin: 0 }}>
          {React.Children.toArray(children).filter(
            (child) =>
              !value || 
              child.props.children.toLowerCase().includes(value.toLowerCase())
          )}
        </ul>
      </div>
    );
  },
);

const PeriodDropdown = ({ 
  allHistoricalData = [], 
  surveyDateMap = new Map(), 
  selectedPeriods = null, 
  onPeriodChange,
  formatChartXAxis 
}) => {
  // ... (lógica interna sem alterações)
  const availablePeriods = React.useMemo(() => {
    if (!allHistoricalData.length) return [];
    
    return allHistoricalData.map(round => {
      const roundNumber = round.period.split("-R")[1];
      const dateLabel = surveyDateMap.get(roundNumber);
      const formattedLabel = formatChartXAxis(round.period, dateLabel);
      
      return {
        period: round.period,
        label: formattedLabel,
        year: parseInt(round.period.split("-R")[0]),
        round: parseInt(roundNumber),
        sortKey: `${round.period.split("-R")[0]}-${roundNumber.padStart(3, '0')}`
      };
    }).sort((a, b) => {
      // Ordenar por ano e depois por rodada (mais recente primeiro)
      if (b.year !== a.year) return b.year - a.year;
      return b.round - a.round;
    });
  }, [allHistoricalData, surveyDateMap, formatChartXAxis]);

    const relativePeriods = React.useMemo(() => {
        if (!availablePeriods.length) return [];
        
        const now = new Date();
        const currentYear = now.getFullYear();
        
        const periods = [];
        
        // Ordenar períodos do mais recente para o mais antigo
        const sortedPeriods = [...availablePeriods].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.round - a.round;
        });
        
        // Último mês (rodada mais recente)
        if (sortedPeriods.length > 0) {
        const mostRecent = sortedPeriods[0];
        periods.push({
            type: 'relative',
            key: 'last_month',
            label: 'Último Mês',
            periods: [mostRecent.period]
        });
        }
        
        // Últimos 3 meses (últimas 3 rodadas)
        if (sortedPeriods.length >= 3) {
        const last3 = sortedPeriods.slice(0, 3);
        periods.push({
            type: 'relative',
            key: 'last_3_months',
            label: 'Últimos 3 Meses',
            periods: last3.map(p => p.period)
        });
        }
        
        // Últimos 6 meses (últimas 6 rodadas)
        if (sortedPeriods.length >= 6) {
        const last6 = sortedPeriods.slice(0, 6);
        periods.push({
            type: 'relative',
            key: 'last_6_months',
            label: 'Últimos 6 Meses',
            periods: last6.map(p => p.period)
        });
        }
        
        // Ano atual
        const currentYearPeriods = availablePeriods.filter(p => p.year === currentYear);
        if (currentYearPeriods.length > 0) {
        periods.push({
            type: 'relative',
            key: 'current_year',
            label: 'Ano Atual',
            periods: currentYearPeriods.map(p => p.period)
        });
        }
        
        // Ano passado
        const lastYearPeriods = availablePeriods.filter(p => p.year === currentYear - 1);
        if (lastYearPeriods.length > 0) {
        periods.push({
            type: 'relative',
            key: 'last_year',
            label: 'Ano Passado',
            periods: lastYearPeriods.map(p => p.period)
        });
        }
        
        return periods;
    }, [availablePeriods]);

  const handlePeriodSelect = (selectedValue) => {
    if (selectedValue === 'all') {
      onPeriodChange?.(null);
    } else if (selectedValue.startsWith('relative_')) {
      // Período relativo
      const relativeKey = selectedValue.replace('relative_', '');
      const relativePeriod = relativePeriods.find(p => p.key === relativeKey);
      if (relativePeriod) {
        onPeriodChange?.({
          type: 'relative',
          key: relativePeriod.key,
          label: relativePeriod.label,
          periods: relativePeriod.periods
        });
      }
    } else {
      // Período específico
      const periodData = availablePeriods.find(p => p.period === selectedValue);
      if (periodData) {
        onPeriodChange?.({
          type: 'specific',
          ...periodData
        });
      }
    }
  };

  const getToggleText = () => {
    if (!selectedPeriods) {
      return "Todos os períodos";
    }
    if (selectedPeriods.type === 'relative') {
      return selectedPeriods.label;
    }
    return selectedPeriods.label;
  };


  if (!availablePeriods.length) return null;

  return (
    // ALTERAÇÃO 2: Container principal do dropdown também ocupará 100% da largura
    <Dropdown onSelect={handlePeriodSelect} style={{ width: '100%' }}>
      <Dropdown.Toggle as={CustomToggle} id="period-dropdown">
        {getToggleText()}
      </Dropdown.Toggle>

      <Dropdown.Menu as={CustomMenu}>
        <Dropdown.Item 
          eventKey="all"
          active={!selectedPeriods}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            margin: '2px 0',
            fontSize: '14px',
            fontWeight: !selectedPeriods ? '600' : '400',
            backgroundColor: !selectedPeriods ? '#e3f2fd' : 'transparent'
          }}
        >
          <strong>Todos os períodos</strong>
        </Dropdown.Item>
        
        {/* Períodos Relativos */}
        {relativePeriods.length > 0 && (
          <>
            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
            <div style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
              Períodos Rápidos
            </div>
            {relativePeriods.map((period) => (
              <Dropdown.Item 
                key={period.key}
                eventKey={`relative_${period.key}`}
                active={selectedPeriods?.type === 'relative' && selectedPeriods?.key === period.key}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  margin: '2px 0',
                  fontSize: '14px',
                  fontWeight: selectedPeriods?.type === 'relative' && selectedPeriods?.key === period.key ? '600' : '400',
                  backgroundColor: selectedPeriods?.type === 'relative' && selectedPeriods?.key === period.key ? '#e3f2fd' : 'transparent'
                }}
              >
                {period.label} ({period.periods.length} rodada{period.periods.length > 1 ? 's' : ''})
              </Dropdown.Item>
            ))}
          </>
        )}
        
        {/* Períodos Específicos */}
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
        <div style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
          Rodadas Específicas
        </div>
        
        {availablePeriods.map((period) => (
          <Dropdown.Item 
            key={period.period}
            eventKey={period.period}
            active={selectedPeriods?.type === 'specific' && selectedPeriods?.period === period.period}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              margin: '2px 0',
              fontSize: '14px',
              fontWeight: selectedPeriods?.type === 'specific' && selectedPeriods?.period === period.period ? '600' : '400',
              backgroundColor: selectedPeriods?.type === 'specific' && selectedPeriods?.period === period.period ? '#e3f2fd' : 'transparent'
            }}
          >
            {period.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default PeriodDropdown;