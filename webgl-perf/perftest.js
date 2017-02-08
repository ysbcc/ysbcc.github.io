
var gl;
var canvas;
var shader;

var vertexBufferId, indexBufferId;
var colorTransformIndex;
var vertexDataIndex;

var keepTesting = false;

var sourceFilePaths = [ "bebop-512.mp4", "bebop-1024.mp4", "bebop-1440.mp4", "bebop-1920.mp4" ];

// ---------- called from html

function startTests() {
    if (! keepTesting) {
        keepTesting = true;

        logClear();
        logHeader();

        startTestOfNextTexture(0);
    }
}

function stopTests() {
    keepTesting = false;
}

function start() {
    canvas = initCanvas();
    gl = initGlContext();
    shader = createAndUseShaders();

    createGeometry();

    createStateSets();

    startTests();
}

// ---------- logging

var pixelTypeToString;
var pixelFormatToString;
var ccsToString;

function log(msg,style) {
    document.getElementById("log").value += msg + "\n";
}

function logClear() {
    document.getElementById("log").value = '';
}

function logWebgl() {
    log(gl.getParameter(gl.VERSION));
    log(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    log(gl.getParameter(gl.VENDOR));

    // try to get the renderer info extension
    var ext = gl.getExtension("WEBGL_debug_renderer_info");
    // if the extension exists, find out the info.
    if (ext) {
      log(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
      log(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    }
}

function logHeader() {

    // browser, os details
    log(navigator.appVersion);
    log(navigator.userAgent);

    logWebgl();
    log("\n");

    // results table header
    var first = stateSets[0];
    var header = "";
    header += "mts ";
    header += "time ";
    header += "dim ";

    header += "pixelFormat ";
    header += "pixelType ";
    header += "premultiply ";
    header += "flipY ";
    header += "ccs ";
    header += "subImage";

    log(header);
}

function logResults(mts, time, dim, state) {

    if (! pixelTypeToString) {
        log("string ver: " + toString(gl.UNSIGNED_BYTE));

        pixelTypeToString = new Object;
        pixelTypeToString[gl.UNSIGNED_BYTE] = "UNSIGNED_BYTE";
        pixelTypeToString[gl.UNSIGNED_SHORT_5_6_5] = "UNSIGNED_SHORT_5_6_5";
        pixelTypeToString[gl.UNSIGNED_SHORT_4_4_4_4] = "UNSIGNED_SHORT_4_4_4_4";
        pixelTypeToString[gl.UNSIGNED_SHORT_5_5_5_1] = "UNSIGNED_SHORT_5_5_5_1";

        pixelFormatToString = new Object;
        pixelFormatToString[gl.RGB] = "RGB";
        pixelFormatToString[gl.RGBA] = "RGBA";

        ccsToString = new Object;
        ccsToString[gl.NONE] = "NONE";
        ccsToString[gl.BROWSER_DEFAULT_WEBGL] = "BROWSER_DEFAULT_WEBGL";
    }

    var entry = "";

    entry += mts.toFixed(1) + " ";
    entry += time.toFixed(2) + " ";
    entry += dim[0]+"x"+dim[1] + " ";

    entry += pixelFormatToString[state.pixelFormat] + " ";
    entry += pixelTypeToString[state.pixelType] + " ";
    entry += state.premultiply + " ";
    entry += state.flipY + " ";
    entry += ccsToString[state.convertColorSpace] + " ";
    entry += state.useSubImage + " ";

    log(entry);
}

// ---------- init

function initCanvas() {
    var canvas = document.getElementById("canvas");

    var pixelRatio = window.devicePixelRatio || 1;
    var canvas_width = canvas.width|0;
    var canvas_height = canvas.height|0;
    canvas.width = (canvas_width * pixelRatio)|0;
    canvas.height = (canvas_height * pixelRatio)|0;
    canvas.style.width = canvas_width + "px"
    canvas.style.height = canvas_height + "px";

    return canvas;
}

function initGlContext() {
    var gl = null;
    var glContextAttributes = { antialias:false };		// iOS10 bug!
    var contextNames = ["webgl","experimental-webgl","moz-webgl","webkit-3d"];
    for (var i=0; i<4; i++)
    {
        gl = canvas.getContext(contextNames[i], glContextAttributes)
        if (gl)
            break;
    }

    if (!gl)
        log("No WebGL support!", "color:red;");

    return gl;
}

function createAndUseShaders() {
    var vs = gl.createShader(gl.VERTEX_SHADER);

    gl.shaderSource(vs, " \
    attribute vec2 vx; \
    varying vec2 tx; \
    void main() { \
      gl_Position = vec4(vx.x*2.0-1.0, 1.0-vx.y*2.0, 0, 1); \
      tx=vx; \
    }");

    gl.compileShader(vs);

    var ps = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(ps, " \
    precision mediump float; \
    uniform sampler2D sm; \
    uniform float m[9]; \
    varying vec2 tx; \
    void main() {; \
      vec4 c = texture2D(sm,tx); \
      vec4 r; \
      r.r = m[0]*c.r + m[1]*c.g + m[2]*c.b; \
      r.g = m[3]*c.r + m[4]*c.g + m[5]*c.b; \
      r.b = m[6]*c.r + m[7]*c.g + m[8]*c.b; \
      r.a = 1.0; \
      gl_FragColor = r; \
    }");

    gl.compileShader(ps);

    var shader  = gl.createProgram();
    gl.attachShader(shader, vs);
    gl.attachShader(shader, ps);
    gl.linkProgram(shader);
    gl.useProgram(shader);

    // set fragment shader color transform
    colorTransformIndex = gl.getUniformLocation(shader, "m");
    gl.uniform1fv(colorTransformIndex, new Float32Array([1,0,0, 0,1,0, 0,0,1]));

    // set vertex shader uniforms
    vertexDataIndex = gl.getAttribLocation(shader, "vx");
    gl.enableVertexAttribArray(vertexDataIndex);
    gl.uniform1i(gl.getUniformLocation(shader, "sm"), 0);

    return shader
}

function createGeometry() {
    // create vertex buffer with 2d vertices of a square
    vertexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 1,1, 0,1]), gl.STATIC_DRAW);

    // create buffer with indices of square vertices
    indexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
}

// ---------- drawing

function drawGeometry() {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.vertexAttribPointer(vertexDataIndex, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

// ---------- tests

function isVideoSource(filePath) {
    return filePath.endsWith(".mp4");
}

function startTestOfNextTexture(nextIndex) {
    if (nextIndex < sourceFilePaths.length) {
        var filePath = "media/" + sourceFilePaths[nextIndex];

        var textureSource;

        // load video texture
        if (isVideoSource(filePath)) {
            // create a video element and start the load
            textureSource = document.createElement("video");
            textureSource.autoplay = true;
            textureSource.loop = false;

            textureSource.onerror = function() {
                var err = "unknown error";

                switch(textureSource.error.code) {
                case 1: err = "video loading aborted"; break;
                case 2: err = "network loading error"; break;
                case 3: err = "video decoding failed / corrupted data or unsupported codec"; break;
                case 4: err = "video not supported"; break;
                }

                log("Error: " + err + " (errorcode="+textureSource.error.code+")", "color:red;");
            };

            textureSource.oncanplay = function videoLoaded() {
                textureSource.width = textureSource.videoWidth;
                textureSource.height = textureSource.videoHeight;
                startStateTests(textureSource, filePath, function() {
                    textureSource.pause();
                    startTestOfNextTexture(nextIndex + 1);
                });
            };

            // try to disable the iPhone video fullscreen mode:
            textureSource.setAttribute("playsinline", "");
            textureSource.setAttribute("webkit-playsinline", "");
        }
        // load image texture
        else {
            // create an image element and start the load
            textureSource = new Image();
            textureSource.onload = function() {
                startStateTests(textureSource, filePath, function() { startTestOfNextTexture(nextIndex + 1); });
            }
        }

        textureSource.src = filePath;
    }
    else {
        keepTesting = false;
    }
}

var stateSets = [];
var nextStateSet = 0;

function createStateSets() {
    // create the state sets we want to use with this image

    // var pixelFormats =  [ gl.RGB, gl.RGBA, gl.ALPHA, gl.LUMINANCE, gl.LUMINANCE_ALPHA ];
    var pixelTypesRgb = [ gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_5_6_5 ]
    var pixelTypesRgba = [ gl.UNSIGNED_BYTE, gl.UNSIGNED_SHORT_4_4_4_4, gl.UNSIGNED_SHORT_5_5_5_1 ]
    var pixelFormatAndTypes = [
                [gl.RGB, pixelTypesRgb],
                [gl.RGBA, pixelTypesRgba]
            ];

    stateSets = [];
    for (var premultiply = 0; premultiply < 2; premultiply++) {
        for (var pf = 0; pf < pixelFormatAndTypes.length; pf++) {
            var format = pixelFormatAndTypes[pf][0];

            var types = pixelFormatAndTypes[pf][1];
            for (var pt = 0; pt < types.length; pt++) {
                var type = types[pt];

                for (var useSubImage = 0; useSubImage < 2; useSubImage++) {
                    for (var flipY = 0; flipY < 2; flipY++) {

                        var csConversions = [ gl.NONE, gl.BROWSER_DEFAULT_WEBGL ];
                        for (var cscIndex = 0; cscIndex < csConversions.length; cscIndex++) {

                            var set = {
                                premultiply: Boolean(premultiply),
                                pixelFormat: format,
                                pixelType: type,
                                useSubImage: Boolean(useSubImage),
                                flipY: Boolean(flipY),
                                convertColorSpace: csConversions[cscIndex]
                            };

                            stateSets.push(set);
                        }
                    }
                }
            }
        }
    }
}

function startStateTests(textureImage, imageFilePath, finishedCb) {
    nextStateSet = 0;
    window.setTimeout(function testState() {
        var s = stateSets[nextStateSet];
        s.id = nextStateSet;
        s.imageFilePath = imageFilePath;

        testTextureUpload(textureImage, s);

        nextStateSet++;
        if (keepTesting && nextStateSet < stateSets.length)
            window.setTimeout(testState, 50);
        else
            finishedCb();

    }, 50);
}

function testTextureUpload(textureSource, state) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, state.premultiply);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, state.flipY);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, state.convertColorSpace);

    // create the texture object
    var texId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texId);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // bind it
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texId);

    var totalMs = 0;
    var numUploads = 0;
    var gotError = false;

    try {
        // upload the video frame
        gl.texImage2D(gl.TEXTURE_2D, 0, state.pixelFormat, state.pixelFormat, state.pixelType, textureSource);
        gl.finish();
    } catch(e) {
        gotError = true;
        log(e, "color:red;");
    }

    for (var i = 0; i < 20; ++i) {
        var beginMs = performance.now();

        // upload the video frame
        if (! state.useSubImage)
            gl.texImage2D(gl.TEXTURE_2D, 0, state.pixelFormat, state.pixelFormat, state.pixelType, textureSource);
        else
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0,0, state.pixelFormat, state.pixelType, textureSource);
        gl.finish();

        totalMs += performance.now() - beginMs;
        ++numUploads;
    }

    drawGeometry();

    // compute average upload ms
    var averageUploadMs = totalMs / 20.0;

    var numPixels = textureSource.width * textureSource.height;
    var averageTexelsPerSecond = numPixels * (1000.0 / averageUploadMs);
    var averageMts = averageTexelsPerSecond / 1000000;

    var dim = [textureSource.width, textureSource.height];
    logResults(averageMts, averageUploadMs, dim, state);
}

