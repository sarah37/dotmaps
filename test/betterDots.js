// namespace betterDots
var betterDots = new function() {

// the only exposed function here 
this.getDots = function(data, info, func) {
	var t0 = performance.now()

	// create output object
	var x = new Object()

	// create bounding box and filter
	x.bounds = func.getBoundingBox()

	// filter for visible dots to speed up following calculations
	x.originalPoints = pointsInBounds(data, x.bounds, info.lat, info.lon, info.info)

	var t1 = performance.now()
	// dot size
	x.radius = info.radius

	// determine dot value with grid
	var dotVal = getDotValue(x.originalPoints, cellSize = 2*x.radius)
	x.value = dotVal.dotValue
	x.grid = {x: dotVal.xSteps, y: dotVal.ySteps}

	var t2 = performance.now()

	if (x.value <= 1) {
		console.log("Dot value is 1 or no points visible, returning original points")
		x.newDots = x.originalPoints
	}

	else {
		console.log("Dot value > 1, calculating aggregated dots")
		// compute voronoi diagram with some extensions
		x.voronoi = extendedVoronoi(x.originalPoints)
		
		var t3 = performance.now()

		// sort dots into groups
		x.groups = groupPoints(x.voronoi, x.value)

		var t4 = performance.now()

		// for development: original dots coloured by their group
		x.groupedDots = groupedDots(x.groups, x.voronoi)

		// create final list of dots by representing each group with one dot
		x.newDots = finalDots(x.groups, x.voronoi)
	}

	var t5 = performance.now()

	// for performance measurements
	console.log(t0,t1,t2,t3,t4,t5, x.value,x.originalPoints.length)

	return x
}

function pointsInBounds(data, bounds, lat, lon, info) {
	// returns a filtered version of the dataset, only containing the points within the bounding box

	var filtered = data.filter(function(inst){
		return  inst[lon] > bounds.l &&
			inst[lon] < bounds.r && 
			inst[lat] < bounds.t &&
			inst[lat] > bounds.b
	})
	
	// tidy version
	points = []
	for (var i = 0; i < filtered.length; i++) {
		points.push({id: i, pos: func.projection([filtered[i][lon], filtered[i][lat]]), info: filtered[i][info]})
	}

	return points
}

function getDotValue(dots, cellSize) {
	// overlays a grid, counts number of points in each cell and computes dot value based on that
	var w, h, xSteps, ySteps, xPos, yPos, grid;

	w = func.width()
	h = func.height()

	xSteps = d3.range(0, w, cellSize)
	ySteps = d3.range(0, h, cellSize)

	grid = zeros(ySteps.length, xSteps.length);

	dots.forEach(function(el) {
		xPos = Math.floor(el.pos[0] / cellSize);
		yPos = Math.floor(el.pos[1] / cellSize);
		grid[yPos][xPos]++;
	})

	var flat = grid.reduce(function(a, b) {
		return a.concat(b);
		}, []);

	var threshold = Math.floor(math.quantileSeq(flat, 0.999)) 

	return {dotValue: threshold, xSteps: xSteps, ySteps: ySteps}
}

function extendedVoronoi(points) {
	// computes a voronoi diagram and the related delaunay triangulation for a point collection
	// the returned object has several additional properties compared to the standard d3 one

	// define d3 voronoi
	var voronoi = d3.voronoi()
		.extent([[-1, -1], [w + 1, h + 1]])
		.x(function(d) {return +d.pos[0]})
		.y(function(d) {return +d.pos[1]});

	// compute diagram
	var diagram = voronoi(points)
	
	// add delaunay triangulation
	diagram.delaunay = diagram.links()

	// add an array with all neighbours to each cell
	// IDs are equal to cell indexes
	diagram.cells.forEach(function (cell) {cell.neighbours = []; cell.unassigned = true})

	var linklengths = []

	diagram.delaunay.forEach(function(link) {
		var len = math.sqrt((math.pow((link.source.pos[0] - link.target.pos[0]), 2) + math.pow((link.source.pos[1] - link.target.pos[1]),2)))
		linklengths.push(len)
		diagram.cells[link.source.id].neighbours.push({id: link.target.id, distance: len})
		diagram.cells[link.target.id].neighbours.push({id: link.source.id, distance: len})
	})

	// 80% of links <= this value
	diagram.linkQuantile80 = math.quantileSeq(linklengths, 0.80) 

	return diagram
}

function groupPoints(diagram, groupsize) {
	// computes equally sized groups of spatially close points based on the extended voronoi diagram
	// requires groupsize >= 2

	var groups = []
	var n = Math.ceil(diagram.cells.length / groupsize) - 1 // last group is always excluded, even if the remainder is 0
	
	console.log("Number of points: " + diagram.cells.length)
	console.log("Number of groups: " + (n+1))
	console.log("Group size: " + groupsize)

	// pick first point as starting point
	var startingPoint = 0

	// count up to desired number of groups (skip last one)
	for (var g = 0; g < n; g++) {

		// initialise new group with starting point
		var members = [startingPoint]
		diagram.cells[startingPoint].unassigned = false

		// number of missing members
		var missingMembers = groupsize - 1

		// while there are missing members:
		while (missingMembers > 0) {

			// create candidate list from active direct neighbours of group members
			var candidates = getNeighbours(diagram, members, [], true).filter(function(nb) {
				return diagram.cells[nb].unassigned
			})

			// if we have no new candidates at this point, the algorithm is stuck
			// we fix this by selecting a new starting point to continue from
			if (candidates.length == 0) {
				var newStartingPoint = getNewStartingPoint(members, diagram)
				candidates = [newStartingPoint]
			}

			// Case I: There are less candidates than we need to fill the group.
			if (candidates.length < missingMembers) {
				// add all from the candidate list
				members = members.concat(candidates)
				// mark added ones as assigned
				candidates.forEach(function(id) {
					diagram.cells[id].unassigned = false
				})
			}

			// Case II: We have enough candidates to fill the group
			else {
				// add as many as needed
				var add = candidates.slice(0, missingMembers)
				// remaining candidates could be given priority in later iterations
				members = members.concat(add)
				// save group
				groups.push(members)
				// set unassigned to false for all cells that were assigned in this iteration
				add.forEach(function(id) {diagram.cells[id].unassigned = false})

				// check if we have an extra candidate to assign next starting point
				if (missingMembers < candidates.length) {
					startingPoint = candidates[missingMembers]
				}
				else {startingPoint = getNewStartingPoint(members, diagram)}
			}

			// update number of missing members
			missingMembers = groupsize - members.length
		}
	}

	// last group with all remaining points
	// find all unassigned points
	var lastGroup = []
	diagram.cells.forEach(function(cell, i) {
		if (cell.unassigned) {lastGroup.push(i)}
	})

	// if large enough, add to groups array
	if (lastGroup.length > 0.5*groupsize) {
		groups.push(lastGroup)
	}

	return groups
}

function getNeighbours(diagram, points, exclude = [], filterQuantile = false) {
	// returns array of IDs of "ring" around current
	// optional exclude argument can be used to exclude cells
	// cells in the input array are always excluded

	var excluded = points.concat(exclude)

	// get all neighbours of all cells
	var nbs = []
	points.forEach(function(id) {
		diagram.cells[id].neighbours.forEach(function(nb) {
			if (filterQuantile) {
				if (nb.distance <= diagram.linkQuantile80) {
					nbs.push(nb.id)
				}
			}
			else {nbs.push(nb.id)}	
		})
	})
	// remove members on excluded list
	var nbs = nbs.filter(function(cell, index, self) {
		return excluded.indexOf(cell) == -1 && // not excluded
		self.indexOf(cell) === index // not double
	})

	return nbs
}

function getNewStartingPoint(group, diagram) {
	// finds a closeby point to continue from in case a group doesn't have any direct neighbours anymore

	var newPoint = -1
	var current = group.slice()
	var previous = []

	// center of mass of group; to pick point as close as possible
	var com = centerOfMass(diagram, group)

	while (newPoint == -1) {
		
		// get neighbours of current selection, excluding all that were part of the previous selection
		var candidates = getNeighbours(diagram, current, previous)

		// this happens if there are duplicate locations in the dataset (but should not otherwise)
		if (candidates.length == 0) {
			console.log("I'm stuck!")
			console.log(candidates)
			console.log(current)
			console.log(previous)
			console.log(diagram.cells)
			debugger;
		}

		// from the list, pick the closest (to the COM of the group) active one
		var shortestDist = Infinity
		candidates.forEach(function(point) {
			var thisDist = math.sqrt(math.pow(diagram.cells[point].site[0]-com[0],2) + math.pow(diagram.cells[point].site[1]-com[1],2))
			if (diagram.cells[point].unassigned && thisDist < shortestDist) {
				newPoint = point
				shortestDist = thisDist
			}
		})

		previous = current.slice() // new previous is old current
		current = candidates.slice() // new current are this round's candidates
	}

	return newPoint
}

function finalDots(groups, diagram) {
	// creates a list of point locations based on the groups
	
	var newDots = []
	
	// point closest to center of mass for each group
	groups.forEach(function(members) {
		var com = centerOfMass(diagram, members);
		var dist = Infinity;
		var point;
		members.forEach(function(member) {
			if (math.distance(diagram.cells[member].site, com) < dist) {
				point = diagram.cells[member].site
				dist = math.distance(diagram.cells[member].site, com)
			}
		})
		newDots.push({id: members, pos: point, info: ""})
	})

	return newDots
}

function groupedDots(groups, diagram) {
	// for development: returns the original points, coloured randomly by group membership

	var groupedDots = []

	groups.forEach(function(members, index) {
		var groupcolour = d3.hsl(Math.floor(360 * Math.random()), 0.7, 0.5) // random colour
		members.forEach(function(member) {
			groupedDots.push({id: member, pos: diagram.cells[member].site, info:index , colour: groupcolour})
			// info: diagram.cells[member].site.data.info
		})
	})

	return groupedDots
}

function centerOfMass(diagram, group) {
	// centre of mass of a point collection

	var sumX = 0
	var sumY = 0
	
	group.forEach(function(member) {
		sumX += diagram.cells[member].site[0]
		sumY += diagram.cells[member].site[1]
	})
	
	var com = [(sumX / group.length), (sumY / group.length)]
	
	return com
}

function zeros(rows, cols) {
	// helper function: creates nested array of zeros
	var array = [], row = [];
	while (cols--) row.push(0);
	while (rows--) array.push(row.slice());
	return array;
}

} // end namespace