// TODO: add residential buildings ('receivers')
// TODO: add buildings as json
// TODO: allow save/load of board + stack
// TODO: let user add items to stack
// TODO: use different colours (decorations/attractions)
// TODO: re-write as a generic boardgame plugin

/* CONSTANTS */
var NUM_OF_ROWS = 20, NUM_OF_COLS = 30;

/* GLOBALS */
var lookup = new Array(), logcounter = 1;

/* INIT */

$(init);

function init() {
	$("body").disableSelection();
	initBoard();
	initStack();
	initBuildingEdit();
}

function initBoard(board) {
	var board = $("#board");
	createSpots(board, NUM_OF_ROWS, NUM_OF_COLS);
}

function initStack() {
	var board = $("#board");
	var stack = $("#stack");
	var br = "<br/>";

	function repeat(times, fn) { for (var i = 0; i < times; i++) fn(); }
	repeat(15, function () { createBuilding(1, 1, 5, 2); }); stack.append(br);
	repeat(5, function () { createBuilding(2, 2, 10, 2); });
	repeat(2, function () { createBuilding(3, 2, 10, 2); });
	repeat(2, function () { createBuilding(1, 2, 10, 2); }); stack.append(br);
	repeat(3, function () { createBuilding(3, 3, 25, 3); });
	repeat(3, function () { createBuilding(2, 3, 25, 3); }); stack.append(br);
	repeat(2, function () { createBuilding(4, 4, 50, 3); }); stack.append(br);

	stack.droppable({ drop: handleBuildingRestack, tolerance: 'fit' });
	stack.height(board.height() - 22);
}

function initBuildingEdit() {
	var buildingEdit = $("<form/>").attr("id", "buildingEdit").appendTo("#stack");
	var valueEdit = $("<input/>").attr("type", "text").attr("name", "value");
	var rangeEdit = $("<input/>").attr("type", "text").attr("name", "range");
	var nameEdit = $("<input/>").attr("type", "text").attr("name", "name");

	buildingEdit.append("<label>value</label>").append(valueEdit).append("<br/>")
	buildingEdit.append("<label>range</label>").append(rangeEdit).append("<br/>")
	buildingEdit.append("<label>name</label>").append(nameEdit).append("<br/>")

	buildingEdit.dialog({
		height: 120	, width: 250,
		autoOpen: false, modal: true, resizable: false,
		title: "edit building"
	});
}

function createSpots(board, rows, cols) {
	for (var y = 1; y <= rows; y++) {
		var row = $("<tr/>").addClass("row").appendTo(board);
		for (var x = 1; x <= cols; x++) {

			var tile = $("<td/>").addClass("tile").appendTo(row);
			tile.droppable({
				accept: ".building", tolerance: "pointer", hoverClass: "hovered",
				over: handleSpotOver, drop: handleBuildingPlacement
			})

			if (lookup == null) lookup = new Array(NUM_OF_COLS);
			if (lookup[x] == null) lookup[x] = new Array(NUM_OF_ROWS);
			lookup[x][y] = null;
		}
	}
}

function createBuilding(width, height, value, range) {
	var stack = $("#stack");
	var id = "building" + (stack.find(".building").length + 1);

	var building = $("<div/>").addClass("building").attr("id", id).appendTo(stack);
	building.text(value).attr("title", value + "x" + range);
	building.data("range", range).data("value", value).data("name", "").data("width", width).data("height", height)
	building.draggable({ start: handleDragStart, revert: "invalid", stack: ".building", cursorAt: { left: 5, top: 5} });
	building.dblclick(handleBuildingEdit);

	building.width(building.width() * width + (width - 1));
	building.height(building.height() * height + (height - 1));
	return building;
}

/* EVENT HANDLERS */

function handleDragStart(event, ui) {
	$("#board td.tile").draggable("option", "accept", ".building"); // reset all tiles to accept all buildings
}

function handleSpotOver(event, ui) {
	var tile = $(this);
	var building = ui.draggable;
	if (!validateSpot(tile, building)) { // if invalid
		var selector = ".building:not(#" + $(building).attr("id") + ")"; // don't accept the current building
		tile.droppable("option", "accept", selector).removeClass("hovered");
	}
}

function handleBuildingPlacement(event, ui) {
	var building = ui.draggable;
	var oldSpot = $(building).data("tile");
	var newSpot = $(this);

	if (oldSpot != null) cleanupBuilding(oldSpot, building) // cleanup old tile
	placeBuilding(newSpot, building); // place on new tile	
	building.position({ of: $(this), my: "left top", at: "left top" });
}

function handleBuildingRestack(event, ui) {
	var building = ui.draggable;
	var oldSpot = $(building.data("tile"));
	cleanupBuilding(oldSpot, building); // remove from old tile
}

function handleBuildingEdit(event) {
	var building = $(this);
	var buildingEdit = $("#buildingEdit")

	buildingEdit.enter(function () { editValue(buildingEdit, building); });
	buildingEdit.find("input[name=value]").val($(building).data("value")).focus(function () { this.select(); });
	buildingEdit.find("input[name=range]").val($(building).data("range"));
	buildingEdit.find("input[name=name]").val($(building).data("name"));
	buildingEdit.dialog("open");
}	

/* ACTIONS */

function editValue(buildingEdit, building) {
	var oldValue = $(building).data("value");
	var newValue = buildingEdit.find("input[name=value]").val() * 1;
	$(building).data("value", newValue).text(newValue);

	var oldRange = $(building).data("range");
	var newRange = buildingEdit.find("input[name=range]").val() * 1;
	$(building).data("range", newRange);

	var newName = buildingEdit.find("input[name=name]").val();
	$(building).data("name", newName);
	if (newName != "") building.text(newName.toUpperCase())

	var tile = $(building).data("tile");
	if (tile != null) {
		cleanupBuilding(tile, building, oldValue, oldRange);
		placeBuilding(tile, building, newValue, newRange);
	}

	$(buildingEdit).dialog("close");
}

function validateSpot(tile, building) {
	var width = $(building).data("width");
	var height = $(building).data("height");
	if (width == 1 && height == 1) return true;

	var coords = getCoords(tile);
	if (coords.x + width - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
	if (coords.y + height - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

	var id = $(building).attr("id");
	for (var x = coords.x; x < coords.x + width; x++)
		for (var y = coords.y; y < coords.y + height; y++) 
			if (lookup[x][y] != null && lookup[x][y] != id) return false;

	return true;
}

function placeBuilding(tile, building, value, range) {
	processBuildingChange(tile, building, value, range, tileActivate, function (a, b) { return a + b; });
}

function cleanupBuilding(tile, building, value, range) {
	processBuildingChange(tile, building, value, range, tileDeactivate, function (a, b) { return a - b; });
}

function processBuildingChange(tile, building, value, range, tileAction, valueCalc) {


	var width = $(building).data("width");
	var height = $(building).data("height");
	if (value == null) value = $(building).data("value");
	if (range == null) range = $(building).data("range");

	// occupied tiles = tiles covered by the building itself
	var occupiedSpots = getOccupiedSpots(tile, width, height);
	$(occupiedSpots).each(function () { tileAction(tile, this, building); });

	// affected tiles = tiles within range
	var affectedSpots = getAffectedSpots(tile, range, width, height);
	$(affectedSpots).each(function () { updateSpotValue(this, value, valueCalc); });
}

function updateSpotValue(tile, value, valueCalc) {
	var coords = getCoords(tile);
	var oldValue = $(tile).data("value");
	if (oldValue == null) oldValue = 0;
	var newValue = valueCalc(oldValue, value);
	$(tile).data("value", newValue);
	$(tile).empty();
	if (newValue > 0) $("<div/>").appendTo(tile).text(newValue);
}

function tileDeactivate(originSpot, tile, building) {
	$(building).data("tile", null);
	$(tile).removeClass("active");
	var coords = getCoords(tile);
	lookup[coords.x][coords.y] = null;
}

function tileActivate(originSpot, tile, building) {
	$(building).data("tile", originSpot);
	$(tile).addClass("active");
	var coords = getCoords(tile);
	lookup[coords.x][coords.y] = building.attr("id");
}

/* == HELPERS == */



function writelog(message, p1, p2, p3, p4) {
	var message = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4);
	console.log(logcounter++ + ": " + message);
}

function getCoords(tile) {
	var row = $(tile).parent("tr");
	var x = $(row).find(".tile").index(tile) + 1;
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

// new extension: "enter". Used as a shortcut to the keypress handler, but only for the enter key. Will only work once, then unbind.
(function ($) {	
	$.fn.enter = function (handler) {
		return $(this).keypress(function (event) { 
			if (event.which == 13) { event.preventDefault(); handler(); $(this).unbind(event); } 
			});
	}}
)(jQuery);


