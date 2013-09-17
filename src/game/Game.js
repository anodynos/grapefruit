var StateManager = require('./StateManager'),
    EventEmitter = require('../utils/EventEmitter'),
    Cache = require('../utils/Cache'),
    Clock = require('../utils/Clock'),
    SpritePool = require('../utils/SpritePool'),
    Gui = require('../gui/Gui'),
    Loader = require('../loader/Loader'),
    InputManager = require('../input/InputManager'),
    AudioManager = require('../audio/AudioManager'),
    PhysicsSystem = require('../physics/PhysicsSystem'),
    support = require('../utils/support'),
    utils = require('../utils/utils'),
    PIXI = require('../vendor/pixi'),
    C = require('../constants');

/**
 * Main game object, controls the entire instance of the game
 *
 * @class Game
 * @extends Object
 * @uses EventEmitter
 * @constructor
 * @param contId {String} The container for the new canvas we will create for the game
 * @param settings {Object} All the settings for the game instance
 * @param settings.width {Number} The width of the viewport
 * @param settings.height {Number} The height of the viewport
 * @param [settings.renderer=RENDERER.AUTO] {String} The renderer to use either RENDERER.AUTO, RENDERER.CANVAS, or RENDERER.WEBGL
 * @param [settings.transparent=false] {Boolean} Should the render element have a transparent background
 * @param [settings.background='#FFF'] {Number} The background color of the stage
 * @param [settings.antialias=true] {Boolean} Anti-alias graphics (in WebGL this helps with edges, in Canvas2D it retains pixel-art quality)
 * @param [settings.canvas] {DOMElement} The canvas to render into, if not specified one is created
 * @param [settings.interactive] {Boolean} Whether the game will use mouse events or not
 */
var Game = module.exports = function(container, settings) {
    EventEmitter.call(this);

    //setup settings defaults
    settings = settings || {};
    settings.width = settings.width || 800;
    settings.height = settings.height || 600;
    settings.renderer = settings.renderer || C.RENDERER.AUTO;
    settings.transparent = settings.transparent || false;
    settings.background = settings.background || '#FFF';
    settings.antialias = settings.antialias !== undefined ? settings.antialias : true;
    settings.canvas = settings.canvas || null; //passing null to renderer, lets the renderer make one

    /**
     * The domElement that we are putting our rendering canvas into (the container)
     *
     * @property container
     * @type DOMELement
     * @readOnly
     */
    this.container = typeof container === 'string' ? document.getElementById(container) : container;

    if(!this.container)
        this.container = document.body;

    /**
     * The width of the render viewport
     *
     * @property width
     * @type Number
     * @default 800
     */
    this.width = settings.width;

    /**
     * The height of the render viewport
     *
     * @property height
     * @type Number
     * @default 600
     */
    this.height = settings.height;

    /**
     * The method used to render values to the screen (either webgl, or canvas)
     *
     * @property renderMethod
     * @type String
     * @default RENDERER.AUTO
     */
    this.renderMethod = settings.renderer;

    /**
     * Whether the canvas has a transparent background or not
     *
     * @property transparent
     * @type Boolean
     * @default false
     */
    this.transparent = settings.transparent;

    /**
     * The background of the stage
     *
     * @property background
     * @type Boolean
     * @default false
     */
    this.background = settings.background;

    /**
     * Anti-alias graphics (in WebGL this helps with edges, in Canvas2D it retains pixel-art quality)
     *
     * @property antialias
     * @type Boolean
     * @default true
     */
    this.antialias = settings.antialias;

    /**
     * The canvas to render into
     *
     * @property canvas
     * @type HTMLCanvasElement
     */
    this.canvas = settings.canvas;

    /**
     * Raw rendering engine, the underlying PIXI renderer that draws for us
     *
     * @property renderer
     * @type PIXI.WebGLRenderer|PIXI.CanvasRenderer
     * @readOnly
     */
    this.renderer = this._createRenderer();

    /**
     * Raw PIXI.stage instance, the root of all things in the scene graph
     *
     * @property stage
     * @type PIXI.Stage
     * @readOnly
     */
    this.stage = new PIXI.Stage(this.background, this.interactive);

    /**
     * Clock instance for internal timing
     *
     * @property clock
     * @type Clock
     * @readOnly
     */
    this.clock = new Clock();

    /**
     * The audio manager for this game instance, used to play and control
     * all the audio in a game.
     *
     * @property audio
     * @type AudioManager
     * @readOnly
     */
    this.audio = new AudioManager(this);

    /**
     * The loader for this game instance, used to preload assets into the cache
     *
     * @property loader
     * @type Loader
     * @readOnly
     */
    this.load = new Loader(this);

    /**
     * Cache instance for storing/retrieving assets
     *
     * @property cache
     * @type Cache
     * @readOnly
     */
    this.cache = new Cache(this);

    /**
     * The input instance for this game
     *
     * @property input
     * @type InputManager
     * @readOnly
     */
    this.input = new InputManager(this);

    /**
     * The sprite pool to use to create registered entities
     *
     * @property spritepool
     * @type SpritePool
     * @readOnly
     */
    this.spritepool = new SpritePool(this);

    /**
     * The state manager, to switch between game states
     *
     * @property state
     * @type Array
     * @readOnly
     */
    this.state = new StateManager(this);

    /**
     * The physics system to simulate the world
     *
     * @property physics
     * @type PhysicsSystem
     * @readOnly
     */
    this.physics = new PhysicsSystem(this);

    //TODO:
    //
    //add (obj factory?)
    //world (doc for objs?)
    //camera (should a world own this?)
    //debug (moved in from gf-debug)
    //particles (TODO)
    //
    //implement state manager, remove state code from here
    //

    /**
     * Holds timing data for the previous loop
     *
     * @property timings
     * @type Object
     * @readOnly
     */
    this.timings = {};

    //pixi does some prevent default on mousedown, so we need to
    //make sure mousedown will focus the canvas or keyboard events break
    var view = this.canvas;
    if(!view.getAttribute('tabindex'))
        view.setAttribute('tabindex','1');

    view.focus();
    view.addEventListener('click', function() {
        view.focus();
    }, false);
};

utils.inherits(Game, Object, {
    _createRenderer: function() {
        var method = this.renderMethod,
            render = null;

        //no support
        if(!support.webgl && !support.canvas) {
            throw 'Neither WebGL nor Canvas is supported by this browser!';
        }
        else if((method === C.RENDERER.WEBGL || method === C.RENDERER.AUTO) && support.webgl) {
            method = C.RENDERER.WEBGL;
            render = new PIXI.WebGLRenderer(this.width, this.height, this.canvas, this.transparent, this.antialias);
        }
        else if((method === C.RENDERER.CANVAS || method === C.RENDERER.AUTO) && support.canvas) {
            method = C.RENDERER.CANVAS;
            render = new PIXI.CanvasRenderer(this.width, this.height, this.canvas, this.transparent);
            //TODO: setSmoothingEnabled based on this.antialias
        }
        else {
            throw 'Your render method ("' + method + '") is not supported by this browser!';
        }

        //append the renderer view only if the user didn't pass their own
        if(!this.canvas) {
            this.container.appendChild(render.view);
            this.canvas = render.view;
        }

        return render;
    },
    /**
     * Allows you to resize the game area
     *
     * @method resize
     * @param width {Number} Width to resize to
     * @param height {Number} Height to resize to
     * @return {Game} Returns itself for chainability
     */
    resize: function(w, h) {
        this.renderer.resize(w, h);
        this.width = w;
        this.height = h;

        for(var i = 0, il = this.stage.children.length; i < il; ++i) {
            var o = this.stage.children[i];

            if(o.resize)
                o.resize(w, h);
        }

        return this;
    },
    /**
     * Adds an object to the current stage
     *
     * @method addChild
     * @param obj {Sprite} The sprite to the stage
     * @return {Game} Returns itself for chainability
     */
    addChild: function(obj) {
        this.activeState.addChild(obj);

        return this;
    },
    /**
     * Removes a sprite from the stage
     *
     * @method removeChild
     * @param obj {Sprite} The sprite to the stage
     * @return {Game} Returns itself for chainability
     */
    removeChild: function(obj) {
        if(obj) {
            if(obj instanceof Gui)
                this.camera.removeChild(obj);
            else
                this.world.removeChild(obj);
        }

        return this;
    },
    requestFullscreen: function() {
        var elem = this.renderer.view;

        if(elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if(elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if(elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        }
    },
    /**
     * Adds a new game state to this game to be later enabled
     *
     * @method addState
     * @param state {GameState} The state to add to this game
     * @return {Game} Returns itself for chainability
     */
    addState: function(state) {
        var name = state.name;

        if(!name) {
            throw 'No state name could be determined, did you give the state a name when you created it?';
        } else if(this.states[name]) {
            throw 'A state with the name "' + name + '" already exists, did you try to add it twice?';
        } else {
            this.states[name] = state;
            this.stage.addChild(state);

            state.game = this;
        }

        return this;
    },
    /**
     * Removes a game state from the game
     *
     * @method removeState
     * @param state {GameState|String} The state to remove from the game, or the name of a state to remove
     * @return {Game} Returns itself for chainability
     */
    removeState: function(state) {
        var name = (typeof state === 'string') ? state : state.name;

        if(!name) {
            throw 'No state name could be determined, are you sure you passed me a game state?';
        } else if(!this.states[name]) {
            throw 'A state with the name "' + name + '" does not exist, are you sure you added it?';
        } else {
            //don't remove the default state
            if(name === '_default') return;

            //if this is the active state, revert to the default state
            if(name === this.activeState.name) {
                this.enableState('_default');
            }

            delete this.states[name];
        }

        return this;
    },
    /**
     * Enables a state that has been added to the game
     *
     * @method enableState
     * @param state {GameState|String} The state to enable, or the name of a state to enable
     * @return {Game} Returns itself for chainability
     */
    enableState: function(state) {
        var name = (typeof state === 'string') ? state : state.name;

        if(this.activeState)
            this.activeState.disable();

        this.activeState = this.states[name];

        this.activeState.enable();

        return this;
    },
    /**
     * Loads the world map into the game
     *
     * @method loadWorld
     * @param world {String|Map} The map to load as the current world
     * @return {Game} Returns itself for chainability
     */
    loadWorld: function(world) {
        this.activeState.loadWorld(world);

        return this;
    },
    /**
     * Begins the render loop
     *
     * @method render
     * @return {Game} Returns itself for chainability
     */
    render: function() {
        this.clock.start();
        this._tick();

        return this;
    },
    /**
     * The looping render tick
     *
     * @method _tick
     * @private
     */
    _tick: function() {
        //start render loop
        window.requestAnimFrame(this._tick.bind(this));

        var dt = this.clock.getDelta();

        //gather input from user
        this.timings.inputStart = this.clock.now();
        this.input.update(dt);
        this.timings.inputEnd = this.clock.now();

        //simulate physics and detect/resolve collisions
        this.game.timings.physicsStart = this.clock.now();
        this.physics.update(dt);
        this.game.timings.physicsEnd = this.clock.now();

        //update this game state
        this.timings.stateStart = this.clock.now();
        this.state.active.update(dt);
        this.timings.stateEnd = this.clock.now();

        //render scene
        this.timings.renderStart = this.clock.now();
        this.renderer.render(this.stage);
        this.timings.renderEnd = this.clock.now();
    }
});

/**
 * Alias for the active State's add namespace. Instead of using
 * `game.state.active.add.sprite`, you can use `game.add.sprite`
 *
 * @property add
 * @type Object
 * @readOnly
 */
Object.defineProperty(Game.prototype, 'add', {
    get: function() {
        return this.state.active.add;
    }
});

/**
 * Alias for the active State's camera object. Instead of using
 * `game.state.active.camera`, you can use `game.camera`
 *
 * @property camera
 * @type Camera
 * @readOnly
 */
Object.defineProperty(Game.prototype, 'camera', {
    get: function() {
        return this.state.active.camera;
    }
});

/**
 * Alias for the active State's world object. Instead of using
 * `game.state.active.world`, you can use `game.world`
 *
 * @property world
 * @type World
 * @readOnly
 */
Object.defineProperty(Game.prototype, 'world', {
    get: function() {
        return this.state.active.world;
    }
});