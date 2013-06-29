/**
 * The base Gui that holds GuiItems to be presented as a Gui
 *
 * @class Gui
 * @extends DisplayObject
 * @constructor
 * @param pos {Array|Vector|Point} The starting position of the sprite
 * @param settings {Object} Settings to override the defauls
 */
gf.Gui = function(pos, settings) {
    /**
     * The name of the Gui
     *
     * @property name
     * @type String
     * @default ''
     */
    this.name = '';

    gf.DisplayObjectContainer.call(this, null, pos, settings);
};

gf.inherits(gf.Gui, gf.DisplayObjectContainer);
