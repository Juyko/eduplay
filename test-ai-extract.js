function buildMaterials(item) {
  const materials = [];

  // Grafik verisi — AI farklı key adları kullanabilir
  const graphRaw = item.graph || item.chart || item.grafik || null;
  if (graphRaw && typeof graphRaw === 'object') {
    // Önce { labels, values } formatını kontrol et — values array of numbers ise rawData'ya ATMA
    let rawData = null;

    if (Array.isArray(graphRaw.labels)) {
      const yArr = graphRaw.values || graphRaw.counts || graphRaw.numbers;
      if (Array.isArray(yArr)) {
        rawData = graphRaw.labels.map((label, i) => ({
          x: String(label),
          y: Number(yArr[i]) || 0
        }));
      }
    }

    // data / dataset / points — yalnızca nesne dizisi olarak kullan
    if (!rawData) {
      const candidate = graphRaw.data || graphRaw.dataset || graphRaw.points;
      if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === 'object') {
        rawData = candidate;
      }
    }

    // values dizisi — sadece nesne dizisiyse kullan (sayı dizisi değil)
    if (!rawData && Array.isArray(graphRaw.values)) {
      if (graphRaw.values.length > 0 && typeof graphRaw.values[0] === 'object') {
        rawData = graphRaw.values;
      }
    }

    if (Array.isArray(rawData) && rawData.length > 0) {
      const normalizedData = rawData
        .map((d) => {
          if (typeof d !== 'object' || d === null) return null;
          const xVal = d.x ?? d.label ?? d.name ?? d.category ?? d.key ?? Object.values(d)[0];
          const yRaw = d.y ?? d.value ?? d.count ?? d.number ?? d.amount ?? Object.values(d)[1];
          const yVal = Number(yRaw);
          if (xVal === undefined || isNaN(yVal)) return null;
          return { x: String(xVal), y: yVal };
        })
        .filter((d) => d !== null);

      if (normalizedData.length >= 2) {
        materials.push({
          type: 'graph',
          title: graphRaw.title || graphRaw.baslik || graphRaw.caption || 'Grafik',
          graphType: graphRaw.graphType || graphRaw.type || graphRaw.chartType || graphRaw.chart_type || 'bar',
          xLabel: graphRaw.xLabel || graphRaw.x_label || graphRaw.xAxis || graphRaw.xlabel || '',
          yLabel: graphRaw.yLabel || graphRaw.y_label || graphRaw.yAxis || graphRaw.ylabel || '',
          data: normalizedData
        });
      }
    }
  }
  return materials;
}

const testItem = {
    "question": "Aşağıdaki grafiğe göre en çok satılan ürün hangisidir?",
    "options": ["Elma", "Armut", "Muz", "Çilek"],
    "answer": "Muz",
    "type": "MULTIPLE_CHOICE",
    "graph": {
      "title": "Meyve Satışları",
      "type": "bar",
      "labels": ["Elma", "Armut", "Muz", "Çilek"],
      "values": [10, 5, 20, 8]
    }
};

console.log(JSON.stringify(buildMaterials(testItem), null, 2));
