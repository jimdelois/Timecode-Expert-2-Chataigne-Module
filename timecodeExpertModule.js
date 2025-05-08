/********************************************/
/*                                          */
/*     J U C E - C O M P A T I B L E        */
/*        " J A V A S C R I P T "           */
/*                                          */
/********************************************/


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
var _baseReducer = {
    carryPart: function(n, base) { return Math.floor(n / base); },
    selfPart: function(n, base) { return (n < 0 ? base : 0) + (n % base); }
};
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

/**
 * An interface to wrap OSC and Logging side-effects
 */
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


/**
 * Represents an instance of a Generator in Timecode Expert
 */
function Generator(name) {
    this.name = "" + name;
    this.client = new Client(this);

    this.play = function() { this.client.sendCmd(Client.CMDS.PLAY); };
    this.pause = function() { this.client.sendCmd(Client.CMDS.PAUSE); };
    this.stop = function() { this.client.sendCmd(Client.CMDS.STOP); };
    this.toggleWallClock = function() { this.client.sendCmd(Client.CMDS.WALL); };
    this.set = function(tc) { this.client.sendTimecode(tc); };
}



/**
 * Represents a Timecode object and encapsulates some basic operations
 *
 * NOTE: We refer to the fourth digit as "Frames" ("f") in this Module, but
 * TCE actually treats this value as milliseconds on the Generator's
 * side of things, so our math will reflect that herein.
 */
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

        nextS = nextS + _baseReducer.carryPart(nextF, CFG.BASE.FRAMES);
        nextF = _baseReducer.selfPart(nextF, CFG.BASE.FRAMES);

        nextM = nextM + _baseReducer.carryPart(nextS, CFG.BASE.TIME);
        nextS = _baseReducer.selfPart(nextS, CFG.BASE.TIME);

        nextH = nextH + _baseReducer.carryPart(nextM, CFG.BASE.TIME);
        nextM = _baseReducer.selfPart(nextM, CFG.BASE.TIME);

        if (nextH >= CFG.BOUNDS.HRS.UPPER) return new Timecode(CFG.BOUNDS.HRS.UPPER-1, CFG.BASE.TIME-1, CFG.BASE.TIME-1, CFG.BASE.FRAMES-1);
        if (nextH < CFG.BOUNDS.HRS.LOWER) return Timecode.ZERO;

        return new Timecode(nextH, nextM, nextS, nextF);
    };

    /**
     * Ensures that any "Relative" Timecode is converted into a proper one.
     *  E.g., "01:-01:-70.000" => "00:57:50.000"
     */
    this.normalize = function() {
        return this.add(Timecode.ZERO);
    };

    /**
     * Returns a string representation of this object
     */
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

    /**
     * Converts a Float (in seconds) into a Timecode object
     */
    this.toFloat = function() {
        var sum = 0;
        sum += parseFloat(this.h) * 60 * 60;
        sum += parseFloat(this.m) * 60;
        sum += parseFloat(this.s);
        sum += parseFloat(this.f) / 1000;
        return sum;
    };
}
/**
 * The constant for "00:00:00.000"
 */
Timecode.ZERO = new Timecode(0, 0, 0, 0);

/**
 * Converts a Float (in seconds) into a Timecode object
 */
Timecode.fromFloat = function(fl) {
    var intPart = parseInt(fl);
    return new Timecode(0, 0, intPart, Math.round((fl - intPart) * 1000));
};


/********************************************/
/*  Additional Script Globals               */
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

function commandSetRelative(referenceTime, inputType, time, h, m, s, f) {
    var tc = (inputType === "time") ? Timecode.fromFloat(time) : new Timecode(h, m, s, f);
    var refTime = Timecode.fromFloat(referenceTime);

    generator.set(tc.add(refTime));
}

function setupCallbackSetRelative(commandContainer) {} // Reserved for future use

