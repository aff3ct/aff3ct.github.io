function text2jsonContentsGeneric(txt) {
	let legends = [];
	let contents = {};
	let correspAxes = {
		"Eb/N0"  : ["Eb/N0 (dB)", "EbN0", "SNRs", "SNR", "Eb/N0"],
		"Es/N0"  : ["Es/N0 (dB)", "EsN0", "Es/N0"],
		"BE"     : ["bit errors", "bits errors", "bits error", "BE"],
		"FE"     : ["error frames", "frame errors", "frames errors", "frames error", "FE"],
		"BER"    : ["bit error rate", "BER"],
		"FER"    : ["frame error rate", "FER"],
		"FRA"    : ["total frames", "FRA"],
		"SIM_THR": ["SIM_CTHR", "SIM_THR"],
		"ET/RT"  : ["simulation time", "sim time", "time", "ET/RT"],
	};
	let delims = ["|", ",", ";", "	", " "];
	let lines = txt.split(/[\n\r]+/);
	for (let ln = 0; ln < lines.length; ln++) {
		let l = lines[ln];
		let cols=[];
		let d=0;
		while (d<delims.length && cols.length < 2) {
			cols = l.split(delims[d]);
			let c=0;
			while (cols && c<cols.length) {
				if (cols[c]=="")
					cols.splice(c,1);
				else
					c++;
			}
			d++;
		}
		if (cols.length >= 2 && !isNaN(parseInt(cols[0]))) {
			if (!legends.length) {
				let i = 1;
				while (!legends.length && ln >= i) {
					let newl = lines[ln -i];
					newl = newl.replace("#", "");
					let j=0;
					let compatible=false;
					while (!compatible && j < correspAxes["Eb/N0"].length) {
						if (newl.includes(correspAxes["Eb/N0"][j])               ||
						    newl.includes(correspAxes["Eb/N0"][j].toLowerCase()) ||
						    newl.includes(correspAxes["Eb/N0"][j].toUpperCase()))
							compatible=true;
						j++;
					}
					if (compatible) {
						Object.keys(correspAxes).forEach(function(legend) {
							correspAxes[legend].forEach(function(alt) {
								newl = newl.replace(alt, legend);
								newl = newl.replace(alt.toLowerCase(), legend);
								newl = newl.replace(alt.toUpperCase(), legend);
							});
						});
						let colsL=[];
						d=0;
						while (d<delims.length && colsL.length < 2) {
							colsL = newl.split(delims[d]);
							let c=0;
							while (colsL && c<colsL.length) {
								if (colsL[c]=="")
									colsL.splice(c,1);
								else
									c++;
							}
							d++;
						}
						legends = [];
						colsL.forEach(function(col) {
							if (col!="")
								legends.push($.trim(col));
						});
						break;
					}
					i++;
				}
			}
			let c=0;
			while (cols && c<cols.length) {
				if (cols[c]=="")
					cols.splice(c,1);
				else
					c++;
			}
			if (cols && cols.length==legends.length) {
				for (let c=0; c<cols.length; c++) {
					let key = legends[c];
					let val = $.trim(cols[c]);
					if (key == "ET/RT") {
						newVal = parseInt(val.split("'")[1]);
						newVal += parseInt(val.split("'")[0].split("h")[1])*60;
						newVal += parseInt(val.split("'")[0].split("h")[0])*3600;
						val = newVal;
					}
					let li = parseInt(val);
					if (!isNaN(li)) {
						let li2 = parseFloat(val);
						li = (li - li2 != 0)?li2:li;
						if (key in contents)
							contents[key].push(li);
						else
							contents[key] = [li];
					}
				}
			}
		}
	}
	return contents;
}

function text2jsonAFF3CT(txt, filename = "") {
	let isTrace = false;
	let contents = text2jsonContentsGeneric(txt);
	let metadata = {source: "Local"};
	let titleSection = "";
	let headers = {};
	let section = {};

	let lines = txt.split(/[\n\r]+/);
	for (let ln = 0; ln < lines.length; ln++) {
		let l = lines[ln];

		if ((ln == 0 && l != "[metadata]") || l.startsWith("#"))
			isTrace = true;

		if (l == "[trace]") {
			isTrace = true;
			continue;
		}

		if (!isTrace) {
			ls = l.split("=");
			if (ls.length >= 2) {
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
		} else {
			if (l.startsWith("# *")) {
				if (titleSection != "") {
					headers[titleSection] = section;
					section = {};
				}
				titleSection = l.substring(4).split(" -")[0];
			}
			else if (l.startsWith("#    **")) {
				cleanL = l.substring(8);
				splitL = cleanL.split(" = ");
				if (splitL.length >= 2) {
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
					else {
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
			else if (l.startsWith("# The simulation is running...")) {
				if (titleSection != "") {
					headers[titleSection] = section;
					section = {};
					titleSection = "";
				}
			}
		}
	}

	let hashMaker = sha1.create();
	hashMaker.update(txt);
	hashMaker.hex();
	let hash = {"type" : "sha1", "value" : hashMaker.hex()};

	let dict = {};
	if (filename != ""            ) dict["filename"] = filename;
	if (!$.isEmptyObject(metadata)) dict["metadata"] = metadata;
	if (!$.isEmptyObject(headers )) dict["headers" ] = headers;
	if (!$.isEmptyObject(contents)) dict["contents"] = contents;
	                                dict["trace"   ] = txt;
	                                dict["hash"    ] = hash;

	return dict;
}

function text2jsonKaiserslautern(txt, filename = "", codeType = "") {
	let correspAxes = {
		"Eb/N0 (dB)": "Eb/N0",
		"FER": "FER",
		"BER": "BER",
		"error frames": "FE",
		"total frames": "FRA",
	};

	let correspCodeType = {
		"LDPC": {
			corresp: ["LDPC", "WIMAX", "wimaxlike", "WRAN", "WiFi", "ccsds", "Tanner", "MacKay"],
			dir: "results_ldpc",
		},
		"LDPC_AR": {
			corresp: ["ArrayCode", "Array"],
			dir: "results_array",
		},
		"LDPC_NB": {
			corresp: ["NB"],
			dir: "results_ldpc",
		},
		"TURBO": {
			corresp: ["3GPP"],
			dir: "results_turbo",
		},
		"POLAR": {
			corresp: ["PolarCode"],
			dir: "results_polar",
		},
		"BCH": {
			corresp: ["BCH"],
			dir: "results_bch",
		},
		"RS": {
			corresp: ["RS", "rs"],
			dir: "results_rs",
		},
		"RM": {
			corresp: ["RM"],
			dir: "results_rm",
		},
		"GOLAY": {
			corresp: ["Golay"],
			dir: "results_others",
		},
		"CYCLIC": {
			corresp: ["Cyclic"],
			dir: "results_others",
		},
	}

	let metadata = {source: "Local"};
	let headers = {};
	let contents = text2jsonContentsGeneric(txt);

	if (filename!="" && codeType=="") {
		let resCodeType=filename.match(/([A-Za-z0-9]*)\_/);
		if (resCodeType && resCodeType.length==2) {
			Object.keys(correspCodeType).forEach(function(key) {
				correspCodeType[key].corresp.forEach(function(str) {
					if (resCodeType[1]==str) {
						headers.Codec = {"Type": key};
					}
				});
			});
		}
	}
	if (codeType!="")
		headers.Codec = {"Type": codeType};

	let lines = txt.split(/[\n\r]+/);
	for (let ln = 0; ln < lines.length; ln++) {
		let l = lines[ln];
		if (ln==0) {
			let resNK = l.match(/\ \(([0-9]*)\,([0-9]*)\)/);
			if (!resNK)
				resNK = l.match(/^\(([0-9]*)\,([0-9]*)\)/);
			if (resNK && resNK.length==3) {
				let N = parseInt(resNK[1]);
				let K = parseInt(resNK[2]);
				let coderate = K/N;
				if (!headers.Codec) headers.Codec={};
				$.extend(headers.Codec, {"Frame size (N)": N, "Info. bits (K)": K, "Code rate": coderate});
			}
			let resTitle = l.match(/(.*) Code:/);
			if (resTitle && resTitle.length==2) {
				metadata.title=$.trim(resTitle[1]);
			} else {
				let resTitle = l.match(/(.*) turbo code:/);
				if (resTitle && resTitle.length==2)
					metadata.title=$.trim(resTitle[1]);
			}
			let resCode = l.match(/\: ([^ ]*) Simulation Results/);
			if (resCode && resCode.length==2) {
				headers.Decoder = {"Type (D)": $.trim(resCode[1])};
			}
		}
		let resChannel = l.match(/Channel: (.*)/);
		if (resChannel && resChannel.length==2) {
			headers.Channel = {"Type": $.trim(resChannel[1])};
			if (headers.Channel.Type=="AWGNC")
				headers.Channel.Type="AWGN";
		}
		let resModem = l.match(/Modulation: (.*)/);
		if (resModem && resModem.length==2)
			headers.Modem = {"Type": $.trim(resModem[1])};
	}

	let hashMaker = sha1.create();
	hashMaker.update(txt);
	hashMaker.hex();
	let hash = {"type" : "sha1", "value" : hashMaker.hex()};

	let dict = {};
	if (filename != ""            ) dict["filename"] = filename;
	if (!$.isEmptyObject(metadata)) dict["metadata"] = metadata;
	if (!$.isEmptyObject(headers )) dict["headers" ] = headers;
	if (!$.isEmptyObject(contents)) dict["contents"] = contents;
	                                dict["trace"   ] = txt;
	                                dict["hash"    ] = hash;

	return dict;
}

function text2json(txt, filename = "")
{
	if (txt.match(/University of Kaiserslautern/))
		return text2jsonKaiserslautern(txt, filename);
	else
		return text2jsonAFF3CT(txt, filename);
}