function text2json(txt, filename = "")
{
	let isTrace = false;
	let isLegend = false;
	let legends = [];
	let contents = {};
	let metadata = {};
	let titleSection = "";
	let headers = {};
	let section = {};

	let lines = txt.split("\n");
	for (let ln = 0; ln < lines.length; ln++)
	{
		let l = lines[ln];

		if (ln == 0 && l != "[metadata]")
			isTrace = true;

		if (l == "[trace]")
		{
			isTrace = true;
			continue;
		}

		if (!isTrace)
		{
			ls = l.split("=");
			if (ls.length >= 2)
			{
				let key = ls[0];
				let val = ls[1];

				for (let i = 2; i < ls.length; i++)
					val += "=" + ls[i];

				if (val == "on")
					metadata[key] = true;
				else if (val == "off")
					metadata[key] = false;
				else
					metadata[key] = val;
			}
		}
		else
		{
			if (l.startsWith("# *"))
			{
				if (titleSection != "")
				{
					headers[titleSection] = section;
					section = {};
				}
				titleSection = l.substring(4).split(" -")[0];
			}
			else if (l.startsWith("#    **"))
			{
				cleanL = l.substring(8);
				splitL = cleanL.split(" = ");
				if (splitL.length >= 2)
				{
					key = $.trim(splitL[0]);
					val = splitL[1];

					for (let i = 2; i < splitL.length; i++)
						val += " = " + splitL[i];

					if (["Code rate", "Bit rate", "Multi-threading (t)"].includes(key))
						val = val.split(" ")[0];
					if (["yes", "on"].includes(val))
						section[key] = true;
					else if (["no", "off"].includes(val))
						section[key] = false;
					else
					{
						let valInt = parseInt(val);
						if (isNaN(valInt))
							section[key] = val;
						else
						{
							let valFloat = parseFloat(val);
							if (valFloat - valInt == 0)
								section[key] = valInt;
							else
								section[key] = valFloat;
						}
					}
				}
			}
			else if (l.startsWith("# The simulation is running..."))
			{
				if (titleSection != "")
				{
					headers[titleSection] = section;
					section = {};
					titleSection = "";
				}
			}

			if (!l.startsWith("#"))
			{
				if (!isLegend)
				{
					isLegend = true;
					if (ln >= 3)
					{
						leg = lines[ln -3];
						leg = leg.replace("#", "");
						legends = leg.split("|");
					}
				}

				let cols = l.split("|");
				if (cols.length == legends.length)
				{
					for (let c = 0; c < cols.length; c++)
					{
						key = $.trim(legends[c]);
						if (key != "")
						{
							val = $.trim(cols[c]).split(" ")[0];

							if (key == "ET/RT")
							{
								newVal = parseInt(val.split("'")[1]);
								newVal += parseInt(val.split("'")[0].split("h")[1]) * 60;
								newVal += parseInt(val.split("'")[0].split("h")[0]) * 3600;
								val = newVal;
							}

							let li = parseInt(val);
							if (isNaN(li))
								li = val;
							else
							{
								let li2 = parseFloat(val);
								if (li - li2 != 0)
									li = li2;
							}

							if (key in contents)
								contents[key].push(li);
							else
								contents[key] = [li];
						}
					}
				}
			}
		}
	}

	let hashMaker = sha1.create();
	hashMaker.update(txt);
	hashMaker.hex();
	hash = {"type" : "sha1", "value" : hashMaker.hex()};

	let dict = {};
	if (filename != ""            ) dict["filename"] = filename;
	if (!$.isEmptyObject(metadata)) dict["metadata"] = metadata;
	if (!$.isEmptyObject(headers )) dict["headers" ] = headers;
	if (!$.isEmptyObject(contents)) dict["contents"] = contents;
	                                dict["trace"   ] = txt;
	                                dict["hash"    ] = hash;

	let o = {};
	o[hashMaker.hex().substring(0,7)] = dict;

	return o;
}

function loadUniqueFile(fileInput) {
	let file = fileInput.files[0];
	if (file.type=="text/plain")
	{
		$("#fileDisplayArea").empty();
		let reader = new FileReader();
		reader.readAsText(file);
		reader.onloadend = function(e)
		{
			console.log(text2json(reader.result, file.name));
		};
	}
	else
	{
		$("#fileDisplayArea").html('<span class="alert alert-danger" role="alert">File not supported!</span>');
	}
}

window.onload = function() {
	$("#fileInput").on('change', function(e)
	{
		loadUniqueFile(fileInput);
	});
}