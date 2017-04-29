var w = parseInt(d3.select("#mapDiv").style("width"))
var h = parseInt(d3.select("#mapDiv").style("height"))

var svg = d3.select("#mapDiv")
	.append("svg")
	.attr("width", w)
	.attr("height", h);

scaleInit = h/(2*Math.PI) * (18/17)
transInit = [w/2, h/2]

// map
var projection = d3.geoMercator()
	.scale(scaleInit)
	.translate(transInit)

var path = d3.geoPath()
	.projection(projection);

var mapG = svg.append("g")
var dotG = svg.append("g")

// world map
d3.json("world-110m.geojson", function(error, world) {
	if (error) throw error;

	mapG
	.append("path")
	.attr("d", path(world))
	.classed("land", true)
})

// dot dataset
d3.csv("starbucks.csv", function(error, starbucks) {
	if(error) throw error;

	var zoom = d3.zoom()
		.scaleExtent([1, 8])
		.on("start", zoomStart)
		.on("zoom", zooming)
		.on("end", zoomEnd)

	svg.call(zoom)

	update()

	function update() {

		// get new dot locations	
		var dots = betterDots(starbucks, lat = "Latitude", lon = "Longitude", info = "Store Name")
		
		// update circles
		var circle = dotG
			.selectAll(".dot")
			.data(dots.instances)

		circle.exit().remove()

		circle
			.enter()
			.append("circle")
			.classed("dot", true)
			.merge(circle)
			.attr("cx", function(d) {return projection(d.coord)[0]})
			.attr("cy", function(d) {return projection(d.coord)[1]})
			.attr("r", function() {return dots.radius})
			.style("fill", function(d) {return d.colour})
			
			// tooltips
			 .on("mouseover", function(d) {
				var x = parseFloat(d3.select(this).attr("cx"))
				var y = parseFloat(d3.select(this).attr("cy"));
				d3.select("#tooltip")
					.style("left", x + 260 + "px")
					.style("top", y - 6 + "px")
					.text(d.info);
				d3.select("#tooltip").classed("hidden", false);
			   })
			   .on("mouseout", function() {
				d3.select("#tooltip").classed("hidden", true);
			   })
		
		// update stats on the left
		d3.select("#infoDots").text(dots.instances.length)
		d3.select("#infoScale").text(projection.scale())

	}

	function zoomStart() {
		dotG.classed("hidden", true)
		console.log("zoom started")
	}

	function zooming() {
		// zoom map
		mapG.style("stroke-width", 1.5 / d3.event.transform.k + "px");
		mapG.attr("transform", d3.event.transform);
	}

	function zoomEnd() {

		console.log("zoom ended")		
		dotG.classed("hidden", false)

		// update projection
		projection
		.translate([d3.event.transform.x + d3.event.transform.k*transInit[0], d3.event.transform.y + d3.event.transform.k*transInit[1]])
		.scale(d3.event.transform.k * scaleInit)
		
		// re-plot dots
		update()
	}


})




function betterDots(data, lat, lon, info, radius = 5) {

	// create bounding box and filter
	var bounds = getBoundingBox() //lrtb
	
	// filter for dots inside bounding box
	var dataF = data.filter(function(inst){
		return  inst[lon] > bounds.l &&
			inst[lon] < bounds.r && 
			inst[lat] < bounds.t &&
			inst[lat] > bounds.b
	})

	var x = new Object()
	x.radius = radius
	x.value = 1
	x.instances = []

	for (var i = 0; i < dataF.length; i++) {
		x.instances.push({coord: [dataF[i][lon], dataF[i][lat]], info: dataF[i][info], colour: "#D74733"})
	}

	return x
}

function getBoundingBox() {

	// bounds of map outline
	var mapBounds = mapG.node().getBBox()
	var mapTrans = d3.zoomTransform(svg.node())

	var l = mapTrans.x + mapBounds.x * mapTrans.k
	var r = l + mapBounds.width * mapTrans.k
	var t = mapTrans.y + mapBounds.y * mapTrans.k
	var b = t + mapBounds.height * mapTrans.k

	// compare to bounds of svg (visible part)
	l = (l > 0 ? -180 : projection.invert([0, NaN])[0])
	r = (r < w ? 180 : projection.invert([w, NaN])[0])
	t = (t > 0 ? 85 : projection.invert([NaN, 0])[1])
	b = (b < h ? -85 : projection.invert([NaN, h])[1])

	console.log(l,r,t,b)

	// compute lat + lon for pixel coordinates
	var lrtb = {l: l, r: r, t: t, b: b}

	// draw box (only for development purposes)
	var box = dotG.selectAll("line")
		.data([[[l,t],[r,t]], 
			[[l,t],[l,b]],
			[[l,b],[r,b]],
			[[r,t],[r,b]]])

	box.exit().remove()

	box
		.enter()
		.append("line")
		.merge(box)
		.style("stroke", "grey")
		.style("stroke-width", "2px")
		.attr("x1", function(d) {return projection(d[0])[0]})
		.attr("y1", function(d) {return projection(d[0])[1]})
		.attr("x2", function(d) {return projection(d[1])[0]})
		.attr("y2", function(d) {return projection(d[1])[1]})

	return lrtb
}