/* QR code generator, byte mode.
 *
 * Written from the ISO/IEC 18004 specification rather than ported, and checked
 * module-for-module against the segno reference encoder over a battery of
 * inputs (see qr-verify.js). The reference tables in qr-tables.js are generated
 * from segno so the capacity/alignment/format constants cannot drift.
 *
 * Exposed as QR.generate(text, opts) -> { size, modules, version, mask }
 * and QR.svg(text, opts) -> an SVG string.
 */
(function (global) {
  "use strict";

  var Tables = typeof module !== "undefined" && module.exports
    ? require("./qr-tables.js")
    : global.QRTables;

  /* ---- GF(256) arithmetic, primitive polynomial 0x11D ---------------- */

  var GF_EXP = new Array(512);
  var GF_LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  /* Generator polynomial for `ecLen` error-correction codewords. */
  function rsGenerator(ecLen) {
    var poly = [1];
    for (var i = 0; i < ecLen; i++) {
      var next = new Array(poly.length + 1);
      for (var k = 0; k < next.length; k++) next[k] = 0;
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  /* Remainder of data(x) * x^ecLen divided by the generator: the EC codewords. */
  function rsEncode(data, ecLen) {
    var gen = rsGenerator(ecLen);
    var rem = data.slice();
    for (var i = 0; i < ecLen; i++) rem.push(0);
    for (var p = 0; p < data.length; p++) {
      var factor = rem[p];
      if (factor === 0) continue;
      for (var j = 0; j < gen.length; j++) {
        rem[p + j] ^= gfMul(gen[j], factor);
      }
    }
    return rem.slice(data.length);
  }

  /* ---- Bit buffer ---------------------------------------------------- */

  function BitBuffer() {
    this.bits = [];
  }
  BitBuffer.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };
  BitBuffer.prototype.toBytes = function () {
    var out = [];
    for (var i = 0; i < this.bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) {
        byte = (byte << 1) | (this.bits[i + j] || 0);
      }
      out.push(byte);
    }
    return out;
  };

  /* ---- Version selection and codeword assembly ------------------------ */

  function charCountBits(version) {
    return version <= 9 ? 8 : 16;
  }

  function dataCodewords(version, level) {
    var groups = Tables.EC[version][level];
    var total = 0;
    for (var i = 0; i < groups.length; i++) total += groups[i][0] * groups[i][2];
    return total;
  }

  function pickVersion(byteLen, level) {
    for (var v = 1; v <= 40; v++) {
      var needed = 4 + charCountBits(v) + byteLen * 8;
      if (needed <= dataCodewords(v, level) * 8) return v;
    }
    return -1;
  }

  /* Byte mode codewords, padded with the alternating 0xEC/0x11 pad bytes. */
  function buildCodewords(bytes, version, level) {
    var capacityBits = dataCodewords(version, level) * 8;
    var buf = new BitBuffer();
    buf.put(0x4, 4); /* byte mode */
    buf.put(bytes.length, charCountBits(version));
    for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);

    /* Terminator: up to four zero bits, fewer if the buffer is already full. */
    buf.put(0, Math.min(4, capacityBits - buf.bits.length));
    /* Pad to a byte boundary. */
    while (buf.bits.length % 8 !== 0) buf.bits.push(0);

    var codewords = buf.toBytes();
    for (var pad = 0; codewords.length < capacityBits / 8; pad++) {
      codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    }
    return codewords;
  }

  /* Split data into blocks, append each block's EC codewords, then interleave
     data and EC separately as the spec requires. */
  function interleave(codewords, version, level) {
    var groups = Tables.EC[version][level];
    var blocks = [];
    var offset = 0;
    for (var g = 0; g < groups.length; g++) {
      var count = groups[g][0], total = groups[g][1], data = groups[g][2];
      for (var b = 0; b < count; b++) {
        var slice = codewords.slice(offset, offset + data);
        offset += data;
        blocks.push({ data: slice, ec: rsEncode(slice, total - data) });
      }
    }

    var out = [];
    var maxData = 0;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].data.length > maxData) maxData = blocks[i].data.length;
    }
    for (var c = 0; c < maxData; c++) {
      for (var k = 0; k < blocks.length; k++) {
        if (c < blocks[k].data.length) out.push(blocks[k].data[c]);
      }
    }
    var ecLen = blocks[0].ec.length;
    for (var e = 0; e < ecLen; e++) {
      for (var m = 0; m < blocks.length; m++) out.push(blocks[m].ec[e]);
    }
    return out;
  }

  /* ---- Matrix construction ------------------------------------------- */

  function makeGrid(size, fill) {
    var grid = [];
    for (var y = 0; y < size; y++) {
      var row = [];
      for (var x = 0; x < size; x++) row.push(fill);
      grid.push(row);
    }
    return grid;
  }

  /* Place a function module and mark it reserved so data never overwrites it. */
  function setFn(state, x, y, dark) {
    if (x < 0 || y < 0 || x >= state.size || y >= state.size) return;
    state.modules[y][x] = dark;
    state.fn[y][x] = true;
  }

  function drawFinder(state, cx, cy) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= state.size || y >= state.size) continue;
        setFn(state, x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  function drawAlignment(state, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        setFn(state, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function drawFunctionPatterns(state, version) {
    var size = state.size;
    /* Finder patterns with their separators: the loop above leaves the
       separator light because dist 4 is outside the 7x7 finder. */
    drawFinder(state, 3, 3);
    drawFinder(state, size - 4, 3);
    drawFinder(state, 3, size - 4);

    /* Timing patterns. */
    for (var i = 8; i < size - 8; i++) {
      var dark = i % 2 === 0;
      setFn(state, i, 6, dark);
      setFn(state, 6, i, dark);
    }

    /* Alignment patterns, skipping the three that would collide with finders. */
    var pos = Tables.ALIGN[version];
    for (var a = 0; a < pos.length; a++) {
      for (var b = 0; b < pos.length; b++) {
        var isCorner =
          (a === 0 && b === 0) ||
          (a === 0 && b === pos.length - 1) ||
          (a === pos.length - 1 && b === 0);
        if (isCorner) continue;
        drawAlignment(state, pos[b], pos[a]);
      }
    }

    /* Reserve the format information areas before data placement. */
    for (var k = 0; k <= 8; k++) {
      if (k !== 6) {
        setFn(state, 8, k, false);
        setFn(state, k, 8, false);
      }
    }
    for (var m = 0; m < 8; m++) {
      setFn(state, size - 1 - m, 8, false);
      setFn(state, 8, size - 1 - m, false);
    }
    setFn(state, 8, size - 8, true); /* the always-dark module */

    /* Version information areas for version 7 and up. */
    if (version >= 7) {
      for (var v = 0; v < 18; v++) {
        var aa = size - 11 + (v % 3);
        var bb = Math.floor(v / 3);
        setFn(state, aa, bb, false);
        setFn(state, bb, aa, false);
      }
    }
  }

  /* Zigzag placement of the interleaved codewords, most significant bit first. */
  function placeData(state, codewords) {
    var size = state.size;
    var bitIndex = 0;
    var totalBits = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (state.fn[y][x]) continue;
          if (bitIndex < totalBits) {
            var byte = codewords[bitIndex >>> 3];
            state.modules[y][x] = ((byte >>> (7 - (bitIndex & 7))) & 1) === 1;
          }
          bitIndex++;
        }
      }
    }
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return ((x * y) % 2) + ((x * y) % 3) === 0; },
    function (x, y) { return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; },
    function (x, y) { return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; }
  ];

  function applyMask(state, maskId) {
    var fn = MASKS[maskId];
    for (var y = 0; y < state.size; y++) {
      for (var x = 0; x < state.size; x++) {
        if (!state.fn[y][x] && fn(x, y)) state.modules[y][x] = !state.modules[y][x];
      }
    }
  }

  function formatBits(level, mask) {
    return Tables.FORMAT_INFO[(Tables.LEVEL_BITS[level] << 3) | mask];
  }

  function drawFormat(state, level, mask) {
    var bits = formatBits(level, mask);
    var size = state.size;
    var bit = function (i) { return ((bits >>> i) & 1) === 1; };

    for (var i = 0; i <= 5; i++) setFn(state, 8, i, bit(i));
    setFn(state, 8, 7, bit(6));
    setFn(state, 8, 8, bit(7));
    setFn(state, 7, 8, bit(8));
    for (var a = 9; a < 15; a++) setFn(state, 14 - a, 8, bit(a));

    for (var b = 0; b < 8; b++) setFn(state, size - 1 - b, 8, bit(b));
    for (var c = 8; c < 15; c++) setFn(state, 8, size - 15 + c, bit(c));
    setFn(state, 8, size - 8, true);
  }

  function drawVersion(state, version) {
    if (version < 7) return;
    var bits = Tables.VERSION_INFO[version - 7];
    var size = state.size;
    for (var i = 0; i < 18; i++) {
      var dark = ((bits >>> i) & 1) === 1;
      var a = size - 11 + (i % 3);
      var b = Math.floor(i / 3);
      setFn(state, a, b, dark);
      setFn(state, b, a, dark);
    }
  }

  /* ---- Mask penalty scoring (ISO/IEC 18004, 8.8.2) -------------------- */

  function penalty(state) {
    var size = state.size;
    var modules = state.modules;
    var score = 0;

    /* Rule 1: runs of five or more same-coloured modules. */
    for (var dir = 0; dir < 2; dir++) {
      for (var a = 0; a < size; a++) {
        var run = 1;
        for (var b = 1; b < size; b++) {
          var prev = dir === 0 ? modules[a][b - 1] : modules[b - 1][a];
          var cur = dir === 0 ? modules[a][b] : modules[b][a];
          if (cur === prev) {
            run++;
          } else {
            if (run >= 5) score += 3 + (run - 5);
            run = 1;
          }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
    }

    /* Rule 2: 2x2 blocks of one colour. */
    for (var y = 0; y < size - 1; y++) {
      for (var x = 0; x < size - 1; x++) {
        var c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          score += 3;
        }
      }
    }

    /* Rule 3: finder-like 1011101 patterns with a four-module light margin. */
    var patternA = [true, false, true, true, true, false, true, false, false, false, false];
    var patternB = [false, false, false, false, true, false, true, true, true, false, true];
    function matches(get, start, pattern) {
      for (var i = 0; i < pattern.length; i++) {
        if (get(start + i) !== pattern[i]) return false;
      }
      return true;
    }
    for (var r = 0; r < size; r++) {
      (function (row) {
        var getH = function (i) { return modules[row][i]; };
        var getV = function (i) { return modules[i][row]; };
        for (var s = 0; s + 11 <= size; s++) {
          if (matches(getH, s, patternA)) score += 40;
          if (matches(getH, s, patternB)) score += 40;
          if (matches(getV, s, patternA)) score += 40;
          if (matches(getV, s, patternB)) score += 40;
        }
      })(r);
    }

    /* Rule 4: deviation of the dark-module proportion from 50%. */
    var dark = 0;
    for (var yy = 0; yy < size; yy++) {
      for (var xx = 0; xx < size; xx++) if (modules[yy][xx]) dark++;
    }
    var total = size * size;
    var k = Math.abs(dark * 20 - total * 10) / total;
    score += Math.floor(k) * 10;

    return score;
  }

  /* ---- Public API ----------------------------------------------------- */

  function toUtf8Bytes(text) {
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        /* Surrogate pair. */
        i++;
        var cp = 0x10000 + (((code & 0x3ff) << 10) | (text.charCodeAt(i) & 0x3ff));
        out.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
      }
    }
    return out;
  }

  function generate(text, options) {
    var opts = options || {};
    var level = opts.ec || "M";
    if (!Tables.EC[1][level]) throw new Error("Unknown EC level: " + level);

    var bytes = toUtf8Bytes(String(text));
    var version = opts.version || pickVersion(bytes.length, level);
    if (version < 1 || version > 40) throw new Error("Data too long for a QR code");

    var codewords = interleave(buildCodewords(bytes, version, level), version, level);

    var size = version * 4 + 17;
    var state = {
      size: size,
      modules: makeGrid(size, false),
      fn: makeGrid(size, false)
    };
    drawFunctionPatterns(state, version);
    placeData(state, codewords);

    /* Try every mask unless one is pinned, keeping the lowest penalty. */
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      if (opts.mask !== undefined && opts.mask !== null && opts.mask !== mask) continue;
      var candidate = {
        size: size,
        modules: state.modules.map(function (row) { return row.slice(); }),
        fn: state.fn.map(function (row) { return row.slice(); })
      };
      applyMask(candidate, mask);
      drawFormat(candidate, level, mask);
      drawVersion(candidate, version);
      var score = penalty(candidate);
      if (best === null || score < best.score) {
        best = { score: score, mask: mask, modules: candidate.modules };
      }
      if (opts.mask !== undefined && opts.mask !== null) break;
    }

    return { size: size, modules: best.modules, version: version, mask: best.mask };
  }

  /* SVG with a quiet zone, so it scans from a screen as well as in print. */
  function svg(text, options) {
    var opts = options || {};
    var quiet = opts.quiet === undefined ? 4 : opts.quiet;
    var scale = opts.scale || 4;
    var result = generate(text, opts);
    var dim = result.size + quiet * 2;
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + dim + '"');
    parts.push(' width="' + dim * scale + '" height="' + dim * scale + '" shape-rendering="crispEdges">');
    parts.push('<rect width="' + dim + '" height="' + dim + '" fill="#ffffff"/>');
    parts.push('<path fill="#000000" d="');
    for (var y = 0; y < result.size; y++) {
      for (var x = 0; x < result.size; x++) {
        if (result.modules[y][x]) {
          parts.push("M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z");
        }
      }
    }
    parts.push('"/></svg>');
    return parts.join("");
  }

  var api = { generate: generate, svg: svg };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.QR = api;
  }
})(typeof window !== "undefined" ? window : this);
