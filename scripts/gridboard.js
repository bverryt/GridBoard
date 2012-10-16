// TODO: optimize the .each() calls in getOccupiedTiles/getAffectedTiles
// TODO: add residential buildings ('receivers')
// TODO: allow save/load of board + inventory
// TODO: let user add items to inventory
// TODO: use different colours (decorations/attractions)
// TODO: re-write as a generic board game plugin
// TODO: stop storing a building's location in data("tile")
// TODO: use prototyping for the building plans

/* CONSTANTS */
var NUM_OF_ROWS = 20, NUM_OF_COLS = 30; TILE_SIZE = 20;

/* GLOBALS */
var buildingLookup = [], logCounter = 1;




$(init);

//<editor-fold desc="INIT">

function init() {
	$("body").disableSelection();
	initBoard();
	initInventory();
	initBuildingEdit();
}

function initBoard() {
	var board = $("#board");
    for (var y = 1; y <= NUM_OF_ROWS; y++) {
        var row = $("<tr/>").addClass("row").appendTo(board);
        for (var x = 1; x <= NUM_OF_COLS; x++) {
            var coords = new Coordinates(x, y);
            var tile = createTile(x, y).appendTo(row);
            buildingLookup[coords] = null;
        }
    }
}

function initInventory() {
	var board = $("#board");
	var inventory = $("#inventory");
    var br = "<br/>";

	appendBuildings(10, {width:1, height:1, bonus:5,  range:2, type:'decoration'});  inventory.append(br);
	appendBuildings(3,  {width:2, height:2, bonus:10, range:2, type:'decoration'});
	appendBuildings(2,  {width:3, height:2, bonus:10, range:2, type:'decoration'});  inventory.append(br);
	appendBuildings(2,  {width:3, height:3, bonus:25, range:3, type:'decoration'});
	appendBuildings(3,  {width:2, height:3, bonus:25, range:3, type:'decoration'});  inventory.append(br);
	appendBuildings(5,  {width:2, height:2, bonus:0,  range:2, type:'residential'}); inventory.append(br);
	appendBuildings(5,  {width:2, height:2, bonus:0,  range:2, type:'residential'}); inventory.append(br);

	inventory.droppable({ drop: handleBuildingRestack, tolerance: 'fit' });
	inventory.height(board.height() - 22);
}

function appendBuildings(amount, plan) {
    // add a set amount of buildings, make make sure each building has a unique id
    var inventory = $("#inventory");
    for (var i = 0; i < amount; i++) {
            var building = createBuilding(plan);
            var id = "building" + (inventory.find(".building").length + 1);
            building.attr("id", id).appendTo(inventory);
    }
}

function initBuildingEdit() {
    // initialize the dialog that edits buildings
	var buildingEdit = $("<form/>").attr("id", "buildingEdit").appendTo("#inventory");
    buildingEdit.append("<label>bonus</label>").append(createTextInput("bonus")).append("<br/>");
    buildingEdit.append("<label>range</label>").append(createTextInput("range")).append("<br/>");
    buildingEdit.append("<label>name</label>").append(createTextInput("name")).append("<br/>");

	buildingEdit.dialog({
		height: 120	, width: 250,
		autoOpen: false, modal: true, resizable: false,
		title: "edit building"
	});
}
//</editor-fold>

//<editor-fold desc="CREATORS">

function createTile(x, y) {
    var tile = $("<td/>").addClass("tile");
    var coords = new Coordinates(x, y);

    tile.width(TILE_SIZE).height(TILE_SIZE);
    tile.data("coords", coords).data("bonus", 0);

    tile.droppable({
        accept:".building", tolerance:"pointer", hoverClass:"hovered",
        over:handleTileOver, drop:handleBuildingPlacement
    });

    return tile;
}

function createBuilding(plan){
    if (!plan.bonus) plan.bonus = 0;
    if (!plan.range) plan.range = 2;
    if (!plan.type) plan.type = 'decoration';
    if (!plan.width) plan.width = 1;
    if (!plan.height) plan.height = 1;
    if (!plan.value) plan.value = 0;

	var building = $("<div/>").addClass("building");

	building.text(plan.bonus);
    building.attr("title", plan.bonus + "x" + plan.range);
    building.addClass(plan.type);

	building.data("range", plan.range);
    building.data("bonus", plan.bonus);
    building.data("name", "");
    building.data("width", plan.width);
    building.data("height", plan.height);
    building.data("value", plan.value);

    building.draggable({ start:handleDragStart, revert:"invalid", inventory:".building", cursorAt:{ left:5, top:5} });
	building.dblclick(handleBuildingEdit);

	building.width(TILE_SIZE * plan.width + (plan.width - 1));
	building.height(TILE_SIZE * plan.height + (plan.height - 1));

    return building;
}

//</editor-fold>

//<editor-fold desc="EVENT HANDLERS">

function handleDragStart(event, ui) {
    $("#board").find("td.tile").draggable("option", "accept", ".building"); // reset all tiles to accept all buildings
}

function handleTileOver(event, ui) {
    // handle the movement of a building over the board. Trigger validation.

	var tile = $(this);
	var building = ui.draggable;
	if (!validateTile(tile, building)) { // if invalid
		var selector = ".building:not(#" + $(building).attr("id") + ")"; // don't deny the current building
		tile.droppable("option", "accept", selector).removeClass("hovered");
	}
}

function handleBuildingPlacement(event, ui) {
    // handle the placement of a building on a board tile

	var building = ui.draggable;
	var oldTile = $(building).data("tile");
	var newTile = $(this);

	if (oldTile != null) cleanupBuilding(oldTile, building); // cleanup old tile
	placeBuilding(newTile, building); // place on new tile
	building.position({ of: $(this), my: "left top", at: "left top" });
}

function handleBuildingRestack(event, ui) {
    // handle the placement of a building back into the inventory
	var building = ui.draggable;
	var oldTile = $(building.data("tile"));
    if (oldTile != null) cleanupBuilding(oldTile, building); // remove from old tile
    // TODO: reset residential value to 0 on restack
}

function handleBuildingEdit(event) {
    // set up the buildingEdit dialog for a specific building

	var building = $(this);
	var buildingEdit = $("#buildingEdit");
	buildingEdit.enter(function () { editBuilding(buildingEdit, building); });
	buildingEdit.find("input[name=bonus]").val($(building).data("bonus")).focus(function () { this.select(); });
	buildingEdit.find("input[name=range]").val($(building).data("range"));
	buildingEdit.find("input[name=name]").val($(building).data("name"));
	buildingEdit.dialog("open");
}

//</editor-fold>

//<editor-fold desc="ACTIONS">

function editBuilding(buildingEdit, building) {
    // apply the changes entered via the buildingEdit dialog.

    var tile = $(building).data("tile");
    if (tile != null) cleanupBuilding(tile, building);

	var newBonus = parseInt(buildingEdit.find("input[name=bonus]").val());
	var newRange = parseInt(buildingEdit.find("input[name=range]").val());
    var newName = buildingEdit.find("input[name=name]").val();

    $(building).data("bonus", newBonus).text(newBonus);
	$(building).data("range", newRange);
	$(building).data("name", newName);
	if (newName != "") building.text(newName.toUpperCase());

	if (tile != null)  placeBuilding(tile, building);

	$(buildingEdit).dialog("close");
}

function validateTile(tile, building) {
    // check if building is placeable on a certain tile. Check for edges and overlap.

	var width = $(building).data("width");
	var height = $(building).data("height");
	if (width == 1 && height == 1) return true;

	var topLeft = coordsFromTile(tile);
	if (topLeft.x + width - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
	if (topLeft.y + height - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

	var buildingId = $(building).attr("id");
	for (var x = topLeft.x; x < topLeft.x + width; x++)
		for (var y = topLeft.y; y < topLeft.y + height; y++)
        {
            var coords = new Coordinates(x, y);
            if (buildingLookup[coords] != null && buildingLookup[coords] != buildingId) return false;
        }

	return true;
}

function placeBuilding(tile, building) {
	processBuilding(tile, building, tileActivate, function (a, b) { return a + b; });
}

function cleanupBuilding(tile, building) {
	processBuilding(tile, building, tileDeactivate, function (a, b) { return a - b; });
}

function processBuilding(tile, building, tileActivation, bonusCalc) {

	// occupied tiles = tiles covered by the building itself
	var occupiedTiles = getOccupiedTiles(tile, building);
    var receivedBonus = 0;
	$(occupiedTiles).each(function () {
        var occupiedTile = $(this);
        tileActivation(tile, occupiedTile, building);
        receivedBonus = Math.max(receivedBonus, occupiedTile.data("bonus"));
    });

    // update value of the placed building, if residential
    if (building.hasClass("residential")) building.data("value", receivedBonus).text(receivedBonus);

	// affected tiles = tiles within range
	var affectedTiles = getAffectedTiles(tile, building);
    var bonus = $(building).data("bonus");
	$(affectedTiles).each(function () {
        var affectedTile = $(this);
        updateTileBonus(affectedTile, bonus, bonusCalc);
   });

}

function updateTileBonus(tile, bonus, bonusCalc) {
	var coords = coordsFromTile(tile);
	var oldBonus = $(tile).data("bonus");
	if (oldBonus == null) oldBonus = 0;
	var newBonus = bonusCalc(oldBonus, bonus);
	$(tile).data("bonus", newBonus);
	$(tile).empty();
	if (newBonus > 0) $("<div/>").appendTo(tile).text(newBonus);
}

function tileDeactivate(originTile, tile, building) {
	$(building).data("tile", null);
	$(tile).removeClass("active");
	var coords = coordsFromTile(tile);
    buildingLookup[coords] = null;
}

function tileActivate(originTile, tile, building) {
	$(building).data("tile", originTile);
	$(tile).addClass("active");
	var coords = coordsFromTile(tile);
    buildingLookup[coords] =  building.attr("id");
}
//</editor-fold>


//<editor-fold desc="COORDINATES">

function Coordinates(x,y) { this.x = x;  this.y = y;}
Coordinates.prototype.toString = function() { return this.x + "_" + this.y; };

function coordsFromTile(tile) {
    var coords = $(tile).data("coords");
    // writeLog("coordsFromTile = $1:$2 ($3)", coords.x, coords.y, arguments.callee.caller.name);
    return coords;
}
//</editor-fold>


//<editor-fold desc="HELPERS">



//noinspection JSUnusedGlobalSymbols
function writeLog(message, p1, p2, p3, p4, p5) {
	var log = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4).replace("$5", p5);
	console.log(logCounter++ + ": " + log);
}

function createTextInput(name){
    return $("<input/>").attr("type", "text").attr("name", name);
}

function getOccupiedTiles(originTile, building) {
    var occupiedTiles = [];
    var width = $(building).data("width");
    var height = $(building).data("height");

	var origin = coordsFromTile(originTile);
	// TODO: find a better occupied/affected test than scanning the entire board
	$("#board").find("td").each(function () {
		var coords = coordsFromTile(this);
		if (coords.x >= origin.x && coords.x < origin.x + width)
			if (coords.y >= origin.y && coords.y < origin.y + height)
				occupiedTiles.push(this);
	});
	return occupiedTiles;
}

function getAffectedTiles(originTile, building) {
    var affectedTiles = [];
    var width = $(building).data("width");
    var height = $(building).data("height");
    var range = $(building).data("range");

	var origin = coordsFromTile(originTile);
	$("#board").find("td").each(function () {
		var coords = coordsFromTile(this);
		if (coords.x >= origin.x - range && coords.x < origin.x + range + width)
			if (coords.y >= origin.y - range && coords.y < origin.y + range + height) 
				affectedTiles.push(this);
	});
	return affectedTiles;
}

//</editor-fold>

//<editor-fold desc="EXTENSIONS">
// new extension: "enter". Used as a shortcut to the keypress handler, but only for the enter key. Will only work once, then unbind.
(function ($) {
	$.fn.enter = function (handler) {
		return $(this).keypress(function (event) {
			if (event.which == 13) { event.preventDefault(); handler(); $(this).unbind(event); }
			});
	}}
)(jQuery);
//</editor-fold>


