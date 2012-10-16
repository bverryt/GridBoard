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
var tileLookup = [], lookup2 = [], logCounter = 1;


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
            createTile(x, y).appendTo(row);
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
    var tileId = "tile_x_y".replace("x",x).replace("y",y);

    tile.width(TILE_SIZE).height(TILE_SIZE);
    tile.attr("id", tileId).data("bonus", 0);

    tile.droppable({
        accept:".building", tolerance:"pointer", hoverClass:"hovered",
        over:handleTileOver, drop:handleBuildingPlacement
    });

    if (tileLookup == null) tileLookup = new Array(NUM_OF_COLS);
    if (tileLookup[x] == null) tileLookup[x] = new Array(NUM_OF_ROWS);
    tileLookup[x][y] = null;

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
	cleanupBuilding(oldTile, building); // remove from old tile
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

	var oldBonus = $(building).data("bonus");
	var newBonus = parseInt(buildingEdit.find("input[name=bonus]").val());
	$(building).data("bonus", newBonus).text(newBonus);

	var oldRange = $(building).data("range");
	var newRange = parseInt(buildingEdit.find("input[name=range]").val());
	$(building).data("range", newRange);

	var newName = buildingEdit.find("input[name=name]").val();
	$(building).data("name", newName);
	if (newName != "") building.text(newName.toUpperCase());

	var tile = $(building).data("tile");
	if (tile != null) {
		cleanupBuilding(tile, building, oldBonus, oldRange);
		placeBuilding(tile, building, newBonus, newRange);
	}

	$(buildingEdit).dialog("close");
}

function validateTile(tile, building) {
    // check if building is placeable on a certain tile. Check for edges and overlap.

	var width = $(building).data("width");
	var height = $(building).data("height");
	if (width == 1 && height == 1) return true;

	var coords = getCoords(tile);
	if (coords.x + width - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
	if (coords.y + height - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

    var tileId = $(tile).attr("id");

	var buildingId = $(building).attr("id");
	for (var x = coords.x; x < coords.x + width; x++)
		for (var y = coords.y; y < coords.y + height; y++)
        {
            // if (tileLookup[x][y] != null && tileLookup[x][y] != id) return false;
            writeLog("check $1 = $2", tileId, lookup2[tileId]);
            if (lookup2[tileId] != null && lookup2[tileId] != buildingId) return false;
        }

	return true;
}

function placeBuilding(tile, building, bonus, range) {
	processBuildingPlacement(tile, building, bonus, range, tileActivate, function (a, b) { return a + b; });
}

function cleanupBuilding(tile, building, bonus, range) {
	processBuildingPlacement(tile, building, bonus, range, tileDeactivate, function (a, b) { return a - b; });
}

function processBuildingPlacement(tile, building, bonus, range, tileActivation, bonusCalc) {
	var width = $(building).data("width");
	var height = $(building).data("height");
	if (bonus == null) bonus = $(building).data("bonus");
	if (range == null) range = $(building).data("range");

	// occupied tiles = tiles covered by the building itself
	var occupiedTiles = getOccupiedTiles(tile, width, height);
    var maxBonus = 0;
	$(occupiedTiles).each(function () {
        var occupiedTile = $(this);
        tileActivation(tile, occupiedTile, building);
        maxBonus = Math.max(maxBonus, occupiedTile.data("bonus"));
    });

    // update value of the placed building, if residential
    if (building.hasClass("residential")) building.data("value", maxBonus).text(maxBonus);

	// affected tiles = tiles within range
	var affectedTiles = getAffectedTiles(tile, range, width, height);
	$(affectedTiles).each(function () {
        var affectedTile = $(this);
        updateTileBonus(affectedTile, bonus, bonusCalc);


    });





}

function updateTileBonus(tile, bonus, bonusCalc) {
	var coords = getCoords(tile);
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
	var coords = getCoords(tile);
	tileLookup[coords.x][coords.y] = null;

    var tileId = $(tile).attr("id");
    lookup2[tileId] = null;
    writeLog("lookup $1 = null", tileId);
}

function tileActivate(originTile, tile, building) {
	$(building).data("tile", originTile);
	$(tile).addClass("active");
	var coords = getCoords(tile);
	tileLookup[coords.x][coords.y] = building.attr("id");

    var tileId = $(tile).attr("id");
    lookup2[tileId] =  building.attr("id");
    writeLog("lookup $1 = $2", tileId, building.attr("id"));
}
//</editor-fold>

//<editor-fold desc="HELPERS">

//noinspection JSUnusedGlobalSymbols
function writeLog(message, p1, p2, p3, p4) {
	var log = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4);
	console.log(logCounter++ + ": " + log);
}

function createTextInput(name){
    return $("<input/>").attr("type", "text").attr("name", name);
}

function getCoords(tile) {
	var row = $(tile).parent("tr");
	var x = $(row).find(".tile").index(tile) + 1;
	var y = $("#board").find("tr").index(row) + 1;
	return { x: x, y: y };
}

function getOccupiedTiles(originTile, width, height) {
	var occupiedTiles = [];
	var origin = getCoords(originTile);
	// TODO: find a better occupied/affected test than scanning the entire board
	$("#board").find("td").each(function () {
		var coords = getCoords(this);
		if (coords.x >= origin.x && coords.x < origin.x + width)
			if (coords.y >= origin.y && coords.y < origin.y + height)
				occupiedTiles.push(this);
	});
	return occupiedTiles;
}

function getAffectedTiles(originTile, range, width, height) {
	var affectedTiles = [];
	var origin = getCoords(originTile);
	$("#board").find("td").each(function () {
		var coords = getCoords(this);
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


