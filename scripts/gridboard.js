﻿// TODO: reset residential value to 0 on restack
// TODO: optimize the .each() calls in getOccupiedTiles/getAffectedTiles
// TODO: add residential buildings ('receivers')
// TODO: allow save/load of board + inventory
// TODO: let user add items to inventory
// TODO: use different colours (decorations/attractions)
// TODO: re-write as a generic board game plugin
// TODO: use prototyping for the building plans

var gridboard = new function() {

    var NUM_OF_ROWS = 20, NUM_OF_COLS = 30, TILE_SIZE = 20;

    this.buildingLookup = [];
    this.tileLookup = [];
    this.logCounter = 1;
    this.board = {};
    this.inventory = {};

    this.init = function (boardSelector, inventorySelector) {
        this.board = $(boardSelector);
        this.inventory = $(inventorySelector);
        initBoard();
        initInventory();
        initBuildingEdit();
    };

    //<editor-fold desc="INIT BOARD/TILES">

    function initBoard() {
        for (var y = 1; y <= NUM_OF_ROWS; y++) {
            var row = $("<tr/>").addClass("row").appendTo(gridboard.board);
            for (var x = 1; x <= NUM_OF_COLS; x++) {
                var coords = new Coordinates(x, y);
                var tile = createTile(x, y).appendTo(row);
                gridboard.buildingLookup[coords] = null;
            }
        }
    }

    function createTile(x, y) {
        var tile = $("<td/>").addClass("tile");
        tile.width(TILE_SIZE).height(TILE_SIZE);
        tile.data("coords", new Coordinates(x, y));
        tile.data("bonus", 0);
        tile.droppable({
            accept:".building", tolerance:"pointer", hoverClass:"hovered",
            over: setTileDroppable,
            drop:moveBuildingToTile  });
        return tile;
    }

    function setTileDroppable(event, ui) {
        var tile = this;
        var building = ui.draggable;

        // if the tile is not a valid spot for the building, de-activate droppable.
        if (!validateTile(tile, building)) { // if invalid
            var selector = ".building:not(#" + $(building).attr("id") + ")"; // don't deny the current building
            $(tile).droppable("option", "accept", selector).removeClass("hovered");
        }
    }

    function validateTile(tile, building) {
        // check if building is placeable on a certain tile. Check for edges and overlap.

        var width = $(building).data("width");
        var height = $(building).data("height");
        if (width == 1 && height == 1) return true;

        var topLeft = $(tile).data("coords");
        if (topLeft.x + width - 1 > NUM_OF_COLS) return false; // don't allow overlap of right edge
        if (topLeft.y + height - 1 > NUM_OF_ROWS) return false; // don't allow overlap of bottom edge

        var buildingId = $(building).attr("id");
        for (var x = topLeft.x; x < topLeft.x + width; x++)
            for (var y = topLeft.y; y < topLeft.y + height; y++)
            {
                var coords = new Coordinates(x, y);
                if (gridboard.buildingLookup[coords] != null && gridboard.buildingLookup[coords] != buildingId) return false;
            }

        return true;
    }

    function resetDragForAllTiles(event, ui) {
        // reset all tiles to accept all buildings
        gridboard.board.find("td.tile").draggable("option", "accept", ".building");
    }

    //</editor-fold>

    //<editor-fold desc="INIT INVENTORY/BUILDINGS">

    function initInventory() {
        var inventory = gridboard.inventory;
        var board = gridboard.board;
        var br = "<br/>";

        addToInventory(10, {width:1, height:1, bonus:5,  range:2, type:'decoration'});
        inventory.append(br);
        addToInventory(3,  {width:2, height:2, bonus:10, range:2, type:'decoration'});
        addToInventory(2,  {width:3, height:2, bonus:10, range:2, type:'decoration'});
        inventory.append(br);
        addToInventory(2,  {width:3, height:3, bonus:25, range:3, type:'decoration'});
        addToInventory(3,  {width:2, height:3, bonus:25, range:3, type:'decoration'});
        inventory.append(br);
        addToInventory(5,  {width:2, height:2, bonus:0,  range:2, type:'residential'}); inventory.append(br);
        addToInventory(5,  {width:2, height:2, bonus:0,  range:2, type:'residential'}); inventory.append(br);
        addToInventory(5,  {width:2, height:2, bonus:0,  range:2, type:'residential'}); inventory.append(br);

        inventory.droppable({ drop: moveBuildingToInventory, tolerance: 'fit' });
        inventory.height(board.height() - 22);
    }

    function addToInventory(amount, plan) {
        // add a set amount of buildings, make make sure each building has a unique id
        for (var i = 0; i < amount; i++) {
            var building = createBuilding(plan);
            var id = "building" + ($(gridboard.inventory).find(".building").length + 1);
            building.attr("id", id).appendTo(gridboard.inventory);
        }
    }

    function createBuilding(plan){
        if (!plan.bonus) plan.bonus = 0;
        if (!plan.range) plan.range = 2;
        if (!plan.type) plan.type = 'decoration';
        if (!plan.width) plan.width = 1;
        if (!plan.height) plan.height = 1;
        if (!plan.value) plan.value = 0;

        var building = $("<div/>").addClass("building").addClass(plan.type);
        building.attr("title", plan.bonus + "x" + plan.range);
        building.data("range", plan.range);
        building.data("bonus", plan.bonus).text(plan.bonus);
        building.data("name", "");
        building.data("width", plan.width);
        building.data("height", plan.height);
        building.data("value", plan.value);

        building.draggable({
            start:resetDragForAllTiles,
            revert:"invalid", inventory:".building", cursorAt:{ left:5, top:5} });
        building.dblclick(openBuildingEditDialog);
        building.width(TILE_SIZE * plan.width + (plan.width - 1));
        building.height(TILE_SIZE * plan.height + (plan.height - 1));

        return building;
    }

    //</editor-fold>

    //<editor-fold desc="BUILDING PLACEMENT">

    function moveBuildingToTile(event, ui) {
        var building  = ui.draggable;
        var tile = this;

        // handle the movement of a building from one place to another
        var previousTile = gridboard.tileLookup[$(building).attr("id")];
        if (previousTile != null) cleanup(previousTile, building);
        place(tile, building); // place on new tile
        building.position({ of:$(tile), my:"left top", at:"left top" });
    }

    function moveBuildingToInventory(event, ui) {
        var building = ui.draggable;

        // handle the placement of a building back into the inventory
        var previousTile = gridboard.tileLookup[$(building).attr("id")];
        if (previousTile != null) cleanup(previousTile, building); // remove from old tile

    }

    function place(tile, building) {
        var occupiedTiles = getOccupiedTiles(tile, building);
        var affectedTiles = getAffectedTiles(tile, building);
        var maxBonus = 0;

        $(occupiedTiles).each(function () {
            gridboard.tileLookup[$(building).attr("id")] = tile;
            $(this).addClass("active");
            var coords = $(this).data("coords");
            gridboard.buildingLookup[coords] = building.attr("id");
            maxBonus = Math.max(maxBonus, $(this).data("bonus"));
        });

        // TODO: use percentage value for residential calculation. Don't discriminate - non-residential will be 0%
        if (building.hasClass("residential")) building.data("value", maxBonus).text(maxBonus);

        var bonus = $(building).data("bonus");
        $(affectedTiles).each(function () {
            updateTileBonus(this, bonus, function (a, b) { return a + b; });
        });
    }

    function cleanup(tile, building) {
        var occupiedTiles = getOccupiedTiles(tile, building);
        var affectedTiles = getAffectedTiles(tile, building);

        $(occupiedTiles).each(function () {
            gridboard.tileLookup[$(building).attr("id")] = null;
            $(this).removeClass("active");
            var coords = $(this).data("coords");
            gridboard.buildingLookup[coords] = null;
        });


        var bonus = $(building).data("bonus");
        $(affectedTiles).each(function () {
            updateTileBonus(this, bonus, function (a, b) { return a - b; });
        });
    }

    function updateTileBonus(tile, bonus, bonusCalc) {
        var coords = $(tile).data("coords");
        var oldBonus = $(tile).data("bonus");
        if (oldBonus == null) oldBonus = 0;
        var newBonus = bonusCalc(oldBonus, bonus);
        $(tile).data("bonus", newBonus);
        $(tile).empty();
        if (newBonus > 0) $("<div/>").appendTo(tile).text(newBonus);
    }

    //</editor-fold>

    //<editor-fold desc="BUILDING EDIT">

    function initBuildingEdit() {
        // initialize the dialog that edits buildings
        var buildingEdit = $("<form/>").attr("id", "buildingEdit").appendTo(gridboard.inventory);
        buildingEdit.append("<label>bonus</label>").append(createTextInput("bonus")).append("<br/>");
        buildingEdit.append("<label>range</label>").append(createTextInput("range")).append("<br/>");
        buildingEdit.append("<label>name</label>").append(createTextInput("name")).append("<br/>");
        buildingEdit.dialog({
            height: 120	, width: 250,
            autoOpen: false, modal: true, resizable: false,
            title: "edit building"
        });
    }

    function openBuildingEditDialog(event) {

        var building = this;

        // set up the buildingEdit dialog for a specific building
        var buildingEdit = $("#buildingEdit");
        // init input default values

        buildingEdit.find("input[name=bonus]").val($(building).data("bonus"));
        buildingEdit.find("input[name=range]").val($(building).data("range"));
        buildingEdit.find("input[name=name]").val($(building).data("name"));
        buildingEdit.focus(function () { $("input[name=bonus]").select(); });
        buildingEdit.keypress(function (event) {
            if (event.which == 13) { // pressed ENTER
                event.preventDefault();
                saveBuildingEdits(buildingEdit, building);
                $(this).unbind(event); } // unbind is important, otherwise it will keep listening for this building
        });

        buildingEdit.dialog("open");
    }

    function saveBuildingEdits(buildingEdit, building) {
        // apply the changes entered via the buildingEdit dialog.

        var currentTile = gridboard.tileLookup[$(building).attr("id")];
        if (currentTile != null) cleanup(currentTile, building);

        var newBonus = parseInt(buildingEdit.find("input[name=bonus]").val());
        var newRange = parseInt(buildingEdit.find("input[name=range]").val());
        var newName = buildingEdit.find("input[name=name]").val();

        $(building).data("bonus", newBonus).text(newBonus);
        $(building).data("range", newRange);
        $(building).data("name", newName);

        if (newName != "") $(building).text(newName.toUpperCase());
        if (currentTile != null)  place(currentTile, building);

        $(buildingEdit).dialog("close");
    }

    //</editor-fold>

    //<editor-fold desc="HELPERS">

    function getOccupiedTiles(originTile, building) {
        var occupiedTiles = [];
        var width = $(building).data("width");
        var height = $(building).data("height");

        var origin = $(originTile).data("coords");
        // TODO: find a better occupied/affected test than scanning the entire board
        gridboard.board.find("td").each(function () {
            var coords = $(this).data("coords");
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

        var origin = $(originTile).data("coords");
        gridboard.board.find("td").each(function () {
            var coords = $(this).data("coords");
            if (coords.x >= origin.x - range && coords.x < origin.x + range + width)
                if (coords.y >= origin.y - range && coords.y < origin.y + range + height)
                    affectedTiles.push(this);
        });
        return affectedTiles;
    }

    //noinspection JSUnusedGlobalSymbols
    function writeLog(message, p1, p2, p3, p4, p5) {
        var log = message.replace("$1",p1).replace("$2",p2).replace("$3",p3).replace("$4",p4).replace("$5", p5);
        console.log(gridboard.logCounter++ + ": " + log);
    }

    function createTextInput(name){
        return $("<input/>").attr("type", "text").attr("name", name);
    }


    //</editor-fold>

    //<editor-fold desc="COORDINATES">
    function Coordinates(x,y) {
        this.x = x;
        this.y = y;
    }

    Coordinates.prototype.toString = function() {     return this.x + "_" + this.y; };
    //</editor-fold>



};






