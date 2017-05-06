// get width and height
var w = parseInt(d3.select("#mapDiv").style("width"))
var h = parseInt(d3.select("#mapDiv").style("height"))

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

// load world map geojson
d3.json("world-110m.geojson", function(error, world) {
	if (error) throw error;

	mapG
	.append("path")
	.attr("d", path(world))
	.classed("land", true)
})

// load dataset for dots
d3.csv("starbucks.csv", function(error, starbucks) {
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
		
		var t0 = performance.now()
		// re-plot dots
		update()

		var t1 = performance.now()
		console.log("Update took: " + (t1-t0))
	}

	// zoom is all set, next:
	// functions to plot/update dots
	
	function update() {

		// get new dot locations	
		var dots = betterDots(starbucks, 
				      lat = "Latitude", 
				      lon = "Longitude", 
				      info = "Store Name")
		
		// update circles with new dot collection
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

	// initialise dots
	update()
})