$(init);

var NUM_OF_ROWS = 15; 
var NUM_OF_COLS = 20;

var DATA_SIZE = "size";
var DATA_VALUE = "value";
var DATA_RANGE = "range";
var DATA_TILE = "tile";
var DATA_SPOT = "spot";

var board = new Array();
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
				.droppable({accept: '.tile', tolerance: 'pointer', hoverClass: 'hovered', over: handleSpotOver, drop: handleTilePlacement })
				.appendTo(row);

			if (board == null) board = new Array();
			if (board[x] == null) board[x] = new Array();
			board[x][y] = 0;
		}
	}	
}

function createTiles(stack, size, value, range, amount) {
	for (var i = 0; i < amount; i++) {
		var id = "tile" + (stack.find(".tile").length + 1);
		var tile = $("<div/>")
			.addClass("tile")
			.text(value)
			.attr('id', id)
			.data(DATA_RANGE, range)
			.data(DATA_VALUE, value)
			.data(DATA_SIZE, size)
			.draggable({ start: handleDragStart, revert: 'invalid', stack: '.tile',  cursorAt: { left: 5, top: 5 } })
			.appendTo(stack);

		// set the correct size for the tile. Add extra pixels to account for gridlines.
		tile.height(tile.height() * size + (size - 1));
		tile.width(tile.width() * size + (size - 1));
	}
}



/* == EVENT HANDLERS == */

function handleDragStart(event, ui) {
	$("#board td.spot").draggable("option", "accept", ".tile"); // reset all spots
	var spot = $(this).data(DATA_SPOT);
	if (spot != null)cleanupTile(spot, this); // remove from old spot
}

function handleSpotOver(event, ui) {
	var spot = $(this);
	var tile = ui.draggable;
	var size = $(tile).data("size");

	var valid = validateSpot(spot, size);
	if (!valid) {
		var selector = ".tile:not(#" + $(tile).attr('id') + ")";
		spot.droppable('option', 'accept', selector).removeClass('hovered');
		// var coords = getCoords(spot); log("invalid $1:$2", coords.x, coords.y);
	}
}


function handleTilePlacement(event, ui) {
	var tile = ui.draggable;
	placeTile($(this), tile); // place on new spot	
	tile.position({ of: $(this), my: 'left top', at: 'left top' });
}

function handleTileRestack(event, ui) {
	var tile = ui.draggable;
	var spot = $(tile.data(DATA_SPOT));
	cleanupTile(spot, tile); // remove from old spot
}


/* == ACTIONS -- */

function validateSpot(spot, size) {
	if (size == 1) return true;
	var coords = getCoords(spot);
	return false;
}

function placeTile(spot, tile) {
	processTileChange(spot, tile, spotActivate, function (a, b) { return a + b; });
}

function cleanupTile(spot, tile) {
	processTileChange(spot, tile, spotDeactivate, function (a, b) { return a - b; });
}

function processTileChange(spot, tile, spotAction, valueCalc) {
	var value = $(tile).data(DATA_VALUE);
	var range = $(tile).data(DATA_RANGE);
	var size = $(tile).data(DATA_SIZE);	
	
	var occupiedSpots = getOccupiedSpots(spot, size);
	$(occupiedSpots).each(function () { spotAction(spot, this, tile); });
	
	var affectedSpots = getAffectedSpots(spot, range, size);
	$(affectedSpots).each(function () { updateSpotValue(this, value, valueCalc); });
}

function updateSpotValue(spot, value, valueCalc) {
	var oldvalue = $(spot).data(DATA_VALUE);
	if (oldvalue == null) oldvalue = 0;
	var newvalue = valueCalc(oldvalue, value);
	$(spot).data(DATA_VALUE, newvalue);
	$(spot).empty();
	if (newvalue > 0) $("<div/>").appendTo(spot).text(newvalue);
}

function spotDeactivate(originSpot, spot, tile) {
	$(tile).data(DATA_SPOT, null);
	$(spot).data(DATA_TILE, null);
	$(spot).droppable('enable');
	$(spot).removeClass('active');
}

function spotActivate(originSpot, spot, tile) {
	$(tile).data(DATA_SPOT, originSpot);
	$(spot).data(DATA_TILE, tile);
	$(spot).droppable('disable');
	$(spot).addClass('active');
}

/* == HELPERS == */

function log(message, p1, p2, p3, p4) {
	var message = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4);
	console.log(logcounter++ + ": " + message);
}

function calculateSize(blockSize, px) {
	return px * size + (size - 1);
}

function getCoords(spot) {
	var row = $(spot).parent("tr");
	var x = $(row).find(".spot").index(spot) + 1;
	var y = $("#board tr").index(row) + 1;
	return { x: x, y: y };
}

function getSpot(x, y) {
	var row = $("#board tr.row").eq(y);
	var spot = row.find("td.spot").eq(x);
	return spot;
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



