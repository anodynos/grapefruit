/**
 * The Graphics class contains a set of methods that you can use to create primitive shapes and lines. 
 * It is important to know that with the webGL renderer only simple polys can be filled at this stage
 * Complex polys will not be filled. Heres an example of a
 * [complex polygon](http://www.goodboydigital.com/wp-content/uploads/2013/06/complexPolygon.png).
 * see [PIXI.Graphics](http://www.goodboydigital.com/pixijs/docs/classes/Graphics.html)
 * for more information.
 *
 * @class Graphics
 * @extends [PIXI.DisplayObjectContainer](http://www.goodboydigital.com/pixijs/docs/classes/DisplayObjectContainer.html)
 * @constructor
 */
var Graphics = require('../vendor/pixi').Graphics;

module.exports = Graphics;
