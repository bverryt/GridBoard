$(init);

var NUM_OF_ROWS = 15; 
var NUM_OF_COLS = 20;

var lookup; // look up spots by [x][y] 
var logcounter = 1;

function init() {
	$("#area").disableSelection();
	var board = $("#board");
	createSpots(board, NUM_OF_ROWS, NUM_OF_COLS);
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
			var spot = $("<td/>")
				.addClass("spot")
				.droppable({accept: ".tile", tolerance: "pointer", hoverClass: "hovered", over: handleSpotOver, drop: handleTilePlacement })
				.appendTo(row);

			if (lookup == null) lookup = new Array(NUM_OF_COLS);
			if (lookup[x] == null) lookup[x] = new Array(NUM_OF_ROWS);
			lookup[x][y] = null;
		}
	}	
}

function createTiles(stack, size, value, range, amount) {
	for (var i = 0; i < amount; i++) {
		var id = "tile" + (stack.find(".tile").length + 1);
		var tile = $("<div/>")
			.addClass("tile")
			.text(value)
			.attr("id", id)
			.data("range", range)
			.data("value", value)
			.data("size", size)
			.draggable({ start: handleDragStart, revert: "invalid", stack: ".tile",  cursorAt: { left: 5, top: 5 } })
			.appendTo(stack);

		// set the correct size for the tile. Add extra pixels to account for gridlines.
		tile.height(tile.height() * size + (size - 1));
		tile.width(tile.width() * size + (size - 1));
	}
}

/* == EVENT HANDLERS == */

function handleDragStart(event, ui) {
	$("#board td.spot").draggable("option", "accept", ".tile"); // reset all spots to accept all tiles
}

function handleSpotOver(event, ui) {
	var spot = $(this);
	var tile = ui.draggable;
	if (!validateSpot(spot, tile)) { // if invalid
		var selector = ".tile:not(#" + $(tile).attr("id") + ")"; // don't accept the current tile
		spot.droppable("option", "accept", selector).removeClass("hovered");
	}
}

function handleTilePlacement(event, ui) {
	var tile = ui.draggable;
	var oldSpot = $(tile).data("spot");
	var newSpot = $(this);
	cleanupTile(oldSpot, tile) // cleanup old spot
	placeTile(newSpot, tile); // place on new spot	
	tile.position({ of: $(this), my: "left top", at: "left top" });
}

function handleTileRestack(event, ui) {
	var tile = ui.draggable;
	var oldSpot = $(tile.data("spot"));
	cleanupTile(oldSpot, tile); // remove from old spot
}

/* == ACTIONS -- */

function validateSpot(spot, tile) {
	var size = $(tile).data("size");
	if (size == 1) return true;

	var coords = getCoords(spot);
	if (coords.x + size - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
	if (coords.y + size - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

	var id = $(tile).attr("id");
	for (var x = coords.x; x < coords.x + size; x++)
		for (var y = coords.y; y < coords.y + size; y++) {
			if (lookup[x][y] != null && lookup[x][y] != id) return false;
		}

	return true;
}

function placeTile(spot, tile) {
	processTileChange(spot, tile, spotActivate, function (a, b) { return a + b; });
}

function cleanupTile(spot, tile) {
	processTileChange(spot, tile, spotDeactivate, function (a, b) { return a - b; });
}

function processTileChange(spot, tile, spotAction, valueCalc) {
	var value = $(tile).data("value");
	var range = $(tile).data("range");
	var size = $(tile).data("size");	
	// occupied spots = spots covered by the tile itself
	var occupiedSpots = getOccupiedSpots(spot, size);
	$(occupiedSpots).each(function () { spotAction(spot, this, tile); });
	// affected spots = spots within range
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
	$(spot).removeClass("active");
	var coords = getCoords(spot);
	lookup[coords.x][coords.y] = null;
}

function spotActivate(originSpot, spot, tile) {
	$(tile).data("spot", originSpot);
	$(spot).addClass("active");
	var coords = getCoords(spot);
	lookup[coords.x][coords.y] = tile.attr("id");
}

/* == HELPERS == */

function log(message, p1, p2, p3, p4) {
	var message = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4);
	console.log(logcounter++ + ": " + message);
}

function getCoords(spot) {
	var row = $(spot).parent("tr");
	var x = $(row).find(".spot").index(spot) + 1;
	var y = $("#board tr").index(row) + 1;
	return { x: x, y: y };
}

function getOccupiedSpots(originSpot, size) {
	var occupiedSpots = [];
	var origin = getCoords(originSpot);
	// TODO: find a better occupied/affected test than scanning the entire board
	$("#board td").each(function () {
		var coords = getCoords(this);
		if (coords.x >= origin.x && coords.x < origin.x + size)
			if (coords.y >= origin.y && coords.y < origin.y + size)
				occupiedSpots.push(this);
	});
	return occupiedSpots;
}

function getAffectedSpots(originSpot, range, size) {
	var affectedSpots = [];
	var origin = getCoords(originSpot);
	$("#board td").each(function () {
		var coords = getCoords(this);
		if (coords.x >= origin.x - range && coords.x < origin.x + range + size)
			if (coords.y >= origin.y - range && coords.y < origin.y + range + size)
				affectedSpots.push(this);
	});
	return affectedSpots;
}



