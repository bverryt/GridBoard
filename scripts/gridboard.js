$(init);

var NUM_OF_ROWS = 15; var NUM_OF_COLS = 20;

var ID_AREA = "#area", ID_BOARD = "#board", ID_STACK = "#stack";
var CLASS_ROW = "row", CLASS_TILE = "tile", CLASS_SPOT = "spot";
var DATA_SIZE = "size", DATA_VALUE = "value", DATA_RANGE = "range";
var DATA_TILE = "tile", DATA_SPOT = "spot";
var TAG_TR = "<tr/>", TAG_TD = "<td/>", TAG_DIV = "<div/>";
var ELEM_TR = "tr";

function init() {
	$(ID_AREA).disableSelection();

	var board = $(ID_BOARD);
	createSpots(board, NUM_OF_ROWS, NUM_OF_COLS);

	var stack = $(ID_STACK);
	createTiles(stack, 1, 10, 2, 10);
	createTiles(stack, 2, 20, 2, 5);
	createTiles(stack, 3, 50, 3, 3);
	createTiles(stack, 4, 100, 4, 2);
	stack.droppable({ drop: handleTileRestack });
	stack.width(board.width() - 22);
}

/* == INIT == */

function createSpots(board, rows, cols) {
	for (var y = 1; y <= rows; y++) {
		var row = $(TAG_TR).addClass(CLASS_ROW).appendTo(board);
		for (var x = 1; x <= cols; x++) {
			var spot = $(TAG_TD)
				.addClass(CLASS_SPOT)
				.droppable({
					accept: validateTile,
					tolerance: 'pointer',
					hoverClass: 'hovered',
					drop: handleTilePlacement })
				.appendTo(row);
		}
	}	
}

function createTiles(stack, size, value, range, amount) {
	for (var i = 0; i < amount; i++) {
		var tile = $(TAG_DIV)
			.addClass(CLASS_TILE)
			.text(value)
			.data(DATA_RANGE, range)
			.data(DATA_VALUE, value)
			.data(DATA_SIZE, size)
			.draggable({
				start: handleTileDrag,
				revert: 'invalid',
				stack: '.tile', 
				cursorAt: { left: 5, top: 5 } })
			.appendTo(stack);

		// set the correct size for the tile. Add extra pixels to account for gridlines.
		tile.height(tile.height() * size + (size - 1));
		tile.width(tile.width() * size + (size - 1));
	}
}

function calculateSize(blockSize, px) {
	return px * size + (size - 1);
}

/* == EVENT HANDLERS == */

function handleTileDrag() {
	var tile = this;
	var spot = $(tile).data(DATA_SPOT);
	if (spot == null) return; // don't cleanup when tile is picked up from stack
	cleanupTile($(tile).data(DATA_SPOT), tile); // remove from old spot
}

function handleTilePlacement(event, ui) {
	// TODO: check if ALL spots are available
	var tile = ui.draggable;
	placeTile($(this), tile); // place on new spot	
	tile.position({ of: $(this), my: 'left top', at: 'left top' });
}

function handleTileRestack(event, ui) {
	var tile = ui.draggable;
	cleanupTile($(tile.data(DATA_SPOT)), tile); // remove from old spot
}

function validateTile(draggable) {
	var tile = $(draggable);
	if (!tile.hasClass(CLASS_TILE)) return false;

	var size = tile.data(DATA_SIZE);
	if (size == 1) return true;
	
	var coords = getCoords(this);
	
	// TODO

	return true;
}

/* == ACTIONS -- */

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
	if (newvalue > 0) $(TAG_DIV).appendTo(spot).text(newvalue);
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



