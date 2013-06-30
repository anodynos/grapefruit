/**
 * The TiledLayer is the visual tiled layer that actually displays on the screen
 *
 * This class will be created by the TiledMap, there shouldn't be a reason to
 * create an instance on your own.
 *
 * @class TiledLayer
 * @extends Layer
 * @constructor
 * @param layer {Object} All the settings for the layer
 */
//see: https://github.com/GoodBoyDigital/pixi.js/issues/48
gf.TiledLayer = function(layer) {
    gf.Layer.call(this, layer);

    /**
     * The tile IDs of the tilemap
     *
     * @property name
     * @type Uint32Array
     */
    this.tileIds = gf.support.typedArrays ? new Uint32Array(layer.data) : layer.data;

    /**
     * The current map of all tiles on the screen
     *
     * @property tiles
     * @type Object
     */
    this.tiles = {};

    /**
     * The user-defined properties of this group. Usually defined in the TiledEditor
     *
     * @property properties
     * @type Object
     */
    this.properties = layer.properties || {};

    //translate some tiled properties to our inherited properties
    this.position.x = layer.x;
    this.position.y = layer.y;
    this.alpha = layer.opacity;
    this.visible = layer.visible;

    this._tilePool = [];
    this._buffered = { left: false, right: false, top: false, bottom: false };
    this._panDelta = new gf.Vector(0, 0);
    this._rendered = new gf.Rectangle(0, 0, 0, 0);
};

gf.inherits(gf.TiledLayer, gf.Layer, {
    /**
     * Creates all the tile sprites needed to display the layer
     *
     * @method renderTiles
     * @param startX {Number} The starting x tile position
     * @param startY {Number} The starting y tile position
     * @param numX {Number} The number of tiles in the X direction to render
     * @param numY {Number} The number of tiles in the Y direction to render
     */
    renderTiles: function(startX, startY, numX, numY) {
        //clear all the visual tiles
        this.clearTiles();

        //ensure we don't go below 0
        startX = startX < 0 ? 0 : startX;
        startY = startY < 0 ? 0 : startY;

        //ensure we don't go outside the map size
        var endX = (startX + numX <= this.parent.size.x) ? startX + numX : (this.parent.size.x - startX);
        var endY = (startY + numY <= this.parent.size.y) ? startY + numY : (this.parent.size.y - startY);

        //render new sprites
        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                this.moveTileSprite(x, y, x, y);
            }
        }

        //set rendered area
        this._rendered.x = startX;
        this._rendered.y = startY;
        this._rendered.width = endX - startX;
        this._rendered.height = endY - startY;
        this._updateRenderSq();

        //reset buffered status
        this._buffered.left = this._buffered.right = this._buffered.top = this._buffered.bottom = false;

        //reset panDelta
        this._panDelta.x = this.parent.position.x % this.parent.scaledTileSize.x;
        this._panDelta.y = this.parent.position.y % this.parent.scaledTileSize.y;
    },
    /**
     * Clears all the tiles currently used to render the layer
     *
     * @method clearTiles
     */
    clearTiles: function() {
        //hide/free each tile and remove from the memory map
        for(var x in this.tiles) {
            for(var y in this.tiles[x]) {
                var tile = this.tiles[x][y];

                if(tile) {
                    //hide/free the sprite
                    tile.visible = false;
                    tile.disablePhysics();
                    this._tilePool.push(tile);
                }

                //remove the Y key
                delete this.tiles[x][y];
            }

            //keep the X key so we dont have to recreate these objects
            //delete this.tiles[x];
        }
    },
    /**
     * Moves a tile sprite from one position to another, and creates a new tile
     * if the old position didn't have a sprite
     *
     * @method moveTileSprite
     * @param fromTileX {Number} The x coord of the tile in units of tiles (not pixels) to move from
     * @param fromTileY {Number} The y coord of the tile in units of tiles (not pixels) to move from
     * @param toTileX {Number} The x coord of the tile in units of tiles (not pixels) to move to
     * @param toTileY {Number} The y coord of the tile in units of tiles (not pixels) to move to
     * @return {PIXI.Sprite} The sprite to display
     */
    moveTileSprite: function(fromTileX, fromTileY, toTileX, toTileY) {
        var tile,
            id = (toTileX + (toTileY * this.size.x)),
            tileId = this.tileIds[id],
            set = this.parent.getTileset(tileId),
            iso = (this.parent.orientation === 'isometric'),
            texture,
            props,
            position,
            hitArea,
            interactive;

        //if no tileset, just ensure the "from" tile is put back in the pool
        if(!set) {
            if(this.tiles[fromTileX] && this.tiles[fromTileX][fromTileY]) {
                var t = this.tiles[fromTileX][fromTileY];
                this.tiles[fromTileX][fromTileY] = null;

                t.visible = false;
                this._tilePool.push(t);
            }
            return;
        }

        //grab some values for the tile
        texture = set.getTileTexture(tileId);
        props = set.getTileProperties(tileId);
        hitArea = props.hitArea || set.properties.tileHitArea;
        interactive = this._getInteractive(set, props),
        position = iso ?
            // Isometric position
            [
                (toTileX * (this.parent.tileSize.x / 2)) - (toTileY * (this.parent.tileSize.x / 2)) + (this.parent.tileSize.x - set.tileSize.x) + set.tileoffset.x,
                (toTileY * (this.parent.tileSize.y / 2)) + (toTileX * (this.parent.tileSize.y / 2)) + (this.parent.tileSize.y - set.tileSize.y) + set.tileoffset.y
            ]
            :
            // Orthoganal position
            [
                (toTileX * this.parent.tileSize.x) + set.tileoffset.x,
                (toTileY * this.parent.tileSize.y) + set.tileoffset.y
            ];

        //if there is one to move in the map, lets just move it
        if(this.tiles[fromTileX] && this.tiles[fromTileX][fromTileY]) {
            tile = this.tiles[fromTileX][fromTileY];
            this.tiles[fromTileX][fromTileY] = null;
        }
        //otherwise grab a new tile from the pool
        else {
            tile = this._tilePool.pop();
        }

        //if we couldn't find a tile from the pool, or one to move
        //then create a new tile
        if(!tile) {
            tile = new gf.Tile(texture);
            tile.mass = Infinity;
            this.addChild(tile);
        }

        if(props.isCollidable)
            tile.enablePhysics(this.parent.parent.physics); //this.TiledMap.GameState.physics

        tile.setTexture(texture);
        tile.setPosition(position[0], position[1]);
        tile.setInteractive(interactive);

        tile.collisionType = props.type;
        tile.visible = true;
        tile.hitArea = hitArea;

        //pass through all events
        if(interactive) {
            tile.click = this.onTileEvent.bind(this, 'click', tile);
            tile.mousedown = this.onTileEvent.bind(this, 'mousedown', tile);
            tile.mouseup = this.onTileEvent.bind(this, 'mouseup', tile);
            tile.mousemove = this.onTileEvent.bind(this, 'mousemove', tile);
            tile.mouseout = this.onTileEvent.bind(this, 'mouseout', tile);
            tile.mouseover = this.onTileEvent.bind(this, 'mouseover', tile);
            tile.mouseupoutside = this.onTileEvent.bind(this, 'mouseupoutside', tile);
        }

        //update sprite position in the map
        if(!this.tiles[toTileX])
            this.tiles[toTileX] = {};

        this.tiles[toTileX][toTileY] = tile;

        return tile;
    },
    onTileEvent: function(eventName, tile, data) {
        this.parent.onTileEvent(eventName, tile, data);
    },
    _getInteractive: function(set, o) {
        var v;

        //first check the lowest level value (on the tile iteself)
        if(o.interactive !== undefined || o.interactiveTiles !== undefined)
            v = o;
        //next check if the tileset has the value
        else if(set && (set.properties.interactive !== undefined || set.properties.interactiveTiles !== undefined))
            v = set.properties;
        //next check if this layer has interactive tiles
        else if(this.properties.interactive !== undefined || this.properties.interactiveTiles !== undefined)
            v = this.properties;
        //finally check if the map as a whole has interactive tiles
        else if(this.parent.properties.interactive !== undefined || this.parent.properties.interactiveTiles !== undefined)
            v = this.parent.properties;

        //see if anything has a value to use
        if(v) {
            //if they do, lets grab what the interactive value is
            return !!(v.interactive || v.interactiveTiles);
        }

        return false;
    },
    /**
     * Pans the layer around, rendering stuff if necessary
     *
     * @method pan
     * @param dx {Number|Point} The x amount to pan, if a Point is passed the dy param is ignored
     * @param dy {Number} The y ammount to pan
     * @return {Layer} Returns itself for chainability
     */
    pan: function(dx, dy) {
        this._panDelta.x += dx;
        this._panDelta.y += dy;

        //check if we need to build a buffer around the viewport
        //usually this happens on the first pan after a full render

        //moving world right, so left will be exposed
        if(dx > 0 && !this._buffered.left)
            this._renderLeft(this._buffered.left = true);
        //moving world left, so right will be exposed
        else if(dx < 0 && !this._buffered.right)
            this._renderRight(this._buffered.right = true);
        //moving world down, so top will be exposed
        else if(dy > 0 && !this._buffered.top)
            this._renderUp(this._buffered.top = true);
        //moving world up, so bottom will be exposed
        else if(dy < 0 && !this._buffered.bottom)
            this._renderDown(this._buffered.bottom = true);

        //moved position right, so render left
        while(this._panDelta.x >= this.parent.scaledTileSize.x) {
            this._renderLeft();
            this._panDelta.x -= this.parent.scaledTileSize.x;
        }

        //moved position left, so render right
        while(this._panDelta.x <= -this.parent.scaledTileSize.x) {
            this._renderRight();
            this._panDelta.x += this.parent.scaledTileSize.x;
        }

        //moved position down, so render up
        while(this._panDelta.y >= this.parent.scaledTileSize.y) {
            this._renderUp();
            this._panDelta.y -= this.parent.scaledTileSize.y;
        }

        //moved position up, so render down
        while(this._panDelta.y <= -this.parent.scaledTileSize.y) {
            this._renderDown();
            this._panDelta.y += this.parent.scaledTileSize.y;
        }
    },
    _renderLeft: function(forceNew) {
        //move all the far right tiles to the left side
        for(var i = 0; i < this._rendered.height; ++i) {
            this.moveTileSprite(
                forceNew ? -1 : this._rendered.right,
                forceNew ? -1 : this._rendered.top + i,
                this._rendered.left - 1,
                this._rendered.top + i
            );
        }
        this._rendered.x--;
        if(forceNew) this._rendered.width++;
        this._updateRenderSq();
    },
    _renderRight: function(forceNew) {
        //move all the far left tiles to the right side
        for(var i = 0; i < this._rendered.height; ++i) {
            this.moveTileSprite(
                forceNew ? -1 : this._rendered.left,
                forceNew ? -1 : this._rendered.top + i,
                this._rendered.right + 1,
                this._rendered.top + i
            );
        }
        if(!forceNew) this._rendered.x++;
        if(forceNew) this._rendered.width++;
        this._updateRenderSq();
    },
    _renderUp: function(forceNew) {
        //move all the far bottom tiles to the top side
        for(var i = 0; i < this._rendered.width; ++i) {
            this.moveTileSprite(
                forceNew ? -1 : this._rendered.left + i,
                forceNew ? -1 : this._rendered.bottom,
                this._rendered.left + i,
                this._rendered.top - 1
            );
        }
        this._rendered.y--;
        if(forceNew) this._rendered.height++;
        this._updateRenderSq();
    },
    _renderDown: function(forceNew) {
        //move all the far top tiles to the bottom side
        for(var i = 0; i < this._rendered.width; ++i) {
            this.moveTileSprite(
                forceNew ? -1 : this._rendered.left + i,
                forceNew ? -1 : this._rendered.top,
                this._rendered.left + i,
                this._rendered.bottom + 1
            );
        }
        if(!forceNew) this._rendered.y++;
        if(forceNew) this._rendered.height++;
        this._updateRenderSq();
    },
    _updateRenderSq: function() {
        this._rendered.left = this._rendered.x;
        this._rendered.right = this._rendered.x + this._rendered.width - 1;
        this._rendered.top = this._rendered.y;
        this._rendered.bottom = this._rendered.y + this._rendered.height - 1;
    }
});
