// Set locale
// https://github.com/d3/d3-format/blob/v1.4.4/README.md#formatDefaultLocale
d3.formatDefaultLocale({
  decimal: ".",
  thousands: "'",
  grouping: [3],
  currency: ["", "\u00a0CHF"],
});
// https://github.com/d3/d3-time-format/blob/v2.2.3/README.md#timeFormatDefaultLocale
d3.timeFormatDefaultLocale({
  dateTime: "%A, der %e. %B %Y, %X",
  date: "%d.%m.%Y",
  time: "%H:%M:%S",
  periods: ["vormittags", "nachmittags"],
  days: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  shortDays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  months: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  shortMonths: [
    "Jan",
    "Feb",
    "Mrz",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ],
});

// Line chart
// https://observablehq.com/@d3/multi-line-chart
// Line Chart with Tooltip
// https://observablehq.com/@d3/line-chart-with-tooltip

const DATA_URL = "https://raw.githubusercontent.com/CGRBZH/zhiz2020_vis/master/zhizh_antrieb.csv";

// Process data
// https://github.com/d3/d3-fetch/blob/v1.1.2/README.md#csv
d3.csv(DATA_URL).then((csv) => {
  const regions = csv.columns.slice(1);
  // Track selected regions
  const selectedRegions = {};
  regions.forEach((region) => {
    selectedRegions.region = false;
  });

  // Data structure follows // https://observablehq.com/@d3/multi-line-chart
  const data = {
    y: "Anzahl, in Tausend",
    series: regions.map((region) => ({
      name: region,
      values: csv.map((d) => +d[region]),
    })),
    dates: csv.map((d) => d3.utcParse("%Y")(d.jahr)), // https://github.com/d3/d3-time-format/blob/v2.2.3/README.md#utcParse
  };

  // Dimension
  let width;
  const height = 500;
  const margin = { top: 20, right: 90, bottom: 70, left: 90 };

  // Scale
  // https://github.com/d3/d3-scale/blob/v2.2.2/README.md#scaleUtc
  const x = d3.scaleUtc().domain(d3.extent(data.dates)); // https://github.com/d3/d3-array/blob/v1.2.4/README.md#extent
  // https://github.com/d3/d3-scale/blob/v2.2.2/README.md#scaleLinear
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(data.series, (d) => d3.min(d.values)), // https://github.com/d3/d3-array/blob/v1.2.4/README.md#min
      d3.max(data.series, (d) => d3.max(d.values)), // https://github.com/d3/d3-array/blob/v1.2.4/README.md#max
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);
  // https://github.com/d3/d3-scale/blob/v2.2.2/README.md#scaleOrdinal
  const color = d3
    .scaleOrdinal()
    .domain(regions)
    .range([
      "#418AA1", 
      "#5AB08D",
      "#E6DB78",
      "#F4B184",
      "#F3A79F",
      "#A594AF",
    ]); // Colors from categorical 12-color https://statistikzh.github.io/statR/#farben / https://spectrum.adobe.com/page/color-for-data-visualization/
  const mutedColor = "#EEEEEE";

  // Axis
  function xAxis(g) {
    g.attr("transform", `translate(0,${height - margin.bottom})`).call(
      d3
        .axisBottom(x) // https://github.com/d3/d3-axis/blob/v1.0.12/README.md#axisBottom
        .tickSizeOuter(0)
    );
  }
  function yAxis(g) {
    g.attr("transform", `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(y) // https://github.com/d3/d3-axis/blob/v1.0.12/README.md#axisLeft
      )
      .call((g) => g.select(".domain")) //.remove() to remove yAxis line
      .call((g) =>
        g
          .select(".tick:last-of-type text")
          .clone()
          .attr("x", 5)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .text(data.y)
      );
  }

  // Line
  // https://github.com/d3/d3-shape/blob/v1.3.7/README.md#line
  const line = d3
    .line()
    .defined((d) => !isNaN(d))
    .x((d, i) => x(data.dates[i]))
    .y((d) => y(d));

  // Containers
  const container = d3.select("body").append("div").attr("class", "container");
  const legend = container.append("div").attr("class", "swatches");
  const svg = container.append("svg");

  // Render chart
  const gXAxis = svg.append("g");
  svg.append("g").call(yAxis);
  const path = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(data.series)
    .join("path")
    .style("mix-blend-mode", "multiply")
    .attr("stroke", (d) => color(d.name))
    .attr("d", (d) => line(d.values));

  svg.call(hover, path);
  const tooltip = svg.append("g").attr("class", "tooltip");

  // Render legend
  // Code is modified from swatches from https://observablehq.com/@d3/color-legend
  const swatch = legend
    .selectAll(".swatch")
    .data(regions)
    .join("span")
    .attr("class", "swatch")
    .style("--stroke-color", (d) => color(d))
    .text((d) => d)
    .on("click", toggleRegion);

  // Start with Kanton Zürich selected
  toggleRegion("Kanton Zürich");

  resize();
  window.addEventListener("resize", resize);
  function resize() {
    width = container.node().clientWidth;
    svg.attr("viewBox", [0, 0, width, height]);
    x.range([margin.left, width - margin.right]);
    gXAxis.call(xAxis);
    path.attr("d", (d) => line(d.values));
  }

  function hover(svg, path) {
    svg.on("mousemove", moved).on("mouseenter", entered).on("mouseleave", left);

    const dot = svg.append("g").attr("display", "none");

    dot.append("circle").attr("r", 3.5);

    function moved() {
      d3.event.preventDefault(); // https://github.com/d3/d3-selection#event
      const mouse = d3.mouse(this); // https://github.com/d3/d3-selection#mouse
      const xm = x.invert(mouse[0]);
      const ym = y.invert(mouse[1]);
      const i1 = d3.bisectLeft(data.dates, xm, 1); // https://github.com/d3/d3-array#bisectLeft
      const i0 = i1 - 1;
      const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0;
      const s = d3.least(
        // https://github.com/d3/d3-array#least
        data.series.filter((d) => selectedRegions[d.name]), // Only selected regions are used to determine tooltip
        (d) => Math.abs(d.values[i] - ym)
      );
      if (!s) return;
      path.filter((d) => d === s).raise(); // https://github.com/d3/d3-selection#selection_raise
      dot
        .attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`)
        .attr("fill", color(s.name));

      tooltip
        .attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`)
        .call(
          callout,
          [
            `Antrieb: ${s.name}`,
            `Jahr: ${d3.utcFormat("%Y")(data.dates[i])}`,
            `Anzahl: ${d3.format(".2f")(s.values[i])}`,
          ],
          color(s.name)
        );
    }

    function entered() {
      dot.attr("display", null);
    }

    function left() {
      dot.attr("display", "none");
      tooltip.call(callout, null);
    }
  }

  // https://observablehq.com/@d3/line-chart-with-tooltip
  function callout(g, value, color) {
    if (!value) return g.style("display", "none");
    g.style("display", null).style("pointer-events", "none");

    const path = g
      .selectAll("path")
      .data([null])
      .join("path")
      .attr("fill", "#fff")
      .attr("fill-opacity", 0.85)
      .attr("stroke-width", 1.5)
      .attr("stroke", color);

    const text = g
      .selectAll("text")
      .data([null])
      .join("text")
      .call((text) =>
        text
          .selectAll("tspan")
          .data(value)
          .join("tspan")
          .attr("x", 0)
          .attr("y", (d, i) => `${i * 1.5}em`)
          .text((d) => d)
      );

    const { x, y, width: w, height: h } = text.node().getBBox(); // https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox

    text.attr("transform", `translate(${-w / 2},${15 - y})`);
    path.attr(
      "d",
      `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`
    );
  }

  function toggleRegion(region) {
    // toggle selected
    selectedRegions[region] = !selectedRegions[region];

    // Update legend
    swatch.style("--fill-color", (d) => {
      if (selectedRegions[d]) {
        return color(d);
      } else {
        return mutedColor;
      }
    });

    // Update lines
    path.attr("stroke", (d) => {
      if (selectedRegions[d.name]) {
        return color(d.name);
      } else {
        return mutedColor;
      }
    });
  }
});
