var inherit = require('../utils/inherit'),
    Keyboard = require('./Keyboard'),
    Gamepad = require('./Gamepad'),
    Pointers = require('./Pointers');

/**
 * Manages all input handlers in a unified way
 *
 * @class InputManager
 * @extends Object
 * @constructor
 * @param game {Game} The game instance this input belongs to
 */
var InputManager = function(game) {
    /**
     * The game instance this manager belongs to
     *
     * @property game
     * @type Game
     */
    this.game = game;

    /**
     * The dom element to bind events to
     *
     * @property canvas
     * @type Game
     */
    this.canvas = game.canvas;

    /**
     * Holds the keyboard handler for keyboard events
     *
     * @property keyboard
     * @type Keyboard
     * @readOnly
     */
    this.keyboard = new Keyboard(game);

    /**
     * Holds the pointer handler for pointer events
     *
     * @property pointer
     * @type Pointer
     * @readOnly
     */
    this.pointers = new Pointers(game);

    /**
     * Holds the gamepad handler for gamepad events
     *
     * @property gamepad
     * @type Keyboard
     * @readOnly
     */
    this.gamepad = new Gamepad();
};

inherit(InputManager, Object, {
    /**
     * Called each frame to update state info for some input methods
     *
     * @method update
     * @private
     */
    update: function(dt) {
        this.pointers.update(dt);
        this.gamepad.update(dt);
    }
});

module.exports = InputManager;
