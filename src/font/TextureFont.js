gf.TextureFont = function(font, settings) {
    this.ext = '';

    this.size = new gf.Vector();

    this.map = {};

    gf.Font.call(this, font, settings);

    if(typeof font === 'string') {
        if(gf.assetCache[font])
            font = gf.assetCache[font];
        else
            throw 'Unknown texture ' + font + ', please load the sprite sheet first!';
    }

    this.textures = font;

    if(this.ext && this.ext.charAt(0) !== '.')
        this.ext = '.' + this.ext;

    this.sprites = [];
    this.dirty = false;
};

gf.inherits(gf.TextureFont, gf.Font, {
    _getSprite: function(ch) {
        if(this.map[ch])
            ch = this.map[ch];

        if(!this.textures[ch + this.ext])
            throw 'there is no texture for character "' + ch + '" with extension "' + this.ext + '"';

        var texture = this.textures[ch + this.ext],
            spr = this.sprites.pop();

        if(!spr) {
            spr = new PIXI.Sprite(texture);
            this.addChild(spr);
        }
        else
            spr.setTexture(texture);

        spr.visible = true;
        return spr;
    },
    _freeSprite: function(spr) {
        this.sprites.push(spr);
        spr.visible = false;
    },
    setText: function(txt) {
        this.text = txt;
        this.dirty = true;
    },
    update: function() {
        if(!this.dirty) return;

        //free all sprites
        for(var c = this.children.length - 1; c > -1; --c)
            this._freeSprite(this.children[c]);

        //add text sprites
        var strs = this.text.split('\n'),
            w = this.size.x * this.lineWidth,
            h = this.size.y * this.lineHeight,
            x = 0,
            y = 0;

        for(var i = 0, il = strs.length; i < il; ++i) {
            var str = strs[i];

            //create the string sprites
            for(var s = 0, sl = str.length; s < sl; ++s) {
                var ch = str.charAt(s),
                    spr = this._getSprite(ch);

                spr.position.x = x;
                spr.position.y = y;

                x += w;
            }

            y += h;
        }

        this.dirty = false;
    }
});