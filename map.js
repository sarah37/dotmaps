// This whole file is mostly for the map, zoom functionality etc. 
// The interesting part happens in betterDots.js

d3.select("#showDelaunay").on("change", function() {
	if (!d3.select("#showDelaunay").property("checked")) {
		d3.selectAll(".delaunay").remove()
	}
})

d3.select("#showBounds").on("change", function() {
	if (!d3.select("#showBounds").property("checked")) {
		d3.selectAll(".bbox").remove()
	}
})

d3.select("#showGrid").on("change", function() {
	if (!d3.select("#showGrid").property("checked")) {
		d3.selectAll(".xLine, .yLine").remove()
	}
})

// get width and height
var w = parseInt(d3.select("#mapDiv").style("width"))
var h = parseInt(d3.select("#mapDiv").style("height"))

// colour
var circleColour = "#D94726";

// create svg
var svg = d3.select("#mapDiv")
	.append("svg")
	.attr("width", w)
	.attr("height", h);

// initial scale and translation (makes mercator projection fit screen)
scaleInit = h/(2*Math.PI) * (18/17)
transInit = [w/2, h/2]

// define projection
var projection = d3.geoMercator()
	.scale(scaleInit)
	.translate(transInit)

// define path generator
var path = d3.geoPath()
	.projection(projection);

// g's for different parts of the map
var mapG = svg.append("g")
var dotG = svg.append("g")
var devG = svg.append("g")


// load world map geojson
d3.json("world-110m.geojson", function(error, world) {
	if (error) throw error;

	mapG
	.append("path")
	.attr("d", path(world))
	.classed("land", true)
})

// load dataset for dots
d3.csv("starbucks_unique.csv", function(error, dotdata) {
	if(error) throw error;

	// initialise zoom
	// has to be within recall of dataset because "zooming" function triggers reloading the dots
	var zoom = d3.zoom()
		.on("start", zoomStart)
		.on("zoom", zooming)
		.on("end", zoomEnd)

	svg.call(zoom)

	function zoomStart() {
		dotG.classed("hidden", true)
		devG.classed("hidden", true)
	}

	function zooming() {
		// zoom map
		mapG.style("stroke-width", 1.5 / d3.event.transform.k + "px");
		mapG.attr("transform", d3.event.transform);
	}

	function zoomEnd() {
		
		dotG.classed("hidden", false)
		devG.classed("hidden", false)

		// update projection
		projection
		.translate([d3.event.transform.x + d3.event.transform.k*transInit[0], d3.event.transform.y + d3.event.transform.k*transInit[1]])
		.scale(d3.event.transform.k * scaleInit)

		var t0 = performance.now()
		// re-plot dots
		update()

		var t1 = performance.now()
		console.log("Update took: " + Math.floor(t1-t0) + "ms")
	}

	// zoom is all set, next:
	// functions to plot/update dots
	
	function update() {

		// get new dot locations	
		var dots = betterDots.getDots(dotdata,
					lat = "Latitude", 
					lon = "Longitude", 
					info = "Store Name") 

				// for meatvis dataset
				      // lat = "lat", 
				      // lon = "lon", 
				      // info = "location")

		// update circles with new dot collection
		if (d3.select("#showGroups").property("checked")) {
			var circle = dotG
				.selectAll(".dot")
				.data(dots.groupedDots)

			circle.exit().remove()

			circle
				.enter()
				.append("circle")
				.classed("dot", true)
				.merge(circle)
				.attr("cx", function(d) {return d.pos[0]})
				.attr("cy", function(d) {return d.pos[1]})
				.attr("r", function() {return dots.radius})
				.style("fill", function(d) {return d.colour})
				.style("opacity", 0.6)
		}

		else {
			var circle = dotG
				.selectAll(".dot")
				.data(dots.newDots)

			circle.exit().remove()

			circle
				.enter()
				.append("circle")
				.classed("dot", true)
				.merge(circle)
				.attr("cx", function(d) {return d.pos[0]})
				.attr("cy", function(d) {return d.pos[1]})
				.attr("r", function() {return dots.radius})
				.style("fill", circleColour)
				.style("opacity", 1)	
		}
			
			// tooltips
			circle
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
		d3.select("#infoDots").text(dots.originalPoints.length)
		d3.select("#infoScale").text(projection.scale())

		// dev help
		if (d3.select("#showBounds").property("checked")) drawBounds(dots.bounds);
		if (d3.select("#showGrid").property("checked")) drawGrid(dots.grid.x, dots.grid.y);
		if (d3.select("#showDelaunay").property("checked")) drawDelaunay(dots.voronoi.links());

	}

	// initialise dots
	update()
})