// Mandelbrot using SIMD
// Author: Peter Jensen, Intel Corporation

// global variables
var animate        = false;
var use_simd       = false;
var max_iterations = 100;

// logging operations
var logger = {
  msg: function (msg) {
    console.log (msg);
  }
}    

// Basic canvas operations
var canvas = function () {
  var _ctx;
  var _width;
  var _height;
  
  var _image_data;
  var _my_data;
  function init (canvas_id) {
    var $canvas = $(canvas_id);
    _ctx        = $canvas.get(0).getContext("2d");
    _width      = $canvas.width();
    _height     = $canvas.height();
    _image_data = _ctx.getImageData (0, 0, _width, _height);
    var newsize = _width * _height * 4;
    newsize = 1 << (32 - Math.clz32(newsize));
    _my_data = new ArrayBuffer(newsize);
    _image_data.data.set(Uint8ClampedArray(_my_data, 0, _width * _height * 4));

  }
  
  function clear () {
    for (var i = 0; i < _image_data.data.length; i = i + 4) {
      _image_data.data [i] = 0;
      _image_data.data [i+1] = 0;
      _image_data.data [i+2] = 0;
      _image_data.data [i+3] = 0;
    }
  }
  
  function update () {
      _image_data.data.set(Uint8ClampedArray(_my_data, 0, _width * _height * 4));
    _ctx.putImageData (_image_data, 0, 0);
  }
  
  function image_data() {
      return _my_data;
  }
  function setPixel (x, y, rgb) {
    var index = 4*(x + _width*y);
    _image_data.data[index]   = rgb[0];
    _image_data.data[index+1] = rgb[1];
    _image_data.data[index+2] = rgb[2];
    _image_data.data[index+3] = 255;
  }

  function colorMap(value) {
      if (value === max_iterations) {
          return [0, 0, 0];
      }
      var rgb = (value * 0xffff / max) * 0xff;
      var red = rgb & 0xff;
      var green = (rgb >> 8) & 0xff;
      var blue = (rgb >> 16) & 0xff;
      return [red, green, blue];
  }

  function mapColorAndSetPixel (x, y, value) {
    var rgb, r, g, b;
    var index = 4*(x + _width*y);
    if (value === max_iterations) {
      r = 0;
      g = 0;
      b = 0;
    }
    else {
      rgb = (value*0xffff/max_iterations)*0xff;
      r = rgb & 0xff;
      g = (rgb >> 8) & 0xff;
      b = (rgb >> 16) & 0xff;
    }
    _image_data.data[index]   = r;
    _image_data.data[index+1] = g;
    _image_data.data[index+2] = b;
    _image_data.data[index+3] = 255;
  }

  function getWidth () {
    return _width;
  }
  
  function getHeight () {
    return _height;
  }
  
  return {
    init:                init,
    clear:               clear,
    update:              update,
    setPixel:            setPixel,
    getWidth:            getWidth,
    getHeight:           getHeight,
    colorMap:            colorMap,
    mapColorAndSetPixel: mapColorAndSetPixel,
      image_data:        image_data
  }

}();
var module = function(glob, env, buffer) {
    "use asm";
    var toF = glob.Math.fround;
    var imul = glob.Math.imul;
    var floor = glob.Math.floor;
    var i4 = glob.SIMD.int32x4;
    var i4_add = i4.add;
    var i4_and = i4.and;
    var f4 = glob.SIMD.float32x4;
    var f4_add = f4.add;
    var f4_sub = f4.sub;
    var f4_mul = f4.mul;
    var f4_le = f4.lessThanOrEqual;
    var max_iterations = env.max_iterations | 0;
    var U8_BUFF = new glob.Uint8Array(buffer);
    var izero4 = i4(0,0,0,0);
    var fzero4 = f4(0.0,0.0,0.0,0.0);
    var printer = env.printer;
    function i4_splat(x) {
        x=x|0
        return i4(i4(x|0, x|0, x|0, x|0));
    };
    function f4_splat(f) {
        f = toF(f);
        return f4(f4(f, f, f, f));
    }

    function mandelx1 (c_re, c_im) {
        c_re = toF(c_re);
        c_im = toF(c_im);
        var z_re = toF(0.0);
        var z_im = toF(0.0);
        var i = 0;
        var z_re2 = toF(0.0);
        var z_im2 = toF(0.0);
        var new_re = toF(0.0);
        var new_im = toF(0.0);

        for (; (i|0) < (max_iterations|0); i = (i+1)|0) {
            z_re2 = toF(z_re*z_re);
            z_im2 = toF(z_im*z_im);
            if (toF(z_re2 + z_im2) > toF(4.0))
                break;

            new_re = toF(z_re2 - z_im2);
            new_im = toF(toF(2.0) * toF(z_re * z_im));
            z_re = toF(c_re + new_re);
            z_im = toF(c_im + new_im);
        }
        return i|0;
    }

    function mandelx4(c_re4, c_im4) {
        c_re4 = f4(c_re4);
        c_im4 = f4(c_im4);
        var z_re4 = f4(0,0,0,0);
        var z_im4  = f4(0,0,0,0);
      
        var four4  = f4(4.0, 4.0, 4.0, 4.0);
        var two4   = f4 (2.0, 2.0, 2.0, 2.0);
        var count4 = i4(0, 0, 0, 0);
        var one4   = i4(1, 1, 1, 1);
        var z_re24 = f4(0.0, 0.0, 0.0, 0.0);
        var z_im24 = f4(0.0, 0.0, 0.0, 0.0);
        var new_re4 = f4(0.0, 0.0, 0.0, 0.0);
        var new_im4 = f4(0.0, 0.0, 0.0, 0.0);
        var mi4 = i4(0, 0, 0, 0);
        var sum = 0;
        var i = 0;
        z_re4  = f4(c_re4);
        z_im4 = f4(c_im4);
        for (; (i|0) < (max_iterations|0); i=(i+1)|0) {
            z_re24 = f4_mul (z_re4, z_re4);
            z_im24 = f4_mul (z_im4, z_im4);
            
            mi4    = f4_le (f4_add (z_re24, z_im24), four4);
            // if all 4 values are greater than 4.0, there's no reason to continue
            //if (mi4.signMask == 0x00) {
            //printer(mi4.x|0);
            //printer(mi4.y|0);
            //printer(mi4.z|0);
            //printer(mi4.w|0);
            sum = ((mi4.x|0) + (mi4.y|0) + (mi4.z|0) + (mi4.w|0))|0;
            //printer(sum|0);
            //printer(123546);
            if ((sum|0) == 0) {
                //printer(4444)
                break;
            }
            //printer(77);
            new_re4 = f4_sub (z_re24, z_im24);
            new_im4 = f4_mul (f4_mul (two4, z_re4), z_im4);
            z_re4       = f4_add (c_re4, new_re4);
            z_im4       = f4_add (c_im4, new_im4);
            count4      = i4_add (count4, i4_and (mi4, one4));
            //printer(count4.x|0);
            //printer(count4.y|0);
            //printer(count4.z|0);
            //printer(count4.w|0);
        }
        return i4(count4);
    }
    function mapColorAndSetPixel (x, y, value, width) {
        x = x|0;
        y = y|0;
        value = value | 0;
        width = width | 0;
        var rgb = 0, r = 0, g = 0, b = 0;
        var index = 0;
        var row = 0;
        var pix = 0;
        var scaledValue = toF(0.0);
        var v2 = 0;
        var wtf = toF(0.);
        row = imul(width|0, y | 0) | 0;
        pix = ((x|0) + row|0)|0;
        index = imul(4,pix|0)|0;
        if ((value|0) == (max_iterations|0)) {
            r = 0;
            g = 0;
            b = 0;
        } else {
            v2 = imul(value|0,0xffff);
            scaledValue = toF(toF(+(v2|0)) / toF(+(max_iterations|0)));
            rgb = ~~toF(toF(+scaledValue) * toF(255.0));
            r = (rgb & 0xff)|0;
            g = ((rgb >> 8) & 0xff)|0;
            b = ((rgb >> 16) & 0xff)|0;
        }
        U8_BUFF[index]   = r|0;
        U8_BUFF[index+1|0] = g|0;
        U8_BUFF[index+2|0] = b|0;
        U8_BUFF[index+3|0] = 255;
    }

    function drawMandelbrot (width, height, scale, use_simd, xc, yc) {
        width        = width | 0;
        height       = height | 0;
        scale        = toF(scale);
        use_simd     = use_simd | 0;
        xc           = toF(xc);
        yc           = toF(yc);
        var x0 = toF(0.0);
        var y0 = toF(0.0);
        var xd = toF(0.0);
        var yd = toF(0.0);
        var xf = toF(0.0);
        var x = 0;
        var y = 0;
        var yf = toF(0.0);
        var ydx4 = toF(0.0);
        var xf4 = f4(0,0,0,0);
        var yf4 = f4(0,0,0,0);
        var m4 = i4(0,0,0,0);
        var m1 = 0;
        var steps = 0;
        x0 = toF(toF(xc) - toF(toF(1.5)*toF(scale)));
        y0 =  toF(toF(yc) - toF(scale));
        xd = toF(toF(toF(3.0)*toF(scale))/toF(width|0));
        yd =  toF(toF(toF(2.0)*toF(scale))/toF(height|0));
        xf = toF(x0);
        for (; (x|0) < (width|0); x = (x+1)|0) {
            yf = y0;
            if (use_simd) {
                ydx4 = toF(toF(4.0)*toF(yd));
                for (y = 0; (y|0) < (height|0); y = (y+4)|0) {
                    xf4 = f4(xf, xf, xf, xf);
                    yf4 = f4(yf,
                             toF(yf)+toF(yd),
                             toF(toF(yf)+toF(toF(yd)+toF(yd))),
                             toF(toF(yf)+toF(toF(yd)+toF(toF(yd)+toF(yd)))));
                    m4   = i4(mandelx4 (xf4, yf4));
                    mapColorAndSetPixel (x, y,   m4.x|0, width | 0);
                    mapColorAndSetPixel (x, y|0+1, m4.y|0, width | 0);
                    mapColorAndSetPixel (x, y|0+2, m4.z|0, width | 0);
                    mapColorAndSetPixel (x, y|0+3, m4.w|0, width | 0);
                    yf = toF(toF(yf) + toF(ydx4));
                    steps = ((steps|0) + (m4.x|0) + (m4.y|0) + (m4.z|0) + (m4.w|0))|0
                }
            }
            else {
                for (y = 0; (y|0) < (height|0); y =(y+1)|0) {
                    m1 = mandelx1 (toF(xf), toF(yf)) | 0;
                    mapColorAndSetPixel (x, y, m1, width | 0);
                    yf = toF(toF(yf) + toF(yd));
                    steps = ((steps|0) + (m1|0))|0;
                }
            }
            xf = toF(toF(xf) + toF(xd));
        }
        return steps | 0;
    }

   return {drawMandelbrot : drawMandelbrot};
};

var asmBuf;
var linkedCode
function drawMandelbrot (width, height, xc, yc, scale, use_simd) {
    if (!asmBuf) {
        asmBuf = canvas.image_data();
        linkedCode = module({Math: Math, SIMD : SIMD, Uint8Array : Uint8Array }, {max_iterations : max_iterations, printer : function(x){}}, asmBuf);
    }
    linkedCode.drawMandelbrot(width, height, scale, use_simd, xc, yc);
    canvas.update();
}

function animateMandelbrot () {
  var scale_start = 1.0;
  var scale_end   = 0.0005;
  var xc_start    = -0.5;
  var yc_start    = 0.0;
  var xc_end      = 0.0;
  var yc_end      = 0.75;
  var steps       = 200.0;
  var scale_step  = (scale_end - scale_start)/steps;
  var xc_step     = (xc_end - xc_start)/steps;
  var yc_step     = (yc_end - yc_start)/steps;
  var scale       = scale_start;
  var xc          = xc_start;
  var yc          = yc_start;
  var i           = 0;
  var now         = performance.now();

  function draw1 () {
    if (animate) {
      setTimeout (draw1, 1);
    }
    drawMandelbrot (canvas.getWidth(), canvas.getHeight(), xc, yc, scale, use_simd);
    if (scale < scale_end || scale > scale_start) {
      scale_step = -scale_step;
      xc_step = -xc_step;
      yc_step = -yc_step;
    }
    scale += scale_step;
    xc += xc_step;
    yc += yc_step;
    i++;
    if (((i % 10)|0) === 0) {
      var t = performance.now();
      update_fps (10000/(t - now));
      now = t;
    }
  }  

  draw1 ();
}

function update_fps (fps) {
  var $fps = $("#fps");
  $fps.text (fps.toFixed(1));
}

// input click handlers

function start() {
  animate = true;
  animateMandelbrot ();
}

function stop() {
  animate = false;
}

function simd() {
  logger.msg("use SIMD clicked");
  var $simd = $("#simd");
  var $info = $("#info");
  if (!use_simd) {
    use_simd = true;
    $simd.text("Don't use SIMD");
    $info.text("SIMD");
  }
  else {
    use_simd = false;
    $simd.text("Use SIMD");
    $info.text("No SIMD");
  }
}

function main () {
  logger.msg ("main()");
  canvas.init ("#mandel");
  canvas.clear ();
  canvas.update ();
  $("#start").click (start);
  $("#stop").click (stop);
  if (typeof SIMD === "undefined") {
    $("#simd").addClass("btn-disable");
  }
  else {
    $("#simd").click (simd);
  }
  animateMandelbrot ();
}

$(main);
