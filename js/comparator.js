const GITLAB="https://gitlab.com/api/v4/projects/10354484/";
const BRANCH="development";

// connexion to the CouchDB server (this code do not connect to the CouchDB until the first usage)
const ServerCDB = "https://couchdb-580e7b.smileupps.com";
const NameCDB = "aff3ct_refs";
var CDB = new PouchDB(ServerCDB+'/'+NameCDB);

var Curves = {
	db: {},
	colors: [{id: 9, value: '#17becf'},
	         {id: 8, value: '#bcbd22'},
	         {id: 7, value: '#7f7f7f'},
	         {id: 6, value: '#e377c2'},
	         {id: 5, value: '#8c564b'},
	         {id: 4, value: '#9467bd'},
	         {id: 3, value: '#d62728'},
	         {id: 2, value: '#2ca02c'},
	         {id: 1, value: '#ff7f0e'},
	         {id: 0, value: '#1f77b4'}],
	selectors: {
		codeType:    { selection: [], path: "headers/Codec/Type"           },
		frameSize:   { selection: [], path: "headers/Codec/Frame size (N)" },
		modemType:   { selection: [], path: "headers/Modem/Type"           },
		channelType: { selection: [], path: "headers/Channel/Type"         }
	},
	selectedRefs: [],
};

var Plot;
var PlotLayouts = {
	common: {
		showlegend:false,
		margin: { l: 100, r: 40, b: 40, t: 40, pad: 4 },
		hovermode: 'x',
	},
	x: {
		"Eb/N0": {
			xaxis: { title: 'Signal-to-Noise Ratio (SNR) - Eb/N0 (dB)', zeroline:false, hoverformat: '.e' },
			default: true,
			enabled: false,
			divId: "EbN0",
		},
		"Es/N0": {
			xaxis: { title: 'Signal-to-Noise Ratio (SNR) - Es/N0 (dB)', zeroline:false, hoverformat: '.e' },
			default: false,
			enabled: false,
			divId: "EsN0",
		},
		"EP": {
			xaxis: { title: 'Erasure Probability (EP)', zeroline:false, hoverformat: '.e' },
			default: true,
			enabled: false,
			divId: "EP",
		},
		"ROP": {
			xaxis: { title: 'Received Optical Power (dB)', zeroline:false, hoverformat: '.e' },
			default: true,
			enabled: false,
			divId: "ROP",
		},
	},
	y: {
		"BER": {
			yaxis: { title: 'Bit Error Rate (BER)', type: 'log', autorange: true, hoverformat: '.2e' },
			compatible: ["FER"],
			default: true,
			enabled: false,
			divId: "BER",
		},
		"FER": {
			yaxis: { title: 'Frame Error Rate (FER)', type: 'log', autorange: true, hoverformat: '.2e' },
			compatible: ["BER"],
			default: true,
			enabled: false,
			divId: "FER",
		},
		"FRA": {
			yaxis: { title: 'Simulated Frames', type: 'log', autorange: true },
			default: false,
			enabled: false,
			divId: "FRA",
		},
		"FE": {
			yaxis: { title: 'Number of Frame Errors (FE)', autorange: true },
			default: false,
			enabled: false,
			divId: "FE",
		},
		"BE": {
			yaxis: { title: 'Number of Bit Errors (BE)', autorange: true },
			default: false,
			enabled: false,
			divId: "BE",
		},
		"BE/FE": {
			yaxis: { title: 'Bit Errors on Frame Errors Ratio (BE/FE)', autorange: true },
			default: false,
			enabled: false,
			divId: "BEFE",
		},
		"SIM_THR": {
			yaxis: { title: 'Simulation Throughput (Mb/s)', autorange: true },
			default: false,
			enabled: false,
			alt: "THR",
			divId: "THR",
		},
		"ET/RT": {
			yaxis: { title: 'Elapsed Time (sec)', type: 'log', autorange: true },
			default: false,
			enabled: false,
			alt: "TIME",
			divId: "TIME",
		},
	},
}

function precomputeData(id) {
	let ref = Curves.db[id];
	ref["hash"]["id"] = id;
	if (typeof(ref.metadata)==="undefined")
		ref.metadata={};
	if (typeof(ref.metadata.source)!=="undefined")
		ref.metadata[ref.metadata.source] = true;
	if (typeof(ref.metadata.title)==="undefined") {
		if (typeof(ref.headers)!=="undefined" &&
			typeof(ref.headers.Codec)!=="undefined" &&
			typeof(ref.headers.Codec["Type"])!=="undefined" &&
			typeof(ref.headers.Codec["Frame size (N)"])!=="undefined" &&
			typeof(ref.headers.Codec["Info. bits (K)"])!=="undefined") {
			let codeType = ref.headers.Codec["Type"];
			let N = ref.headers.Codec["Frame size (N)"];
			let K = ref.headers.Codec["Info. bits (K)"];
			ref["metadata"]["title"] = codeType+" ("+N+","+K+")";
		}
	}
	if (typeof(ref.metadata)!=="undefined") {
		if (typeof(ref.metadata.title)!=="undefined") {
			let res = ref.metadata.title.match(/([a-z0-9A-Z.\-,\/=\s;\+:]+\ \([0-9,]+\))([a-z0-9A-Z.\-,\/=\s;\+:()]+)/);
			let bigtitle=(res && res.length>=2)?$.trim(res[1]):ref.metadata.title;
			let subtitle=(res && res.length>=3)?$.trim(res[2]):"";
			ref["metadata"]["bigtitle"] = bigtitle;
			ref["metadata"]["subtitle"] = subtitle;
		}
		if (typeof(ref.metadata.command)!=="undefined") {
			let cmd = ref.metadata.command;
			let params = cmd.split(' -');
			let aff3ct = $.trim(params[0]);
			let niceCmd = '<span class="aff3ct">'+aff3ct+'</span> ';
			for (let p=1; p < params.length; p++) {
				let pSplit = params[p].split(' ');
				let key="";
				let val="";
				if (pSplit.length >= 1)
					key = "-"+$.trim(pSplit[0]);
				if (pSplit.length >= 2)
					for (let i=1; i<pSplit.length; i++)
						val += (i==1?"":" ")+$.trim(pSplit[i]);
				if (key!="")
					niceCmd += key+' ';
				if (val!="") {
					val=val.replace(/"([^ ,:;]*)"/g, "$1");
					val=val.replace(/\-\-sim\-meta\ "([^]*)"/g, "");
					val=val.replace(/\-\-sim\-meta\ ([^ ]*)/g, "");
					let blobUrlGithub="https://github.com/aff3ct/configuration_files/blob/";
					val=val.replace(/conf\/([^"]*)/g,"<a target='_blank' href='"+blobUrlGithub+BRANCH+"/$1' onclick='return trackOutboundLink(\""+blobUrlGithub+BRANCH+"/$1\");'>conf/$1</a>");
					niceCmd += '<span class="'+(isNaN(parseInt(val))?'str':'num')+'">'+val+'</span> ';
				}
			}
			ref.metadata["niceCommand"] = niceCmd;
		}
	}
	if (typeof(ref.metadata)==="undefined" || typeof(ref.metadata.title)==="undefined") {
		$.extend(ref["metadata"], {title: "Undefined", bigtitle: "Undefined", subtitle: ""});
	}
	if (typeof(ref.headers)!=="undefined" && typeof(ref.headers.list)==="undefined") {
		ref["headers"]["list"] = [];
		ref["headers"]["list"].push({"name": "Frame size", "value" : ref.headers.Codec["Frame size (N)"]});
		if (ref.headers.Codec["Codeword size (N_cw)"] > ref.headers.Codec["Frame size (N)"])
			ref["headers"]["list"].push({"name": "Codeword", "value" : ref.headers.Codec["Codeword size (N_cw)"]});
		ref["headers"]["list"].push({"name": "Code rate", "value" : ref.headers.Codec["Code rate"].toFixed(3)});
		for (let j in ref.headers) {
			if (ref.headers[j].Type) {
				let obj = {"name": j, "value" : ref.headers[j].Type};
				if (Tooltips[ref.headers[j].Type])
					obj["tooltip"] = Tooltips[ref.headers[j].Type];
				ref["headers"]["list"].push(obj);
			} else if (ref.headers[j]["Type (D)"]) {
				let obj = {"name": j, "value" : ref.headers[j]["Type (D)"]};
				if (Tooltips[ref.headers[j]["Type (D)"]])
					obj["tooltip"] = Tooltips[ref.headers[j]["Type (D)"]];
				ref["headers"]["list"].push(obj);
			}
		}
	}
	if (typeof(ref.contents)!=="undefined" &&
		typeof(ref.contents.BE)!=="undefined" &&
		typeof(ref.contents.FE)!=="undefined" &&
		typeof(ref.contents["BE/FE"])==="undefined") {
		let BEFE=[];
		for (let i=0; i<ref.contents.BE.length; i++)
			BEFE.push(ref.contents.BE[i]/ref.contents.FE[i]);
		ref.contents["BE/FE"]=BEFE;
	}
}

// size of the compressed Gitlab refs database in bytes
var EVT_TOTAL = 1279262;
function loadDatabase() {
	$.ajaxSetup({
		beforeSend: function(xhr) {
			if (xhr.overrideMimeType) xhr.overrideMimeType("application/json");
		},
		isLocal:false
	});
	let databaseURL = GITLAB+"jobs/artifacts/"+BRANCH+"/raw/database.json?job=deploy-database-json";
	$.ajax(databaseURL,
		{error:function(xhr,status,error) {
			logger("**Error loading \"" + databaseURL + "\"\n"+status+" "+error);
		},
		xhr: function (){
			let xhr = new window.XMLHttpRequest();
			xhr.addEventListener("progress", function (evt) {
				let evt_total;
				if (evt.lengthComputable) evt_total = evt.total;
				else evt_total = EVT_TOTAL;
				if (evt_total<=evt.loaded) evt_total=evt.loaded*101/100;
				let percentComplete = Math.round((evt.loaded / evt_total) * 100);
				$("#loader .progress-bar").html(percentComplete+"%");
				$('#loader .progress-bar').attr('aria-valuenow', percentComplete).css('width',percentComplete+"%");
			}, false);
			return xhr;
		}
	}).done(function(database) {
		Curves.db = database;
		Object.keys(Curves.db).forEach(function(key) {
			precomputeData(key);
		});
		displaySlider();
		displaySelectors();
		$("#loader"    ).css("display", "none" );
		$("#curvesTip" ).css("display", "block");
		$("#tips"      ).css("display", "block");
		$("#comparator").css("display", "block");
		displayRefsFromURI();
		displayRefsList(Object.keys(Curves.db));
	});
}

function displaySlider() {
	let stepSlider = $('#codeRate')[0];
	noUiSlider.create(stepSlider, {
		start: [0,1],
		connect: true,
		step: 0.01,
		range: {
			'min': [0],
			'max': [1]
		}
	});
	$("#codeRate").append("<div class='my-3'><span id='codeRateVal'></span></div>")
	let stepSliderValueElement = $('#codeRateVal')[0];
	stepSlider.noUiSlider.on('update', function (values) {
		displaySelectors();
		stepSliderValueElement.innerHTML = "Values: ";
		stepSliderValueElement.innerHTML += values.join(' - ');
	});
}

function displayCommandModal(ref) {
	if (!$("#cmdModal"+ref.hash.id).length)
	{
		let cmdModalTemplate = $('#cmdModalTemplate').html();
		Mustache.parse(cmdModalTemplate);
		let cmdModalRendered=Mustache.render(cmdModalTemplate, ref);
		$("#curveModals").append(cmdModalRendered);
	}
}

function displayTraceModal(ref) {
	if (!$("#traceModal"+ref.hash.id).length)
	{
		let traceModalTemplate = $('#traceModalTemplate').html();
		Mustache.parse(traceModalTemplate);
		let traceModalRendered=Mustache.render(traceModalTemplate, ref);
		$("#curveModals").append(traceModalRendered);
	}
}

function displayRefsList(ids) {
	// sort refs by title (lexicographical order)
	ids.sort(function(a,b) {
		return Curves.db[a].metadata.title.localeCompare(Curves.db[b].metadata.title);
	});
	$("#refsList #accordion").empty();
	ids.forEach(function(id) {
		let ref=Curves.db[id];

		let refTemplate = $('#refTemplate').html();
		Mustache.parse(refTemplate);
		let refRendered=Mustache.render(refTemplate, ref);
		$("#refsList #accordion").append(refRendered);

		let refBodyTemplate = $('#refBodyTemplate').html();
		Mustache.parse(refBodyTemplate);
		let refBodyRendered=Mustache.render(refBodyTemplate, $.extend({
			prefix: "",
			branch: BRANCH,
			serverCDB: ServerCDB,
			nameCDB: NameCDB,
		}, ref));
		$("#card"+ref.hash.id).append(refBodyRendered);

		if (ref.metadata.command) {
			$("#displayCmdModal"+ref.hash.id).on("click", function () {
				displayCommandModal(ref);
			});
		}
		if (ref.trace) {
			$("#displayTraceModal"+ref.hash.id).on("click", function () {
				displayTraceModal(ref);
			});
		}
		$('#curve'+ref.hash.id).on('click', function() {
			if ($('#curve'+ref.hash.id).hasClass("btn-primary"))
				addSelectedRef(ref);
			else
				deleteSelectedRef(ref.hash.id);
		});

	});
	$('[data-toggle="tooltip"]').tooltip();
}

function displaySelectedRefs(ref) {
	let refSelectedTemplate = $('#refSelectedTemplate').html();
	Mustache.parse(refSelectedTemplate);
	let refSelectedRendered=Mustache.render(refSelectedTemplate, ref);
	$("#scurve #saccordion").append(refSelectedRendered);

	let refBodyTemplate = $('#refBodyTemplate').html();
	Mustache.parse(refBodyTemplate);
	let refBodyRendered=Mustache.render(refBodyTemplate, $.extend({
		prefix: "s",
		branch: BRANCH,
		serverCDB: ServerCDB,
		nameCDB: NameCDB,
	}, ref));
	$("#ss"+ref.hash.id).append(refBodyRendered);

	if (typeof(ref.metadata)!=="undefined" && typeof(ref.metadata.command)!=="undefined") {
		$("#sdisplayCmdModal"+ref.hash.id).on("click", function () {
			displayCommandModal(ref);
		});
	}
	if (typeof(ref.trace)!=="undefined") {
		$("#sdisplayTraceModal"+ref.hash.id).on("click", function () {
			displayTraceModal(ref);
		});
	}

	$("#delete"+ref.hash.id).on("click", function () {
		deleteSelectedRef(ref.hash.id);
	});
	if (ref.metadata.hidden)
		$("#show"+ref.hash.id).on("click", function () {
			showPlotRef(ref.hash.id);
		});
	else
		$("#hide"+ref.hash.id).on("click", function () {
			hidePlotRef(ref.hash.id);
		});
	$('[data-toggle="tooltip"]').tooltip();
}

function updateAddButton(id, bool) {
	$("#curve"+id).removeClass(bool?"btn-primary":"btn-danger").addClass(bool?"btn-danger":"btn-primary");
	$("#curve"+id+" i").removeClass(bool?"fa-plus":"fa-minus").addClass(bool?"fa-minus":"fa-plus");
}

function plotSelectedRefs() {
	let colorsList=[];
	Curves.selectedRefs.forEach(function(id) {
		if (!Curves.db[id].metadata.hidden || Curves.db[id].metadata.hidden == false)
			colorsList.push(Curves.db[id].metadata.color.value);
	});

	let layoutCommon = $.extend({}, PlotLayouts.common);
	let xaxis = "";
	Object.keys(PlotLayouts.x).forEach(function(key) {
		if (PlotLayouts.x[key].enabled) {
			$.extend(layoutCommon, {xaxis: PlotLayouts.x[key].xaxis});
			xaxis = key;
		}
	});
	let lines = ['solid', 'dash', 'dot', 'dashdot'];
	let l = 0;
	let yaxis = "";
	let layout = $.extend({yaxis:{}},layoutCommon);
	let data = [];
	let finalColorsList=[];
	let titles=[];
	Object.keys(PlotLayouts.y).forEach(function(key) {
		if (PlotLayouts.y[key].enabled) {
			$.extend(layout.yaxis, PlotLayouts.y[key].yaxis);
			titles.push(PlotLayouts.y[key].yaxis.title);
			yaxis = key;
			let cid = 0;
			let tmpColorsList=Array.from(colorsList);
			Curves.selectedRefs.forEach(function(id) {
				if (((typeof(Curves.db[id].metadata.hidden)==="undefined") || Curves.db[id].metadata.hidden == false)) {
					if (typeof(Curves.db[id].contents[xaxis])!=="undefined" &&
					    typeof(Curves.db[id].contents[yaxis])!=="undefined") {
						data.push({
							x: Curves.db[id].contents[xaxis],
							y: Curves.db[id].contents[yaxis],
							type: 'scatter',
							line: {dash: lines[l%lines.length]},
							name: key,
						});
						cid++;
					} else
						tmpColorsList.splice(cid, 1);
				}
			});
			finalColorsList=finalColorsList.concat(tmpColorsList);
			l++;
		}
	});
	$.extend(layout, {colorway: finalColorsList});
	if (titles.length > 1) {
		let title=titles[0];
		for (let t=1; t<titles.length; t++)
			title+=" & "+titles[t];
		layout.yaxis["title"]=title;
	}
	if (data.length)
		Plotly.newPlot(Plot, data, layout, { displayModeBar: true, displaylogo: false });
}

function getPermalink() {
	$("#permalinkModal").empty();
	let url=window.location.origin;
	if (url=="null")
		url="http://aff3ct.github.io";
	let permalink=url+"/comparator.html?"
	let isFirst=true;
	Curves.selectedRefs.forEach(function(id) {
		let ref=Curves.db[id];
		ref.metadata.hidden=ref.metadata.hidden?true:false;
		let hidden=ref.metadata.hidden;
		if (ref.metadata.source=="local") {
			ref.metadata.source="couchdb";
			delete ref.metadata.local;
			ref.metadata["couchdb"]=true;
			ref.metadata.hidden=false;
			// put a document on the CouchDB server
			CDB.put(
				$.extend({_id: id}, ref)
			).then(function (response) {
				console.log("PouchDB: put success");
				console.log(response);
				ref.metadata.hidden=hidden;
			}).catch(function (err) {
				console.log("PouchDB: put fail");
				console.log(err);
				ref.metadata.hidden=hidden;
			});
		}
		permalink+=(isFirst?"":"&")+"curve"+ref.metadata.color.id+"="+ref.hash.id+(hidden?"&hidden"+ref.metadata.color.id:"");
		isFirst=false;
	});
	permalink+="&xaxis=";
	isFirst=true;
	Object.keys(PlotLayouts.x).forEach(function(x) {
		if (PlotLayouts.x[x].enabled) {
			permalink+=encodeURIComponent((isFirst?"":",")+x);
			isFirst=false;
		}
	});
	permalink+="&yaxes=";
	isFirst=true;
	Object.keys(PlotLayouts.y).forEach(function(y) {
		if (PlotLayouts.y[y].enabled) {
			permalink+=encodeURIComponent((isFirst?"":",")+y);
			isFirst=false;
		}
	});
	let permalinkModalTemplate = $('#permalinkModalTemplate').html();
	Mustache.parse(permalinkModalTemplate);
	let permalinkModalRendered=Mustache.render(permalinkModalTemplate, {permalink: permalink});
	$("#permalinkModal").append(permalinkModalRendered);
	$("#copyClipboard").on("click", function() {
		let copyText = $("#permalinkInput")[0]; // get the text field
		copyText.select(); // select the text field
		document.execCommand("copy"); // copy the text inside the text field
		$("#copyClipboard i").removeClass("fa-clipboard").addClass("fa-clipboard-check");
	});
	$('#permalinkInstModal').modal("show");
}

function removeAxes() {
	Object.keys(PlotLayouts.x).forEach(function(key) {
		PlotLayouts.x[key].enabled=false;
	});
	Object.keys(PlotLayouts.y).forEach(function(key) {
		PlotLayouts.y[key].enabled=false;
	});
	$('#xaxis').empty();
	$('#yaxis').empty();
	$('#axes').hide();
}

function updateAxesCheckboxes(divId, key, axis) {
	let except=[];
	if (typeof(PlotLayouts[axis][key].compatible)!=="undefined")
		except=PlotLayouts[axis][key].compatible;
	let nCheck=0;
	Object.keys(PlotLayouts[axis]).forEach(function(lkey) {
		if (PlotLayouts[axis][lkey].enabled)
			nCheck++;
	});
	if (nCheck == 1 && !$('#'+divId).prop('checked')) {
		$('#'+divId).prop('checked', true);
	} else {
		if (!$('#'+divId).prop('checked')) {
			PlotLayouts[axis][key].enabled = false;
		} else {
			Object.keys(PlotLayouts[axis]).forEach(function(lkey) {
				if (!except.includes(lkey) && lkey!=key) {
					PlotLayouts[axis][lkey].enabled = false;
					$('#'+PlotLayouts[axis][lkey].divId).prop('checked', false);
				}
			});
			PlotLayouts[axis][key].enabled = true;
		}
		plotSelectedRefs();
	}
}

function displayAxes(ref, xaxisEnabled="", yaxesEnabled=[]) {
	let xaxes=[];
	let yaxes=[];

	Object.keys(ref.contents).forEach(function(keyRef) {
		Object.keys(PlotLayouts.x).forEach(function(keyPlot) {
			if (keyRef==keyPlot) {
				let name=(typeof(PlotLayouts.x[keyPlot].alt)!=="undefined")?PlotLayouts.x[keyPlot].alt:keyPlot;
				let xaxis = {divId: PlotLayouts.x[keyPlot].divId, key: keyPlot, name: name, desc: PlotLayouts.x[keyPlot].xaxis.title};
				if ((PlotLayouts.x[keyPlot].default && xaxisEnabled=="") || xaxisEnabled==keyPlot) {
					PlotLayouts.x[keyPlot].enabled=true;
					xaxis["checked"]="checked";
				} else {
					xaxis["checked"]="";
				}
				xaxes.push(xaxis);
			}
		});
		Object.keys(PlotLayouts.y).forEach(function(keyPlot) {
			if (keyRef==keyPlot) {
				let name=(typeof(PlotLayouts.y[keyPlot].alt)!=="undefined")?PlotLayouts.y[keyPlot].alt:keyPlot;
				let yaxis = {divId: PlotLayouts.y[keyPlot].divId, key: keyPlot, name: name, desc: PlotLayouts.y[keyPlot].yaxis.title};
				if ((PlotLayouts.y[keyPlot].default && !yaxesEnabled.length) || yaxesEnabled.includes(keyPlot)) {
					PlotLayouts.y[keyPlot].enabled=true;
					yaxis["checked"]="checked";
				} else {
					yaxis["checked"]="";
				}
				yaxes.push(yaxis);
			}
		});
	});
	let xaxisSelectorTemplate = $('#selectorTemplate').html();
	Mustache.parse(xaxisSelectorTemplate);
	let xaxisSelectorRendered=Mustache.render(xaxisSelectorTemplate, {entries: xaxes});
	$("#xaxis").append(xaxisSelectorRendered);
	let yaxisSelectorTemplate = $('#selectorTemplate').html();
	Mustache.parse(yaxisSelectorTemplate);
	let yaxisSelectorRendered=Mustache.render(yaxisSelectorTemplate, {entries: yaxes});
	$("#yaxis").append(yaxisSelectorRendered);
	xaxes.forEach(function(axis){
		$("#"+axis.divId).on("click", function () {
			updateAxesCheckboxes(axis.divId, axis.key, "x");
		});
	});
	yaxes.forEach(function(axis){
		$("#"+axis.divId).on("click", function () {
			updateAxesCheckboxes(axis.divId, axis.key, "y");
		});
	})
	$('[data-toggle="tooltip"]').tooltip();
	$('#axes').show();
}

function addSelectedRef(ref, colorId=-1, xaxisEnabled="", yaxesEnabled=[]) {
	if (Curves.selectedRefs.length==0) {
		let deleteAllTemplate = $('#deleteAllTemplate').html();
		Mustache.parse(deleteAllTemplate);
		$("#sbuttons").append(deleteAllTemplate);
		let permalinkTemplate = $('#permalinkTemplate').html();
		Mustache.parse(permalinkTemplate);
		$("#sbuttons").append(permalinkTemplate);
		$("#closeAll").on("click", function () {
			deleteAllSelectedRefs();
		});
		$("#permalink").on("click", function () {
			getPermalink();
		});
		$("#plot").css("display", "inline");
		displayAxes(ref, xaxisEnabled, yaxesEnabled);
	}
	$("#tips").css("display", "none");
	if (Curves.colors.length==0) {
		let errorMsg = "The maximum number of curves is reached!";
		console.log(errorMsg);
		alert(errorMsg);
	} else {
		if (!Curves.selectedRefs.includes(ref.hash.id)) {
			let isCompatibleRef=false;
			let noiseTypeRef="", noiseTypePlot="";
			let contentsKeys = Object.keys(ref.contents);
			for (let c=0; c<contentsKeys.length && !isCompatibleRef; c++) {
				let plotKeys = Object.keys(PlotLayouts.x);
				for (let p=0; p<plotKeys.length && !isCompatibleRef; p++) {
					if (PlotLayouts.x[plotKeys[p]].enabled) {
						noiseTypePlot=plotKeys[p];
						if (plotKeys[p] == contentsKeys[c])
							isCompatibleRef=true;
					}
					if (plotKeys[p]==contentsKeys[c])
						noiseTypeRef=contentsKeys[c];
				}
			}
			if (!isCompatibleRef) {
				alert("Impossible to mix '"+noiseTypeRef+"' with '"+noiseTypePlot+"' noise, please remove the selected references before to try to re-add this reference.")
			} else {
				Curves.selectedRefs.push(ref.hash.id);
				if (colorId == -1)
					ref.metadata["color"] = Curves.colors.pop();
				else {
					let index=-1;
					for (let i=0; i<Curves.colors.length; i++) {
						if (Curves.colors[i].id == colorId) {
							index=i;
							break;
						}
					}
					if (index > -1)
						ref.metadata["color"] = Curves.colors.splice(index, 1)[0];
				}
				if (ref.metadata["color"]) {
					displaySelectedRefs(ref);
					if (!ref.metadata.hidden)
						ref.metadata.hidden = false;
					$("#scurve"+ref.hash.id).attr('id', "scurve"+ref.metadata["color"].id);
					updateAddButton(ref.hash.id, true);
					plotSelectedRefs();
					if (window.location.host == "aff3ct.github.io") {
						// track the click with Google Analytics
						ga('send', {
							hitType:       'event',
							eventCategory: 'BER/FER Comparator',
							eventAction:   'click',
							eventLabel:    decodeURIComponent(ref.filename)
						});
					}
				}
			}
		} else {
			let err="It is not allowed to add multiple times the same reference!";
			console.log(err);
			alert(err)
		}
	}
}

function deleteAllSelectedRefs() {
	let cpy = Array.from(Curves.selectedRefs);
	cpy.forEach(id => deleteSelectedRef(id));
}

function deleteSelectedRef(id) {
	var index = Curves.selectedRefs.indexOf(id);
	if (index > -1) {
		Curves.selectedRefs.splice(index, 1);
		$("#scurve"+Curves.db[id].metadata.color.id).remove();
		Curves.colors.push(Curves.db[id].metadata.color);
		delete Curves.db[id].metadata.color;
		delete Curves.db[id].metadata.hidden;
		updateAddButton(id, false);

		if (Curves.selectedRefs.length==0) {
			$("#sbuttons").empty();
			$("#plot").css("display", "none"  );
			$("#tips").css("display", "inline");
			removeAxes();
		}
		else
			plotSelectedRefs();
	}
}

function showPlotRef(id) {
	if (Curves.db[id].metadata.color && Curves.db[id].metadata.hidden == true)
	{
		Curves.db[id].metadata.hidden = false;
		plotSelectedRefs();

		let cid = Curves.db[id].metadata.color.id;
		$("#scurve"+cid).fadeTo("fast", 1);
		$("#show"+id).remove();
		let hideTemplate = $('#hideTemplate').html();
		Mustache.parse(hideTemplate);
		let hideRendered=Mustache.render(hideTemplate, Curves.db[id]);
		$("#delete"+id).after(hideRendered);
		$("#hide"+id).on("click", function () {
			hidePlotRef(id);
		});
	}
}

function hidePlotRef(id) {
	if (Curves.db[id].metadata.color && Curves.db[id].metadata.hidden == false) {
		Curves.db[id].metadata.hidden = true;
		plotSelectedRefs();

		let cid = Curves.db[id].metadata.color.id;
		$("#scurve"+cid).fadeTo("slow", 0.33);
		$("#hide"+id).remove();
		let showTemplate = $('#showTemplate').html();
		Mustache.parse(showTemplate);
		let showRendered=Mustache.render(showTemplate, Curves.db[id]);
		$("#delete"+id).after(showRendered);
		$("#show"+id).on("click", function () {
			showPlotRef(id);
		});
	}
}

function loadFilesRecursive(fileInput, i=0) {
	if (i<fileInput.files.length) {
		let file = fileInput.files[i];
		if (file.type=="text/plain") {
			$("#fileDisplayArea").empty();
			let reader = new FileReader();
			reader.readAsText(file);
			reader.onloadend = function(e) {
				let ref=text2json(reader.result, file.name);
				if (typeof(ref.contents)!=="undefined") {
					let id=ref.hash.value.substring(0,7);
					if (typeof(Curves.db[id])==="undefined") {
						Curves.db[id]=ref;
						precomputeData(id);
						displaySelectors();
					}
					else
						console.log("The reference already exists in the database (id='"+id+"').");
					addSelectedRef(Curves.db[id]);
				} else {
					$("#fileDisplayArea").html('<br><span class="alert alert-danger" role="alert">Incompatible file format!</span>');
				}
				loadFilesRecursive(fileInput, i+1);
			};
		} else {
			$("#fileDisplayArea").html('<br><span class="alert alert-danger" role="alert">File not supported!</span>');
			loadFilesRecursive(fileInput, i+1);
		}
	}
}

function filterByGeneric(ids, selector) {
	let spath = selector.path.split("/");
	let p=[];
	if (selector.selection.length!=0 && ids.length!=0) {
		ids.forEach(function(id) {
			selector.selection.forEach(function(value) {
				if (typeof(Curves.db[id][spath[0]])!=="undefined" &&
				    typeof(Curves.db[id][spath[0]][spath[1]])!=="undefined" &&
				    typeof(Curves.db[id][spath[0]][spath[1]][spath[2]])!=="undefined" &&
				    Curves.db[id][spath[0]][spath[1]][spath[2]]==value) {
					p.push(id);
				}
			});
		});
		return p;
	}
	else
		return ids;
}

function filterByCodeTypes(ids) {
	return filterByGeneric(ids, Curves.selectors.codeType);
}

function filterByFrameSizes(ids) {
	return filterByGeneric(ids, Curves.selectors.frameSize);
}

function filterByModems(ids) {
	return filterByGeneric(ids, Curves.selectors.modemType);
}

function filterByChannels(ids) {
	return filterByGeneric(ids, Curves.selectors.channelType);
}

function filterByCodeRates(ids) {
	let p=[];
	let codeRateRange=$('#codeRate')[0].noUiSlider.get();
	let codeRateMin = codeRateRange[0];
	let codeRateMax = codeRateRange[1];
	if (codeRateMin==0 && codeRateMax==1)
		return ids;
	else {
		ids.forEach(function(id) {
			if (typeof(Curves.db[id]["headers"])!=="undefined" &&
			    typeof(Curves.db[id]["headers"]["Codec"])!=="undefined" &&
			    typeof(Curves.db[id]["headers"]["Codec"]["Code rate"])!=="undefined" &&
			    codeRateMin<=Curves.db[id]["headers"]["Codec"]["Code rate"] &&
			    codeRateMax>=Curves.db[id]["headers"]["Codec"]["Code rate"]) {
				p.push(id);
			}
		});
		return p;
	}
}

function filters(ids, type="") {
	switch(type) {
		case "codeType"   : return filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(ids))));
		case "frameSize"  : return filterByCodeTypes(filterByCodeRates(filterByModems(filterByChannels(ids))));
		case "modemType"  : return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByChannels(ids))));
		case "channelType": return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(ids))));
		case "codeRate"   : return filterByCodeTypes(filterByFrameSizes(filterByChannels(filterByModems(ids))));
		default:
			return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(ids)))));
	}
}

function updateSelected(val, selectionList, selectorName) {
	if ($("#"+val).is(":checked")) {
		selectionList.push(val);
	} else {
		selectionList.splice(selectionList.indexOf(val), 1);
	}
	displaySelectors(selectionList.length ? selectorName : "");
}

function displaySelector(selectorName, showZeros=false) {
	let selector = Curves.selectors[selectorName];
	let spath = selector.path.split("/");
	let filteredRefs=filters(Object.keys(Curves.db), selectorName);
	let refsCounter={};
	if (showZeros) {
		Object.keys(Curves.db).forEach(function(id) {
			if (typeof(Curves.db[id][spath[0]])!=="undefined" &&
			    typeof(Curves.db[id][spath[0]][spath[1]])!=="undefined" &&
			    typeof(Curves.db[id][spath[0]][spath[1]][spath[2]])!=="undefined") {
				let key = Curves.db[id][spath[0]][spath[1]][spath[2]];
				if (!refsCounter[key])
					refsCounter[key] = 0;
				filteredRefs.forEach(function(fid) {
					if (id == fid)
						refsCounter[key]++;
				});
			}
		});
	} else {
		filteredRefs.forEach(function(fid) {
			if (typeof(Curves.db[fid][spath[0]])!=="undefined" &&
			    typeof(Curves.db[fid][spath[0]][spath[1]])!=="undefined" &&
			    typeof(Curves.db[fid][spath[0]][spath[1]][spath[2]])!=="undefined") {
				let key=Curves.db[fid][spath[0]][spath[1]][spath[2]];
				if (!refsCounter[key])
					refsCounter[key] = 0;
				refsCounter[key]++;
			}
		});
	}
	$("#"+selectorName).empty();
	let entries=[];
	for (let key in refsCounter){
		let entry={};
		entry["name"] = key;
		entry["divId"] = key;
		entry["isNumber"] = true;
		let number=refsCounter[key];
		entry["number"] = number;
		if (showZeros && !number && !(selector.selection.indexOf(key)>-1))
			entry["disabled"] = "disabled";
		$('#'+key).on('click', function() {
			updateSelected(key, selector.selection, selectorName);
		});
		if (Tooltips[key])
			entry["desc"] = Tooltips[key];
		entries.push(entry);
	}
	let selectorTemplate = $('#selectorTemplate').html();
	Mustache.parse(selectorTemplate);
	let selectorRendered=Mustache.render(selectorTemplate, {entries: entries});
	$("#"+selectorName).empty();
	$("#"+selectorName).append(selectorRendered);
	$('[data-toggle="tooltip"]').tooltip();
	entries.forEach(function(entry){
		$("#"+entry.name).on("click", function () {
			updateSelected(entry.name, selector.selection, selectorName);
		});
	});
	$("#"+selectorName).off();
	selector.selection.forEach(function(x) {
		if ($("#"+x)) {
			if (!$("#"+x).prop('disabled'))
				$("#"+x).prop('checked', true);
			else
				$("#"+x).prop('checked', false);
		}
	});
}

function displaySelectors(except="") {
	Object.keys(Curves.selectors).forEach(function(selectorName) {
		let showZeros = selectorName == "codeType" ? true : false;
		if (except != selectorName)
			displaySelector(selectorName, showZeros);
	});
}

function displayRefsFromURI() {
	let xaxis=findGetParameter("xaxis");
	let xaxisEnabled=xaxis?decodeURIComponent(xaxis):"";
	let yaxes=findGetParameter("yaxes");
	let yaxesEnabled=yaxes?decodeURIComponent(yaxes).split(','):[];
	let nColors=Curves.colors.length;
	for (let colorId=0; colorId<nColors; colorId++) {
		let id=findGetParameter("curve"+colorId);
		let hidden=findGetParameter("hidden"+colorId);
		if (id) {
			if (Curves.db[id]) {
				Curves.db[id].metadata.hidden=hidden?true:false;
				addSelectedRef(Curves.db[id], colorId, xaxisEnabled, yaxesEnabled);
			} else {
				// this is very important to make the copy because the 'CDB.get' call is asynchronous
				let cid=colorId;
				// get a document from the server
				CDB.get(id).then(function (ref) {
					console.log("PouchDB: get success");
					Curves.db[id]=ref;
					Curves.db[id].metadata.hidden=hidden?true:false;
					precomputeData(id);
					displaySelectors();
					addSelectedRef(ref, cid, xaxisEnabled, yaxesEnabled);
				}).catch(function (err) {
					console.log("PouchDB: get fail");
					console.log(err);
				});
			}
		}
	}
	// remove get parameter from the URI
	if (window.history) {
		let url=window.location.host;
		let uri="/comparator.html";
		if (url!="")
			window.history.replaceState({}, url, uri);
	}
}

// main
$(document).ready(function() {
	let d3 = Plotly.d3;
	Plot = d3.select("#plot")
	.append('div')
	.style({
		'width': '100%',
		'height': '100%',
		'margin': '0px 0px 0px 0px',
	}).node();
	loadDatabase();
	$('#applySelections').on('click', function() {
		displayRefsList(filters(Object.keys(Curves.db)));
	});
	$("#fileInput").on('change', function() {
		loadFilesRecursive(fileInput);
	});
	$(window).resize(function() {
		Plotly.Plots.resize(Plot);
	});
});