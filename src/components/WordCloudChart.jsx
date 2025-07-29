"use client"

import { useMemo } from "react"
import WordCloud from "react-d3-cloud"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "d3-scale-chromatic"

const WordCloudChart = ({ data }) => {
  const words = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    const wordCounts = data.reduce((acc, item) => {
      const text = item.response
      if (text && text.toLowerCase() !== "não sabe" && text.toLowerCase() !== "não respondeu" && text !== "#null!") {
        const count = item.count
        acc[text] = (acc[text] || 0) + count
      }
      return acc
    }, {})

    return Object.entries(wordCounts).map(([text, value]) => ({ text, value }))
  }, [data])

  const schemeCategory10Scale = scaleOrdinal(schemeCategory10)

  const fontSize = (word) => Math.log2(word.value) * 5 + 10
  const rotate = () => (Math.random() > 0.7 ? 90 : 0)

  if (words.length === 0) {
    return <p>Nenhuma palavra para exibir.</p>
  }

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <WordCloud
        data={words}
        width={500}
        height={300}
        font="Inter, sans-serif"
        fontSize={fontSize}
        rotate={rotate}
        padding={5}
        fill={(d, i) => schemeCategory10Scale(i)}
      />
    </div>
  )
}

export default WordCloudChart
