/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l)
{
    var r, g, b;

    if (s == 0)
	{
        r = g = b = l; // achromatic
    }
	else
	{
        var hue2rgb = function hue2rgb(p, q, t)
		{
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function componentToHex(c)
{
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b)
{
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function minArray(alpha, beta, start, nElem)
{
	var minVal = 999999.99;
	var i = 0;
	for (i = start; i < start + nElem; i++)
	{
		if (alpha[i] + beta[i] < minVal)
		{
			minVal = alpha[i] + beta[i]
		}
	}

	return minVal;
}

function maxArray(alpha, beta, start, nElem)
{
	var maxVal = -999999.99;
	var i = 0;
	for (i = start; i < start + nElem; i++)
	{
		if (alpha[i] + beta[i] > maxVal)
		{
			maxVal = alpha[i] + beta[i]
		}
	}

	return maxVal;
}

// config
var variableRadius = true;
var opacity        = false;
var bigLines       = false;

function generateSvgGraph(encoder, decoder, idSvg, ite)
{
	// compute offsets for selected iteration
	var K = encoder.K;
	var n_ff = encoder.ff;
	var n_states = encoder.states;

	// clean svg
	$(idSvg).empty();

	// select the right domain
	if (idSvg == "#svg-natural")
	{
		var encoderTransition = encoder.transitions.natural;
		var decoderGamma      = decoder.data[ite][0].gamma;
		var decoderAlpha      = decoder.data[ite][0].alpha;
		var decoderBeta       = decoder.data[ite][0].beta;
		var decoderTransition = decoder.data[ite][0].transitions;
	}
	else // "#svg-interleaved"
	{
		var encoderTransition = encoder.transitions.interleaved;
		var decoderGamma      = decoder.data[ite][1].gamma;
		var decoderAlpha      = decoder.data[ite][1].alpha;
		var decoderBeta       = decoder.data[ite][1].beta;
		var decoderTransition = decoder.data[ite][1].transitions;
	}

	var coefX = 50;
	var coefY = 40;
	var padX  = 20;
	var padY  = 40;

	// modify the size of the svg depending on the frame size
	$(idSvg).attr("width",  padX * 2 + coefX * (K + n_ff));
	$(idSvg).attr("height", padY * 2 + coefY * (n_states -1));

	var jIndexS0 = encoder.trellis[6];
	var jIndexS1 = encoder.trellis[8];

	var jIndexS0Rev = [];
	var jIndexS1Rev = [];
	for (i = 0; i < n_states; i++)
	{
		if (encoder.trellis[1][i] == +1)
			jIndexS0Rev[i] = encoder.trellis[0][i];
		else
			jIndexS1Rev[i] = encoder.trellis[0][i];
		if (encoder.trellis[4][i] == +1)
			jIndexS0Rev[i] = encoder.trellis[3][i];
		else
			jIndexS1Rev[i] = encoder.trellis[3][i];
	}

	var i = 0;
	var j = 0;

	// generate edges
	var prevStateEnc = 0;
	for (i = 0; i < K + n_ff; i++)
	{
		var x1 = padX + (i +0) * coefX;
		var x2 = padX + (i +1) * coefX;

		var encoderBit = 0;
		var decoderBit = 0;

		for (j = 0; j < n_states; j++)
		{
			var y1 = padY + j           * coefY;
			var y2 = padY + jIndexS0[j] * coefY;

			var isEncoderTransition = (encoderTransition[i]    == jIndexS0[j]) && (jIndexS0Rev[jIndexS0[j]] == prevStateEnc);
			var isDecoderTransition = (decoderTransition[i][1] == jIndexS0[j]) && (jIndexS0Rev[jIndexS0[j]] == decoderTransition[i][0]);

			if (isEncoderTransition) encoderBit = 0;
			if (isDecoderTransition) decoderBit = 0;

			var color       = (isEncoderTransition) ? "black"   : "#C7C7C7";
			color           = (isDecoderTransition) ? "#3b8217" : color;
			var strokeWidth = (isEncoderTransition) ? 2         : 1;
			strokeWidth     = (isDecoderTransition) ? 2         : strokeWidth;
			strokeWidth     = (bigLines) ? 4 : strokeWidth;

			var gamma = decoderGamma[i * 2 + encoder.trellis[7][j]];

			$(idSvg).append("<line stroke=\"" + color + "\" "       +
			                "stroke-dasharray=\"5 3\" "             +
			                "stroke-width=\"" + strokeWidth + "\" " +
			                "x1=\"" + x1 + "\" "                    +
			                "x2=\"" + x2 + "\" "                    +
			                "y1=\"" + y1 + "\" "                    +
			                "y2=\"" + y2 + "\" >"                   +
			                "<title>bit = 0, "                      +
			                "gamma = " + gamma + "</title></line>");
		}

		for (j = 0; j < n_states; j++)
		{
			var y1 = padY + j           * coefY;
			var y2 = padY + jIndexS1[j] * coefY;

			var isEncoderTransition = (encoderTransition[i]    == jIndexS1[j]) && (jIndexS1Rev[jIndexS1[j]] == prevStateEnc);
			var isDecoderTransition = (decoderTransition[i][1] == jIndexS1[j]) && (jIndexS1Rev[jIndexS1[j]] == decoderTransition[i][0]);

			if (isEncoderTransition) encoderBit = 1;
			if (isDecoderTransition) decoderBit = 1;

			var color       = (isEncoderTransition) ? "black"   : "#C7C7C7";
			color           = (isDecoderTransition) ? "#3b8217" : color;
			var strokeWidth = (isEncoderTransition) ? 2         : 1;
			strokeWidth     = (isDecoderTransition) ? 2         : strokeWidth;
			strokeWidth     = (bigLines) ? 4 : strokeWidth;

			var gamma = -decoderGamma[i * 2 + encoder.trellis[9][j]];

			$(idSvg).append("<line stroke=\"" + color + "\" "       +
			                "stroke-width=\"" + strokeWidth + "\" " +
			                "x1=\"" + x1 + "\" "                    +
			                "x2=\"" + x2 + "\" "                    +
			                "y1=\"" + y1 + "\" "                    +
			                "y2=\"" + y2 + "\" >"                   +
			                "<title>bit = 1, "                      +
			                "gamma = " + gamma + "</title></line>");
		}

		var bitColor = (decoderBit == encoderBit) ? "#3b8217" : "#821717";

		$(idSvg).append("<text "                                    +
		                "x=\"" + ((x1 + x2) / 2) + "\" "            +
		                "y=\"" + 15 + "\""                          +
		                "style=\"text-anchor: middle; "             +
		                "        font-family: Arial; "              +
		                "        font-size  : 12px; "               +
		                "        stroke     : " + bitColor + "; "   +
		                "        fill       : " + bitColor + "; \"" +
		                ">" + decoderBit                            +
		                "</text>");

		prevStateEnc = encoderTransition[i];
	}

	// separate normal bit from tails bits
	var x1 = padX + K * coefX + (coefX / 2);
	var x2 = padX + K * coefX + (coefX / 2);
	var y1 = padY / 2;
	var y2 = padY + coefY * (n_states -1) + padY / 2;

	$(idSvg).append("<line stroke=\"#822017\" " +
	                "stroke-dasharray=\"5 3\" " +
	                "stroke-width=\"2\" "       +
	                "x1=\"" + x1 + "\" "        +
	                "x2=\"" + x2 + "\" "        +
	                "y1=\"" + y1 + "\" "        +
	                "y2=\"" + y2 + "\" >"       +
	                "<title>Tail bits</title></line>");

	// generate nodes
	for (i = 0; i < K + n_ff +1; i++)
	{
		var x = padX + i * coefX;

		var minValAB = minArray(decoderAlpha, decoderBeta, i * n_states, n_states);
		var maxValAB = maxArray(decoderAlpha, decoderBeta, i * n_states, n_states);

		for (j = 0; j < n_states; j++)
		{
			var y = padY + j * coefY;

			var alpha = decoderAlpha[i * n_states + j];
			var beta  = decoderBeta [i * n_states + j];

			var fillColor   = "black";
			var strokeColor = "black";
			var radius      = (variableRadius) ? 4 : 10;
			var opVal       = (opacity) ? 0.5 : 1;
			if (alpha != undefined || beta != undefined)
			{
				var hue = 0;
				if (minValAB == maxValAB && alpha + beta == minValAB)
				{
					hue = 1;
				}
				else
				{
					hue = ((alpha + beta) - minValAB) / (maxValAB - minValAB);
				}
				radius = (variableRadius) ? 4 + hue * 6 : radius;
				opVal = (opacity) ? hue / 0.9 + 0.1 : opVal;
				var rgbFillColor   = hslToRgb(hue / 3.60, 0.70, 0.30);
				var rgbStrokeColor = hslToRgb(hue / 3.60, 0.70, 0.20);

				fillColor   = rgbToHex(rgbFillColor  [0], rgbFillColor  [1], rgbFillColor  [2]);
				strokeColor = rgbToHex(rgbStrokeColor[0], rgbStrokeColor[1], rgbStrokeColor[2]);
			}

			alpha = (alpha != undefined) ? alpha : "-inf";
			beta  = (beta  != undefined) ? beta  : "-inf";
			$(idSvg).append("<circle id=\"N_" + i + "_" + j + "\" " +
			                "cx=\"" + x + "\" "                     +
			                "cy=\"" + y + "\" "                     +
			                "r=\"" + radius + "\" "                 +
			                "fill=\"" + fillColor + "\" "           +
			                "fill-opacity=\"" + opVal + "\" >"      +
			                "<title>" + "N_" + i + "_" + j + ": "   +
			                "alpha = " + alpha + ", "               +
							"beta = " + beta + "</title></circle>");
		}
	}

	// refresh the svg in the browser
	$(idSvg).html($(idSvg).html());
}

function launch(jsonData)
{
	var curFra = 0;
	var curIte = 0;
	var nFra = Object.keys(jsonData).length -1;

	var upSvg = function upSvg(encoder, decoder, ite)
	{
		generateSvgGraph(encoder, decoder, "#svg-natural",     ite);
		generateSvgGraph(encoder, decoder, "#svg-interleaved", ite);

		var badges  = '<span class="badge badge-secondary">ite. ' + (curIte +1) + '/' + decoder.n_ite + '</span>&nbsp;';
		    badges += '<span class="badge badge-secondary">K = ' + encoder.K + '</span>&nbsp;';
		    badges += '<span class="badge badge-secondary">R = ' + encoder.R + '</span>&nbsp;';
		    badges += '<span class="badge badge-secondary">poly = ' + encoder.poly + '</span>';
		$(".nIte").html(badges);
		$(".nFra").html("(" + (curFra +1) + "/" + nFra + ")");
	}

	upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);

	$("#control").show();
	$("#legend").show();
	$("#siso").show();

	$("#radiusCB").unbind();
	$("#radiusCB").click(function()
	{
		variableRadius = !variableRadius;
		upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);
	});

	$("#opacityCB").unbind();
	$("#opacityCB").click(function()
	{
		opacity = !opacity;
		upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);
	});

	$("#bigLinesCB").unbind();
	$("#bigLinesCB").click(function()
	{
		bigLines = !bigLines;
		upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);
	});

	$("#nextButton").unbind();
	$("#nextButton").click(function()
	{
		if (curIte < jsonData[curFra][1].n_ite -1)
		{
			upSvg(jsonData[curFra][0], jsonData[curFra][1], ++curIte);
		}
	});

	$("#prevButton").unbind();
	$("#prevButton").click(function()
	{
		if (curIte >= 1)
		{
			upSvg(jsonData[curFra][0], jsonData[curFra][1], --curIte);
		}
	});

	$(document).keydown(function(e)
	{
		if (e.keyCode == 78) // "n"
		{
			if (curIte < jsonData[curFra][1].n_ite -1)
			{
				upSvg(jsonData[curFra][0], jsonData[curFra][1], ++curIte);
			}
		}
	});

	$(document).keydown(function(e)
	{
		if (e.keyCode == 80) // "p"
		{
			if (curIte >= 1)
			{
				upSvg(jsonData[curFra][0], jsonData[curFra][1], --curIte);
			}
		}
	});

	$('#iteForm').submit(function ()
	{
		var wishIte = parseInt($("#iteText").val()) -1;

		if (curIte != wishIte && wishIte >= 0 && wishIte < jsonData[curFra][1].n_ite)
		{
			curIte = wishIte;
			upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);
		}
		else
		{
			$("#iteText").val(curIte +1);
		}
		return false;
	});

	$('#fraForm').submit(function ()
	{
		var wishFra = parseInt($("#fraText").val()) -1;

		if (curFra != wishFra && wishFra >= 0 && wishFra < nFra)
		{
			curFra = wishFra;
			curIte = 0;
			upSvg(jsonData[curFra][0], jsonData[curFra][1], curIte);
		}
		else
		{
			$("#fraText").val(curFra +1);
		}
		return false;
	})
}

window.onload = function()
{
	var fileInput = document.getElementById('fileInput');
	fileInput.addEventListener('change', function(e)
	{
		var file = fileInput.files[0];
		var jsonExt = /^.*\.json$/;

		if (file.name.match(jsonExt))
		{
			$("#fileDisplayArea").empty();
			var reader = new FileReader();
			reader.onload = function(e)
			{
				$("#turboReaderPreview").hide();
				var jsonData = JSON.parse(reader.result);
				launch(jsonData);
			};

			reader.readAsText(file);
		}
		else
		{
			$("#fileDisplayArea").html('<br><br><span class="alert alert-danger" role="alert">File not supported!</span>');
		}
	});
}
