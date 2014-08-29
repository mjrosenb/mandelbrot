const TO_FLOAT32 = "var toF = glob.Math.fround;";

self.addEventListener ("message", computeFrame, false);

var max_iterations = 10
var prev_image_buffer;
var image_buffer;
var width;
var heigth;

function computeFrame (e) {
  if (typeof e.data.terminate !== "undefined") {
    self.close ();
    return;
  } 
  var message = e.data.message;
  max_iterations = message.max_iterations;
  image_buffer = e.data.buffer; //new Uint8ClampedArray (e.data.buffer);
  width        = message.width;
  height       = message.height;
  drawMandelbrot (message);
    //console.log("first");
  self.postMessage ({worker_index: e.data.worker_index, message: message, buffer: e.data.buffer}, [e.data.buffer]);
    //console.log("second");
  //self.postMessage ({worker_index: e.data.worker_index, buffer: e.data.buffer});
}
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
                    yf4 = f4(yf, toF(yf)+toF(yd), toF(toF(yf)+toF(toF(yd)+toF(yd))), toF(toF(yf)+toF(toF(yd)+toF(toF(yd)+toF(yd)))));
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
//var asmjs_drawMandelbrot = s.drawMandelbrot;
//print(asmjs_drawMandelbrot(128, 128, 1.0, 0, 0.0, 0.0));
var drawMandelbrot;
function drawMandelbrot (params) {
    if (prev_image_buffer != image_buffer) {
        var s = module({Math: Math, SIMD : SIMD, Uint8Array : Uint8Array },
                       {max_iterations : max_iterations, printer : function(x){}},
                       image_buffer);
        drawMandelbrot_ = s.drawMandelbrot;
        prev_image_buffer = image_buffer;
    }
    drawMandelbrot_(params.width, params.height, params.scale, params.use_simd, params.xc,params.yc);
}
