// TODO: let user edit values
// TODO: allow save/load of board + stack
// TODO: let user add items to stack
// TODO: add residential buildings ('receivers')
// TODO: use different colours (decorations/attractions)

$(init);

var NUM_OF_ROWS = 20; 
var NUM_OF_COLS = 30;

var lookup; // look up spots by [x][y] 
var logcounter = 1;

function init() {
	$("body").disableSelection();

	var board = $("#board");
	var stack = $("#stack");
	var br = "<br/>";

	createSpots(board, NUM_OF_ROWS, NUM_OF_COLS);

	repeat(15, function () { createTile(1,1, 5,2); }); stack.append(br);
	repeat( 5, function () { createTile(2,2,10,2); }); 
	repeat( 2, function () { createTile(3,2,10,2); }); 
	repeat( 2, function () { createTile(1,2,10,2); }); stack.append(br);
	repeat( 3, function () { createTile(3,3,25,3); }); 
	repeat( 3, function () { createTile(2,3,25,3); }); stack.append(br);
	repeat( 2, function () { createTile(4,4,50,3); }); stack.append(br);

	stack.droppable({ drop: handleTileRestack });
	stack.height(board.height() - 22);
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

function createTile(width, height, value, range) {
	var stack = $("#stack");

	var id = "tile" + (stack.find(".tile").length + 1);

	var tile = $("<div/>")
		.addClass("tile")
		.text(value)
		.attr("id", id)
		.data("range", range)
		.data("value", value)
		.data("name", "")
		.data("width", width)
		.data("height", height)
	tile.draggable({
		start: handleDragStart,
		revert: "invalid",
		stack: ".tile",
		cursorAt: { left: 5, top: 5} });

	tile.dblclick(handleTileDoubleClick);

	// set the correct size for the tile. Add extra pixels to account for gridlines.
	tile.appendTo(stack);
	tile.width(tile.width() * width + (width - 1));
	tile.height(tile.height() * height + (height - 1));
	return tile;
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

	if (oldSpot != null) cleanupTile(oldSpot, tile) // cleanup old spot
	placeTile(newSpot, tile); // place on new spot	
	tile.position({ of: $(this), my: "left top", at: "left top" });
}

function handleTileRestack(event, ui) {
	var tile = ui.draggable;
	var oldSpot = $(tile.data("spot"));
	cleanupTile(oldSpot, tile); // remove from old spot
}

function handleTileDoubleClick(event) {
	var tile = $(this);
	editValue(tile);
	}	

/* == ACTIONS -- */

function editValue(tile) {
	var oldValue = $(tile).data("value");
	var oldRange = $(tile).data("range");
	var oldName = $(tile).data("name");

	var input = prompt("(value)x(range)x(name)", oldValue + "x" + oldRange + "x" + oldName);
	if (input == null) return;

	var value = input.split("x")[0] * 1;
	var range = input.split("x")[1] * 1;
	var name = input.split("x")[2];
	if (isNaN(range)) range = oldRange;

	$(tile).data("value", value).text(value);
	$(tile).data("range", range);
	$(tile).data("name", name).text(name.toUpperCase());

	var spot = $(tile).data("spot");
	if (spot != null) {
		cleanupTile(spot, tile, oldValue, oldRange);
		placeTile(spot, tile, value, range);
	}

}

function validateSpot(spot, tile) {
	var width = $(tile).data("width");
	var height = $(tile).data("height");
	if (width == 1 && height == 1) return true;

	var coords = getCoords(spot);
	if (coords.x + width - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
	if (coords.y + height - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

	var id = $(tile).attr("id");
	for (var x = coords.x; x < coords.x + width; x++)
		for (var y = coords.y; y < coords.y + height; y++) 
			if (lookup[x][y] != null && lookup[x][y] != id) return false;

	return true;
}

function placeTile(spot, tile, value, range) {
	processTileChange(spot, tile, value, range, spotActivate, function (a, b) { return a + b; });
}

function cleanupTile(spot, tile, value, range) {
	processTileChange(spot, tile, value, range, spotDeactivate, function (a, b) { return a - b; });
}

function processTileChange(spot, tile, value, range, spotAction, valueCalc) {
	var width = $(tile).data("width");
	var height = $(tile).data("height");
	if (value == null) value = $(tile).data("value");
	if (range == null) range = $(tile).data("range");
	
	// occupied spots = spots covered by the tile itself
	var occupiedSpots = getOccupiedSpots(spot, width, height);
	$(occupiedSpots).each(function () { spotAction(spot, this, tile); });
	
	// affected spots = spots within range
	var affectedSpots = getAffectedSpots(spot, range, width, height);
	$(affectedSpots).each(function () { updateSpotValue(this, value, valueCalc); });
}

function updateSpotValue(spot, value, valueCalc) {
	var coords = getCoords(spot);
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

function repeat(times, fn) {
	for (var i = 0; i < times; i++) fn();
}

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

function getOccupiedSpots(originSpot, width, height) {
	var occupiedSpots = [];
	var origin = getCoords(originSpot);
	// TODO: find a better occupied/affected test than scanning the entire board
	$("#board td").each(function () {
		var coords = getCoords(this);
		if (coords.x >= origin.x && coords.x < origin.x + width)
			if (coords.y >= origin.y && coords.y < origin.y + height)
				occupiedSpots.push(this);
	});
	return occupiedSpots;
}

function getAffectedSpots(originSpot, range, width, height) {
	var affectedSpots = [];
	var origin = getCoords(originSpot);
	$("#board td").each(function () {
		var coords = getCoords(this);
		if (coords.x >= origin.x - range && coords.x < origin.x + range + width)
			if (coords.y >= origin.y - range && coords.y < origin.y + range + height) 
				affectedSpots.push(this);
	});
	return affectedSpots;
}



