var tooltip = d3.select("body")
	.append("div")
	.attr("class", "tooltip")
	.style("position", "absolute")
	.style("z-index", "10")
	.style("visibility", "hidden");

var feature;

d3.selection.prototype.moveToFront = function () {
	return this.each(function () {
		this.parentNode.appendChild(this);
	});
};

var projection = d3.geo.azimuthal()
    .scale(380)
    .origin([-71.03, 42.37])
    .mode("orthographic")
    .translate([400, 400]);

var circle = d3.geo.greatCircle()
    .origin(projection.origin());

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#container").append("svg:svg")
	.on("mousedown", mousedown);

//Draw the water
var water = svg.append("svg:circle")
	.attr("cx", 400)
	.attr("cy", 400)
	.attr("r", 380);

var dataByCountry = d3.map();

queue()
    .defer(d3.json, "world-countries.json")
    .defer(d3.csv, "Population Mid-2012.csv")
    .await(ready);

var scales = {};

function ready(error, countries, population) {

	population.forEach(function (d) {
		dataByCountry[d.country] =
			{
				raw: +d.data.replace(/,/gi, ''),
				display: d.data
			}
	});

	scales.quantize = d3.scale.quantize()
			.domain([d3.min(_.map(dataByCountry, function (entry) { return entry.raw; })), d3.max(_.map(dataByCountry, function (entry) { return entry.raw; }))])
			.range(d3.range(9).map(function (i) { return "q" + i + "-9"; }));

	scales.jenks9 = d3.scale.threshold()
		.domain(ss.jenks(_.map(dataByCountry, function (entry) { return entry.raw; }), 7))
		.range(d3.range(9).map(function (i) { return "q" + i + "-9"; }));

	feature = svg.selectAll("path")
      .data(countries.features)
			.enter().append("svg:path")
      .attr("d", clip)
			.on("mouseover", function (d) {
				var sel = d3.select(this);
				sel.moveToFront();
				return tooltip
				.style("visibility", "visible")
				.html("<h3>" + d.properties.name + "</h3><p>" + (dataByCountry[d.properties.name] ? dataByCountry[d.properties.name].display : "N/A") + "</p>");
			})
			.on("mousemove", function () { return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px"); })
			.on("mouseout", function () { return tooltip.style("visibility", "hidden"); });


	function setScale(s) {
		feature.attr("class", function (d) { return scales[s](dataByCountry[d.properties.name] ? dataByCountry[d.properties.name].raw : undefined); })
	}

	setScale('jenks9');
}

d3.select(window)
  .on("mousemove", mousemove)
  .on("mouseup", mouseup);

var m0,
    o0;

function mousedown() {
	m0 = [d3.event.pageX, d3.event.pageY];
	o0 = projection.origin();
	d3.event.preventDefault();
}

function mousemove() {
	if (m0) {
		var m1 = [d3.event.pageX, d3.event.pageY],
        o1 = [o0[0] + (m0[0] - m1[0]) / 8, o0[1] + (m1[1] - m0[1]) / 8];
		projection.origin(o1);
		circle.origin(o1);
		refresh();
	}
}

function mouseup() {
	if (m0) {
		mousemove();
		m0 = null;
	}
}

function refresh(duration) {
	(duration ? feature.transition().duration(duration) : feature).attr("d", clip);
}

function clip(d) {
	return path(circle.clip(d));
}