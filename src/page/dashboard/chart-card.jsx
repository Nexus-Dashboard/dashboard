"use client"
import { Box, Typography } from "@mui/material"
import { ResponsiveLine } from "@nivo/line"

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
}) {
  return (
    <div className="chart-card">
      <div className="chart-card-content">
        <Typography className="card-title-custom">{title || "Análise Temporal"}</Typography>

        {allHistoricalData.length > 1 && (
          <Box sx={{ mb: 3, px: 1 }}>
            {selectedChartData.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Período: {getXAxisLabel(selectedChartData[0])} até{" "}
                {getXAxisLabel(selectedChartData[selectedChartData.length - 1])}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Exibindo as últimas {numberOfRoundsToShow} de {allHistoricalData.length} rodadas
            </Typography>
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
                legend: "Porcentagem (%)",
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
              legends={[
                {
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
                Nenhum dado disponível para o período ou filtros selecionados
              </Typography>
            </Box>
          )}
        </div>
      </div>
    </div>
  )
}
