"use client"
import { Box, Typography } from "@mui/material"
import { ResponsiveLine } from "@nivo/line"
import { createOrderedChartLegend } from "../../utils/questionGrouping"
import PeriodDropdown from "./PeriodFilter"

export default function ChartCard({
  title,
  allHistoricalData = [],
  selectedChartData = [],
  numberOfRoundsToShow = 10,
  onRoundsChange,
  chartData = [],
  chartRef,
  chartColorFunc,
  getXAxisLabel,
  // Novas props para o dropdown de período
  surveyDateMap = new Map(),
  selectedPeriod = null,
  onPeriodChange,
  formatChartXAxis
}) {
  // Componente de tooltip customizado que usa o sistema nativo do Nivo
  const CustomTooltip = ({ point }) => {
    if (!point) return null

    const percentage = point.data.exactValue || point.data.y
    const period = point.data.x

    return (
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.92)",
          color: "white",
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "13px",
          lineHeight: "1.4",
          maxWidth: "280px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)"
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div 
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: point.serieColor,
              borderRadius: '50%',
              marginRight: '8px',
              flexShrink: 0
            }}
          ></div>
          <strong style={{ fontSize: '14px' }}>{period}</strong>
        </div>
        <div style={{ 
          color: point.serieColor, 
          fontWeight: 'bold',
          marginBottom: '4px',
          fontSize: '14px'
        }}>
          {point.serieId}: {percentage.toFixed(1)}%
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '12px' 
        }}>
          Dados da pesquisa
        </div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-card-content">
        <Typography className="card-title-custom">{title || "Análise Temporal"}</Typography>

        {/* Linha com período e dropdown lado a lado */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '13px', fontWeight: '500' }}>
              Filtrar por período:
            </Typography>
            <PeriodDropdown
              allHistoricalData={allHistoricalData}
              surveyDateMap={surveyDateMap}
              selectedPeriods={selectedPeriod}
              onPeriodChange={onPeriodChange}
              formatChartXAxis={formatChartXAxis}
            />
          </Box>
        </Box>

        {allHistoricalData.length > 1 && (
          <Box sx={{ mb: 3, px: 1 }}>
            {selectedChartData.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Período: {getXAxisLabel(selectedChartData[0])} até{" "}
                {getXAxisLabel(selectedChartData[selectedChartData.length - 1])}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              {selectedPeriod ? (
                selectedPeriod.type === 'relative' ? 
                  `Exibindo ${selectedChartData.length} rodadas do período: ${selectedPeriod.label}` :
                  `Exibindo rodada específica: ${selectedPeriod.label}`
              ) : (
                `Exibindo as últimas ${numberOfRoundsToShow} de ${allHistoricalData.length} rodadas`
              )}
            </Typography>
            {!selectedPeriod && (
              <>
                <input
                  type="range"
                  min={1}
                  max={allHistoricalData.length || 1}
                  value={numberOfRoundsToShow}
                  onChange={(e) => onRoundsChange?.(Number(e.target.value))}
                  className="single-range-slider"
                  style={{ direction: "rtl" }}
                  aria-label="Selecionar número de rodadas"
                />
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Mais rodadas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Menos rodadas
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        <div ref={chartRef} className="chart-container">
          {chartData.length > 0 ? (
            <ResponsiveLine
              data={chartData}
              margin={{ top: 20, right: 110, bottom: 60, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              yFormat=" >-.1f"
              curve="monotoneX"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -15,
                legend: "Período",
                legendOffset: 50,
                legendPosition: "middle",
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "% (Porcentagem)",
                legendOffset: -50,
                legendPosition: "middle",
              }}
              pointSize={8}
              pointColor={{ theme: "background" }}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabelYOffset={-12}
              useMesh={true}
              colors={chartColorFunc}
              
              // Usar tooltip customizado do Nivo
              tooltip={CustomTooltip}
              
              legends={[
                {
                  data: createOrderedChartLegend(chartData, chartColorFunc),
                  anchor: "right",
                  direction: "column",
                  justify: false,
                  translateX: 100,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.85,
                  symbolSize: 12,
                  symbolShape: "circle",
                },
              ]}
            />
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <Typography variant="body1" color="text.secondary">
                {selectedPeriod 
                  ? `Nenhum dado disponível para o período selecionado: ${selectedPeriod.label}`
                  : "Nenhum dado disponível para o período ou filtros selecionados"
                }
              </Typography>
            </Box>
          )}
        </div>
      </div>
    </div>
  )
}