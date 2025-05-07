/********************************************/
/*  Module Configuration                    */
/********************************************/
var CFG = {
    BASE: { FRAMES: 1000, TIME: 60 },
    BOUNDS: { HRS: { UPPER: 24, LOWER: 0 } },
    OSC: { ADDRESS: "/TimecodeExpert" }
};




/********************************************/
/*  Helper Functions                        */
/********************************************/
function _carry(n, base) { return Math.floor(n / base); }
function _self(n, base) { return (n < 0 ? base : 0) + (n % base); }
function _anyToInt(val) {
    val = parseInt(val);
    return val === NaN ? 0 : val;
}
function _zeroPad(n, l) {
    n = "" + n;
    var str = "";
    for (var i = 0; i < (l - n.length); i++) { str += "0"; }
    str += n;
    return str;
}



/********************************************/
/*  Custom Domain Objects                   */
/********************************************/
function Client(generator) {
    this.generator = generator;

    this.sendTimecode = function(tc) {
        script.log("Sending \"SET\" to \"" + this.generator.name + "\" with value: " + tc.format());
        local.values.lastSentTime.set(tc.toFloat());
        local.send(CFG.OSC.ADDRESS, this.generator.name, tc.h, tc.m, tc.s, tc.f);
    };

    this.sendCmd = function(cmd) {
        script.log("Sending \"" + cmd + "\" to \"" + this.generator.name + "\".");
        local.send(CFG.OSC.ADDRESS, this.generator.name, cmd);
    };
}
Client.CMDS = { PLAY: 'play', PAUSE: 'pause', STOP: 'stop', WALL: 'clock' };



function Generator(name) {
    this.name = "" + name;
    this.client = new Client(this);

    this.play = function() { this.client.sendCmd(Client.CMDS.PLAY); };
    this.pause = function() { this.client.sendCmd(Client.CMDS.PAUSE); };
    this.stop = function() { this.client.sendCmd(Client.CMDS.STOP); };
    this.toggleWallClock = function() { this.client.sendCmd(Client.CMDS.WALL); };
    this.set = function(tc) { this.client.sendTimecode(tc); };
}



// We refer to the fourth digit as "Frames" ("f") in this Module, but
// note that TCE actually treats this value as milliseconds on the
// Generator's side of things, so our math will reflect that herein.
function Timecode(h, m, s, f) {
    this.h = _anyToInt(h);
    this.m = _anyToInt(m);
    this.s = _anyToInt(s);
    this.f = _anyToInt(f);

    /**
     * Adds values to each element of the timecode
     *
     * This method also supports negative values for any input
     */
    this.add = function(tc) {
        var nextH = this.h + _anyToInt(tc.h);
        var nextM = this.m + _anyToInt(tc.m);
        var nextS = this.s + _anyToInt(tc.s);
        var nextF = this.f + _anyToInt(tc.f);

        nextS = nextS + _carry(nextF, CFG.BASE.FRAMES);
        nextF = _self(nextF, CFG.BASE.FRAMES);

        nextM = nextM + _carry(nextS, CFG.BASE.TIME);
        nextS = _self(nextS, CFG.BASE.TIME);

        nextH = nextH + _carry(nextM, CFG.BASE.TIME);
        nextM = _self(nextM, CFG.BASE.TIME);

        if (nextH >= CFG.BOUNDS.HRS.UPPER) return new Timecode(CFG.BOUNDS.HRS.UPPER-1, CFG.BASE.TIME-1, CFG.BASE.TIME-1, CFG.BASE.FRAMES-1);
        if (nextH < CFG.BOUNDS.HRS.LOWER) return Timecode.ZERO;

        return new Timecode(nextH, nextM, nextS, nextF);
    };

    this.normalize = function() {
        return this.add(Timecode.ZERO);
    };

    this.format = function() {
        var proper = this.normalize();

        return [
            _zeroPad(proper.h, 2),
            _zeroPad(proper.m, 2),
            _zeroPad(proper.s, 2)
        ]
        .join(":")
        + "." + _zeroPad(proper.f, 3);
    };

    this.toFloat = function() {
        var sum = 0;
        sum += parseFloat(this.h) * 60 * 60;
        sum += parseFloat(this.m) * 60;
        sum += parseFloat(this.s);
        sum += parseFloat(this.f) / 1000;
        return sum;
    };
}
Timecode.ZERO = new Timecode(0, 0, 0, 0);

Timecode.fromFloat = function(fl) {
    var intPart = parseInt(fl);
    return new Timecode(0, 0, intPart, Math.round((fl - intPart) * 1000));
};


/********************************************/
/*  Script Globals                          */
/********************************************/
var generator = new Generator("Generator 1");


/********************************************/
/*  Module API Functions                    */
/********************************************/
function init() {
    script.log("TXL20 Timecode Expert 2 - Chataigne Module by Jim DeLois");
    generator.name = local.parameters.generatorName.get().trim();
}

function moduleParameterChanged(param) {
    if (param.name === "generatorName") {
        generator.name = local.parameters.generatorName.get().trim();
    }
}

function moduleValueChanged(value) {}


/********************************************/
/*  Module Custom Command Callbacks         */
/********************************************/
function commandPlay() { generator.play(); }

function commandPause() { generator.pause(); }

function commandStop() { generator.stop(); }

function commandWall() { generator.toggleWallClock(); }

function commandSet(inputType, time, h, m, s, f) {
    var tc = (inputType === "time") ? Timecode.fromFloat(time) : new Timecode(h, m, s, f);
    generator.set(tc.normalize());
}

function commandSetRelative(referenceTime, inputType, time, h, m, s, f, calculatedTime) {
    // TODO: Can we dynamically update "calculatedTime" ??
    var refTime = Timecode.fromFloat(referenceTime);
    var tc = (inputType === "time") ? Timecode.fromFloat(time) : new Timecode(h, m, s, f);

    generator.set(tc.add(refTime));
}

function setupCallbackSetRelative(commandContainer) {}

