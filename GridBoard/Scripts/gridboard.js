$(init);

function init() {
	$('body').disableSelection();
	initBoard(10, 20);
	initStack(2, 3, 50);
	initStack(5, 2, 40); 
	initStack(20, 1, 15);
	$("#stack").width($("#board").width() - 22);
}

/* == INIT == */

function initBoard(rows, cols) {
	for (var y = 1; y <= rows; y++) {
		var row = $("<tr/>").addClass("row").appendTo("#board");
		for (var x = 1; x <= cols; x++) {
			$("<td />")
				.addClass("spot").attr("title", x + ":" + y)
				.data("x", x).data("y", y)
				.droppable({ accept: '.tile', tolerance: 'pointer', drop: handleTilePlacement })
				.appendTo(row);			
		}
	}	
}

function initStack(amount, size, value) {
	$("#stack").droppable({ drop: handleTileRestack });
	for (var i = 0; i < amount; i++) {
		var range = 2; 
		// var value = Math.floor((Math.random()*10)+1);
		var tile = $("<div/>")
			.addClass("tile").text(value)
			.data("range", range).data("value", value).data("size", size)
			.draggable({ revert: 'invalid', stack: '.tile'})
			.appendTo("#stack");
		
		tile.height(tile.height() * size).width(tile.width() * size);
	}
}

/* == EVENT HANDLERS == */

function handleTilePlacement(event, ui) {
	// TODO: check if ALL spots are available

	var tile = ui.draggable;
	removeTile($(tile.data("spot")), tile); // remove from old spot
	placeTile($(this), tile); // place on new spot	
	tile.position({ of: $(this), my: 'left top', at: 'left top', offset: tile.data("size") + "px" });
}

function handleTileRestack(event, ui) {
	var tile = ui.draggable; 
	removeTile($(tile.data("spot")), tile); // remove from old spot
}

/* == ACTIONS -- */

function placeTile(spot, tile) {
	processTileMovement(spot, tile, spotActivate, function (a, b) { return a + b; });
}

function removeTile(spot, tile) {
	processTileMovement(spot, tile, spotDeactivate, function (a, b) { return a - b; });
}

function processTileMovement(spot, tile, spotAction, valueCalc) {
	var value = $(tile).data("value");
	var range = $(tile).data("range");
	var size = $(tile).data("size");	
	
	var occupiedSpots = getOccupiedSpots(spot, size);
	$(occupiedSpots).each(function () { spotAction(spot, this, tile); });

	var affectedSpots = getAffectedSpots(spot, range, size);
	$(affectedSpots).each(function () { updateSpotValue(this, value, valueCalc); });
}

function updateSpotValue(spot, value, valueCalc) {
	var oldvalue = $(spot).data("value");
	if (oldvalue == null) oldvalue = 0;
	var newvalue = valueCalc(oldvalue, value);
	$(spot).data("value", newvalue);
	$(spot).text(newvalue);
	if (newvalue == 0) $(spot).text("");
}

function spotDeactivate(originSpot, spot, tile) {
	$(tile).data("spot", null);
	$(spot).data("tile", null);
	$(spot).droppable("enable");
	$(spot).removeClass("active");
}

function spotActivate(originSpot, spot, tile) {
	$(tile).data("spot", originSpot);
	$(spot).data("tile", tile);
	$(spot).droppable("disable");
	$(spot).addClass("active");
}

/* == HELPERS == */

function getOccupiedSpots(originSpot, size) {
	var occupiedSpots = [];
	var originx = $(originSpot).data("x");
	var originy = $(originSpot).data("y");
	$("#board td").each(function () {
		var x = $(this).data("x");
		var y = $(this).data("y");
		if (x >= originx && x < originx + size)
			if (y >= originy && y < originy + size) 
				occupiedSpots.push(this);
		});
	return occupiedSpots;
}

function getAffectedSpots(originSpot, range, size) {
	var affectedSpots = [];
	var originx = $(originSpot).data("x");
	var originy = $(originSpot).data("y");


	$("#board td").each(function () {
		var x = $(this).data("x");
		var y = $(this).data("y");
		if (x >= originx - range && x < originx + range + size)
			if (y >= originy - range && y < originy + range + size)
				affectedSpots.push(this);
	});
	
	return affectedSpots;
}



