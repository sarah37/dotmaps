// three functions to draw some stuff that helps visualise how the algorithm works

function drawBounds(b) {

	var box = devG.selectAll(".bbox")
		.data([[[b.l,b.t],[b.r,b.t]], 
			[[b.l,b.t],[b.l,b.b]],
			[[b.l,b.b],[b.r,b.b]],
			[[b.r,b.t],[b.r,b.b]]])
	box.exit().remove()

	box.enter()
		.append("line")
		.classed("bbox", true)
		.merge(box)
		.attr("x1", function(d) {return projection(d[0])[0]})
		.attr("y1", function(d) {return projection(d[0])[1]})
		.attr("x2", function(d) {return projection(d[1])[0]})
		.attr("y2", function(d) {return projection(d[1])[1]})
}


function drawGrid(xSteps, ySteps) {
	var xLines = devG.selectAll(".xLine")
		.data(xSteps)

	xLines.exit().remove()

	xLines
		.enter()
		.append("line")
		.classed("xLine", true)
		.merge(xLines)
		.attr("x1", function(d) {return d})
		.attr("y1", 0)
		.attr("x2", function(d) {return d})
		.attr("y2", h)

	var yLines = devG.selectAll(".yLine")
		.data(ySteps)

	yLines.exit().remove()

	yLines
		.enter()
		.append("line")
		.classed("yLine", true)
		.merge(yLines)
		.attr("x1", 0)
		.attr("y1", function(d) {return d})
		.attr("x2", w)
		.attr("y2", function(d) {return d})
}

function drawDelaunay(links) {
		
	var del = devG
		.selectAll(".delaunay")
		.data(links)

	del.exit().remove()

	del
		.enter()
		.append("line")
		.classed("delaunay", true)
		.merge(del)
		.attr("x1", function(d) {return d.source.pos[0]})
		.attr("y1", function(d) {return d.source.pos[1]})
		.attr("x2", function(d) {return d.target.pos[0]})
		.attr("y2", function(d) {return d.target.pos[1]})
}