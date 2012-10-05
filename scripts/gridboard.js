$(init);

function init() {
	$('#area').disableSelection();

	var board = $("#board");
	createSpots(board, 15, 20);

	var stack = $("#stack");
	createTiles(stack, 1, 10, 2, 10);
	createTiles(stack, 2, 20, 2, 5);
	createTiles(stack, 3, 50, 2, 3);
	createTiles(stack, 4, 200, 2, 2);
	stack.droppable({ drop: handleTileRestack });
	stack.width(board.width() - 22);
}

/* == INIT == */

function createSpots(board, rows, cols) {
	for (var y = 1; y <= rows; y++) {
		var row = $("<tr/>").addClass("row").appendTo(board);
		for (var x = 1; x <= cols; x++) {
			var spot = $("<td />").addClass("spot").attr("title", x + ":" + y);
			spot.data("x", x).data("y", y);
			spot.appendTo(row);
			spot.droppable({ accept: '.tile', tolerance: 'pointer', hoverClass: 'hovered', drop: handleTilePlacement });
			spot.click(function() { console.log(x + ":" + y); });
		}
	}	
}

function createTiles(stack, size, value, range, amount) {
	for (var i = 0; i < amount; i++) {
		var tile = $("<div/>").addClass("tile").text(value);
		tile.data("range", range).data("value", value).data("size", size)
		tile.appendTo(stack);
		tile.draggable({ revert: 'invalid', stack: '.tile', cursorAt: { left: 5, top: 5 } });

		// set the correct size for the tile. Add extra pixels to account for gridlines.
		tile.height(tile.height() * size + (size - 1));
		tile.width(tile.width() * size + (size - 1));
	}
}

function calculateSize(blockSize, px) {
	return px * size + (size - 1);
}

/* == EVENT HANDLERS == */

function handleTilePlacement(event, ui) {
	// TODO: check if ALL spots are available

	var tile = ui.draggable;
	removeTile($(tile.data("spot")), tile); // remove from old spot
	placeTile($(this), tile); // place on new spot	
	tile.position({ of: $(this), my: 'left top', at: 'left top' });
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
	$(spot).empty();
	if (newvalue > 0) $("<div/>").appendTo(spot).text(newvalue);
	
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



