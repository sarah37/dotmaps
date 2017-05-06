// REQUIREMENTS (some of these should not be required but currently are)
// - svg has to be called svg
// - mapG has to exist (for BoundingBox)
// - 


// color is only included for dev purposes, should be chosen in other file
// currently this function does nothing beyond reorganising the data and filtering for visible dots
function betterDots(data, lat = "lat", lon = "lon", info = "info", radius = 5) {

	// create bounding box and filter
	var bounds = getBoundingBox()
	
	// filter for dots inside bounding box
	var dataF = data.filter(function(inst){
		return  inst[lon] > bounds.l &&
			inst[lon] < bounds.r && 
			inst[lat] < bounds.t &&
			inst[lat] > bounds.b
	})

	// create output object
	var x = new Object()
	x.radius = radius
	x.value = 1
	x.instances = []

	for (var i = 0; i < dataF.length; i++) {
		x.instances.push({coord: [dataF[i][lon], dataF[i][lat]], info: dataF[i][info], colour: "#D74733"})
	}

	return x
}

// computes bounding box of currently visible part of the map
// refers to: mapG
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

	// compute lat + lon for pixel coordinates
	return {l: l, r: r, t: t, b: b}

	// draw box (only for development purposes)
	// var box = dotG.selectAll("line")
	// 	.data([[[l,t],[r,t]], 
	// 		[[l,t],[l,b]],
	// 		[[l,b],[r,b]],
	// 		[[r,t],[r,b]]])

	// box.exit().remove()

	// box
	// 	.enter()
	// 	.append("line")
	// 	.merge(box)
	// 	.style("stroke", "grey")
	// 	.style("stroke-width", "2px")
	// 	.attr("x1", function(d) {return projection(d[0])[0]})
	// 	.attr("y1", function(d) {return projection(d[0])[1]})
	// 	.attr("x2", function(d) {return projection(d[1])[0]})
	// 	.attr("y2", function(d) {return projection(d[1])[1]})
}