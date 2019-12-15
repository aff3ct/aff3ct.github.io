const GITLAB="https://gitlab.com/api/v4/projects/10354484/";
const BRANCH="development";

// connexion to the CouchDB server (this code do not connect to the CouchDB until the first usage)
const ServerCDB = "https://panoramix.potionmagic.eu:5985";
const NameCDB = "aff3ct_refs";
var CDB = new PouchDB(ServerCDB+'/'+NameCDB);

var Global = {
	refs: {}, // contains all the references indexed by id/hash (GitLab, Kaiserslautern, CouchDB & local)
	selectors: {
		dataBase:    { showZeros: true,  path: "metadata.source"             , selection: ["AFF3CT"] },
		codeType:    { showZeros: true,  path: "headers.Codec.Type"          , selection: [        ] },
		frameSize:   { showZeros: false, path: "headers.Codec.Frame size (N)", selection: [        ] },
		modemType:   { showZeros: false, path: "headers.Modem.Type"          , selection: [        ] },
		channelType: { showZeros: false, path: "headers.Channel.Type"        , selection: [        ] }
	},
	selectedIds: [], // the ids of the references that have been selected to be displayed
	filteredValueIds: [], // the ids of the reference filtered by the search bar
	plot: {
		div: {}, // the Plotly div of the plot window
		colors: [{id: 9, value: '#17becf'}, // list of the supported colors, also define the max. num. of displayed curves
		         {id: 8, value: '#bcbd22'},
		         {id: 7, value: '#7f7f7f'},
		         {id: 6, value: '#e377c2'},
		         {id: 5, value: '#8c564b'},
		         {id: 4, value: '#9467bd'},
		         {id: 3, value: '#d62728'},
		         {id: 2, value: '#2ca02c'},
		         {id: 1, value: '#ff7f0e'},
		         {id: 0, value: '#1f77b4'}],
		layouts: { // the different supported layouts
			common: {
				showlegend:false,
				margin: { l: 100, r: 40, b: 40, t: 40, pad: 4 },
				hovermode: 'x',
				xaxis: { autorange: true },
				yaxis: { autorange: true },
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
					yaxis: { title: 'Bit Error Rate (BER)', type: 'log', hoverformat: '.2e' },
					compatible: ["FER"],
					default: true,
					enabled: false,
					divId: "BER",
				},
				"FER": {
					yaxis: { title: 'Frame Error Rate (FER)', type: 'log', hoverformat: '.2e' },
					compatible: ["BER"],
					default: true,
					enabled: false,
					divId: "FER",
				},
				"FRA": {
					yaxis: { title: 'Simulated Frames', type: 'log' },
					default: false,
					enabled: false,
					divId: "FRA",
				},
				"FE": {
					yaxis: { title: 'Number of Frame Errors (FE)' },
					default: false,
					enabled: false,
					divId: "FE",
				},
				"BE": {
					yaxis: { title: 'Number of Bit Errors (BE)' },
					default: false,
					enabled: false,
					divId: "BE",
				},
				"BE/FE": {
					yaxis: { title: 'Bit Errors on Frame Errors Ratio (BE/FE)' },
					default: false,
					enabled: false,
					divId: "BEFE",
				},
				"SIM_THR": {
					yaxis: { title: 'Simulation Throughput (Mb/s)' },
					default: false,
					enabled: false,
					alt: "THR",
					divId: "THR",
				},
				"ET/RT": {
					yaxis: { title: 'Elapsed Time (sec)', type: 'log' },
					default: false,
					enabled: false,
					alt: "TIME",
					divId: "TIME",
				},
			},
		},
	},
};

function precomputeData(id) {
	let ref = Global.refs[id];
	ref["hash"]["id"] = id;
	if (!ref.metadata)
		ref.metadata={};
	if (ref.metadata.source)
		ref.metadata[ref.metadata.source.toLowerCase()] = true;
	if (!ref.metadata.title) {
		if (ref.headers && ref.headers.Codec &&
			ref.headers.Codec["Type"] && ref.headers.Codec["Frame size (N)"] && ref.headers.Codec["Info. bits (K)"]) {
			let codeType = ref.headers.Codec["Type"];
			let N = ref.headers.Codec["Frame size (N)"];
			let K = ref.headers.Codec["Info. bits (K)"];
			ref["metadata"]["title"] = codeType+" ("+N+","+K+")";
		}
	}
	if (ref.metadata) {
		if (ref.metadata.title) {
			let res = ref.metadata.title.match(/([a-z0-9A-Z.\-,\/=\s;\+:]+\ \([0-9,]+\))([a-z0-9A-Z.\-,\/=\s;\+:()]+)/);
			let bigtitle=(res && res.length>=2)?$.trim(res[1]):ref.metadata.title;
			let subtitle=(res && res.length>=3)?$.trim(res[2]):"";
			ref["metadata"]["bigtitle"] = bigtitle;
			ref["metadata"]["subtitle"] = subtitle;

			let maxBigTitleSize=20;
			if (bigtitle.length > maxBigTitleSize)
				ref["metadata"]["shortbigtitle"]=bigtitle.substring(0,maxBigTitleSize-3)+"...";
		}
		if (ref.metadata.command) {
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
	if (!ref.metadata || !ref.metadata.title || ref.metadata.title=="Undefined") {
		let subtt = ref.filename ? ref.filename : "";
		$.extend(ref["metadata"], {title: "Undefined", bigtitle: "Undefined", subtitle: subtt});
	}
	if (ref.headers && !ref.headers.list) {
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
	if (ref.contents && ref.contents.BE && ref.contents.FE && !ref.contents["BE/FE"]) {
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
	let AFF3CTdatabaseURL = GITLAB+"jobs/artifacts/"+BRANCH+"/raw/database.json?job=deploy-database-json";
	$.ajax(AFF3CTdatabaseURL,
		{error:function(xhr,status,error) {
			logger("**Error loading \"" + AFF3CTdatabaseURL + "\"\n"+status+" "+error);
		},
		xhr: function (){
			let xhr = new window.XMLHttpRequest();
			xhr.addEventListener("progress", function (evt) {
				let evt_total;
				if (evt.lengthComputable) evt_total = evt.total;
				else evt_total = EVT_TOTAL;
				if (evt_total<evt.loaded) evt_total=evt.loaded*101/100;
				let percentComplete = Math.round((evt.loaded / evt_total) * 100);
				$("#loader .progress-bar").html(percentComplete+"%");
				$('#loader .progress-bar').attr('aria-valuenow', percentComplete).css('width',percentComplete+"%");
			}, false);
			return xhr;
		}
	}).done(function(database) {
		Global.refs = database;
		$.ajaxSetup({
			isLocal:true
		});
		let KLdatabaseURL="resources/comparator/kldb.json";
		$.ajax(KLdatabaseURL,
			{error:function(xhr,status,error) {
				logger("**Error loading \"" + KLdatabaseURL + "\"\n"+status+" "+error);
			}
		}).done(function(database) {
			$.extend(Global.refs, database);
			Object.keys(Global.refs).forEach(function(key) {
				precomputeData(key);
			});
			Global.filteredValueIds=filterByValue(Object.keys(Global.refs));
			displaySlider();
			displaySelectors();
			$('#searchValue').on('blur',function () {
				Global.filteredValueIds=filterByValue(Object.keys(Global.refs));
				displaySelectors();
			});
			$('#searchValue').keyup(function(e){
				if(e.keyCode == 13) { // enter pressed
					Global.filteredValueIds=filterByValue(Object.keys(Global.refs));
					displayRefsList();
				}
			});
			$("#loader"    ).css("display", "none" );
			$("#preview"   ).css("display", "block");
			$("#comparator").css("display", "block");
			displayRefsFromURI();
			displayRefsList();
		});
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
		$("#copyClipboardCmd"+ref.hash.id).on("click", function() {
			let copyText = $("#commandInput"+ref.hash.id)[0]; // get the text field
			copyText.type = 'text';
			copyText.select(); // select the text field
			document.execCommand("copy"); // copy the text inside the text field
			copyText.type = 'hidden';
			$("#copyClipboardCmd"+ref.hash.id+" i").removeClass("fa-clipboard").addClass("fa-clipboard-check");
		});
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

function displayRefsList() {
	let ids = filters(Global.filteredValueIds);
	// sort refs by title (lexicographical order)
	ids.sort(function(a,b) {
		return Global.refs[a].metadata.title.localeCompare(Global.refs[b].metadata.title);
	});
	$("#refsList #accordion").empty();
	ids.forEach(function(id) {
		let ref=Global.refs[id];

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

function displaySelectedRefs(ref, inplace=false) {
	let refSelectedTemplate = $('#refSelectedTemplate').html();
	Mustache.parse(refSelectedTemplate);
	let refSelectedRendered=Mustache.render(refSelectedTemplate, ref);
	if (inplace && ref.metadata && ref.metadata.color)
		$("#scurve"+ref.metadata.color.id).replaceWith(refSelectedRendered);
	else
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

	if (ref.metadata && ref.metadata.command) {
		$("#sdisplayCmdModal"+ref.hash.id).on("click", function () {
			displayCommandModal(ref);
		});
	}
	if (ref.trace) {
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
	if (inplace && ref.metadata && ref.metadata.color)
		$("#scurve"+ref.hash.id).attr('id', "scurve"+ref.metadata.color.id);
	$('[data-toggle="tooltip"]').tooltip();
}

function updateAddButton(id, bool) {
	$("#curve"+id).removeClass(bool?"btn-primary":"btn-danger").addClass(bool?"btn-danger":"btn-primary");
	$("#curve"+id+" i").removeClass(bool?"fa-plus":"fa-minus").addClass(bool?"fa-minus":"fa-plus");
}

function plotSelectedRefs() {
	let colorsList=[];
	Global.selectedIds.forEach(function(id) {
		if (!Global.refs[id].metadata.hidden || Global.refs[id].metadata.hidden == false)
			colorsList.push(Global.refs[id].metadata.color.value);
	});

	let layoutCommon = $.extend({}, Global.plot.layouts.common);
	let xaxis = "";
	Object.keys(Global.plot.layouts.x).forEach(function(key) {
		if (Global.plot.layouts.x[key].enabled) {
			$.extend(layoutCommon.xaxis, Global.plot.layouts.x[key].xaxis);
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
	Object.keys(Global.plot.layouts.y).forEach(function(key) {
		if (Global.plot.layouts.y[key].enabled) {
			$.extend(layout.yaxis, Global.plot.layouts.y[key].yaxis);
			titles.push(Global.plot.layouts.y[key].yaxis.title);
			yaxis = key;
			let cid = 0;
			let tmpColorsList=Array.from(colorsList);
			Global.selectedIds.forEach(function(id) {
				if (((!Global.refs[id].metadata.hidden) || Global.refs[id].metadata.hidden == false)) {
					if (Global.refs[id].contents[xaxis] && Global.refs[id].contents[yaxis]) {
						data.push({
							x: Global.refs[id].contents[xaxis],
							y: Global.refs[id].contents[yaxis],
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
	Plotly.newPlot(Global.plot.div, data, layout, { displayModeBar: true, displaylogo: false });
	Global.plot.div.on('plotly_relayout',
		function(eventdata){
			let change=false;
			if (eventdata['xaxis.range[0]'] && eventdata['xaxis.range[1]']) {
				Global.plot.layouts.common.xaxis.autorange=false;
				$.extend(Global.plot.layouts.common.xaxis, { range: eventdata['xaxis.range'] });
				change=true;
			}
			if (eventdata['xaxis.autorange']) {
				Global.plot.layouts.common.xaxis.autorange=true;
				change=true;
			}
			if (eventdata['yaxis.range[0]'] && eventdata['yaxis.range[1]']) {
				Global.plot.layouts.common.yaxis.autorange=false;
				$.extend(Global.plot.layouts.common.yaxis, { range: eventdata['yaxis.range'] });
				change=true;
			}
			if (eventdata['yaxis.autorange']) {
				Global.plot.layouts.common.yaxis.autorange=true;
				change=true;
			}
			if (change)
				updateURI();
	});
	updateURI();
}

function cleanURI() {
	// remove get parameter from the URI
	if (window.history) {
		let url=window.location.host;
		let uri="/comparator.html";
		if (url!="")
			window.history.replaceState({}, url, uri);
	}
}

function generateURI(local=true) {
	let uri="?";
	let isFirst=true;
	Global.selectedIds.forEach(function(id) {
		let ref=Global.refs[id];
		if (local || ref.metadata.source!="Local") {
			uri+=(isFirst?"":"&")+"curve"+ref.metadata.color.id+"="+ref.hash.id+(ref.metadata.hidden?"&hidden"+ref.metadata.color.id:"");
			isFirst=false;
		}
	});
	uri+=(isFirst?"":"&")+"xaxis=";
	isFirst=true;
	Object.keys(Global.plot.layouts.x).forEach(function(x) {
		if (Global.plot.layouts.x[x].enabled) {
			uri+=encodeURIComponent((isFirst?"":",")+x);
			isFirst=false;
		}
	});
	uri+="&yaxes=";
	isFirst=true;
	Object.keys(Global.plot.layouts.y).forEach(function(y) {
		if (Global.plot.layouts.y[y].enabled) {
			uri+=encodeURIComponent((isFirst?"":",")+y);
			isFirst=false;
		}
	});
	if (!Global.plot.layouts.common.xaxis.autorange) {
		let x0=Global.plot.layouts.common.xaxis.range[0].toString();
		let x1=Global.plot.layouts.common.xaxis.range[1].toString();
		uri+="&xrange="+encodeURIComponent(x0)+","+encodeURIComponent(x1);
	}
	if (!Global.plot.layouts.common.yaxis.autorange) {
		let y0=Global.plot.layouts.common.yaxis.range[0].toString();
		let y1=Global.plot.layouts.common.yaxis.range[1].toString();
		uri+="&yrange="+encodeURIComponent(y0)+","+encodeURIComponent(y1);
	}
	return uri;
}

function updateURI() {
	if (window.history) {
		let url=window.location.host;
		let local = false;
		let uri="/comparator.html"+generateURI(local);
		if (url!="")
			window.history.replaceState({}, url, uri);
	}
}

function showPermalinkModal() {
	$("#permalinkModal").empty();
	let url=window.location.origin;
	if (url=="null")
		url="http://aff3ct.github.io";
	let local = false;
	let permalink=url+"/comparator.html"+generateURI(local);
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

function getPermalink() {
	let transactions=[];
	Global.selectedIds.forEach(function(id) {
		if (Global.refs[id].metadata.source=="Local")
			transactions.push(Global.refs[id]);
	});
	let transactionsCounter=0;
	transactions.forEach(function(ref) {
		let id=ref.hash.id;
		ref.metadata.hidden=ref.metadata.hidden?true:false;
		let hidden=ref.metadata.hidden;
		ref.metadata.source="CouchDB";
		delete ref.metadata.local;
		ref.metadata["couchdb"]=true;
		ref.metadata.hidden=false;
		// try to get the document from the server
		CDB.get(id).then(function (doc) {
			console.log("PouchDB: document '"+id+"' already exists.");
			displaySelectors();
			ref.metadata.hidden=hidden;
			updateURI();
			displaySelectedRefs(ref, true);
			if (++transactionsCounter==transactions.length) showPermalinkModal();
		}).catch(function (err) {
			// put a document on the CouchDB server
			CDB.put(
				$.extend({_id: id}, ref)
			).then(function (response) {
				console.log("PouchDB: put success");
				console.log(response);
				displaySelectors();
				ref.metadata.hidden=hidden;
				updateURI();
				displaySelectedRefs(ref, true);
				if (++transactionsCounter==transactions.length) showPermalinkModal();
			}).catch(function (err) {
				console.log("PouchDB: put fail");
				console.log(err);
				ref.metadata.hidden=hidden;
				delete ref.metadata.couchdb;
				ref.metadata.source="Local";
				ref.metadata["local"]=true;
				if (++transactionsCounter==transactions.length) showPermalinkModal();
			});
		});
	});
	if (transactions.length==0) showPermalinkModal();
}

function removeAxes() {
	Object.keys(Global.plot.layouts.x).forEach(function(key) {
		Global.plot.layouts.x[key].enabled=false;
	});
	Object.keys(Global.plot.layouts.y).forEach(function(key) {
		Global.plot.layouts.y[key].enabled=false;
	});
	$('#xaxis').empty();
	$('#yaxis').empty();
	$('#axes').hide();
}

function updateAxesCheckboxes(divId, key, axis) {
	let except=[];
	if (Global.plot.layouts[axis][key].compatible)
		except=Global.plot.layouts[axis][key].compatible;
	let nCheck=0;
	Object.keys(Global.plot.layouts[axis]).forEach(function(lkey) {
		if (Global.plot.layouts[axis][lkey].enabled)
			nCheck++;
	});
	if (nCheck == 1 && !$('#'+divId).prop('checked')) {
		$('#'+divId).prop('checked', true);
	} else {
		if (!$('#'+divId).prop('checked')) {
			Global.plot.layouts[axis][key].enabled = false;
		} else {
			Object.keys(Global.plot.layouts[axis]).forEach(function(lkey) {
				if (!except.includes(lkey) && lkey!=key) {
					Global.plot.layouts[axis][lkey].enabled = false;
					$('#'+Global.plot.layouts[axis][lkey].divId).prop('checked', false);
				}
			});
			Global.plot.layouts[axis][key].enabled = true;
		}
		plotSelectedRefs();
	}
}

function displayAxes(ref, xaxisEnabled="", yaxesEnabled=[]) {
	let xaxes=[];
	let yaxes=[];

	Object.keys(ref.contents).forEach(function(keyRef) {
		Object.keys(Global.plot.layouts.x).forEach(function(keyPlot) {
			if (keyRef==keyPlot) {
				let name=Global.plot.layouts.x[keyPlot].alt?Global.plot.layouts.x[keyPlot].alt:keyPlot;
				let xaxis = {divId: Global.plot.layouts.x[keyPlot].divId, key: keyPlot, name: name, desc: Global.plot.layouts.x[keyPlot].xaxis.title};
				if ((Global.plot.layouts.x[keyPlot].default && xaxisEnabled=="") || xaxisEnabled==keyPlot) {
					Global.plot.layouts.x[keyPlot].enabled=true;
					xaxis["checked"]="checked";
				} else {
					xaxis["checked"]="";
				}
				xaxes.push(xaxis);
			}
		});
		Object.keys(Global.plot.layouts.y).forEach(function(keyPlot) {
			if (keyRef==keyPlot) {
				let name=Global.plot.layouts.y[keyPlot].alt?Global.plot.layouts.y[keyPlot].alt:keyPlot;
				let yaxis = {divId: Global.plot.layouts.y[keyPlot].divId, key: keyPlot, name: name, desc: Global.plot.layouts.y[keyPlot].yaxis.title};
				if ((Global.plot.layouts.y[keyPlot].default && !yaxesEnabled.length) || yaxesEnabled.includes(keyPlot)) {
					Global.plot.layouts.y[keyPlot].enabled=true;
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
	if (Global.selectedIds.length==0) {
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
		$("#preview").css("display", "none" );
		$("#curves" ).css("display", "block");
		$("#scurve" ).css("display", "block");
	}
	if (Global.plot.colors.length==0) {
		let errorMsg = "The maximum number of curves is reached!";
		console.log(errorMsg);
		alert(errorMsg);
	} else {
		if (!Global.selectedIds.includes(ref.hash.id)) {
			let isCompatibleRef=false;
			let noiseTypeRef="", noiseTypePlot="";
			let contentsKeys = Object.keys(ref.contents);
			for (let c=0; c<contentsKeys.length && !isCompatibleRef; c++) {
				let plotKeys = Object.keys(Global.plot.layouts.x);
				for (let p=0; p<plotKeys.length && !isCompatibleRef; p++) {
					if (Global.plot.layouts.x[plotKeys[p]].enabled) {
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
				Global.selectedIds.push(ref.hash.id);
				if (colorId == -1)
					ref.metadata["color"] = Global.plot.colors.pop();
				else {
					let index=-1;
					for (let i=0; i<Global.plot.colors.length; i++) {
						if (Global.plot.colors[i].id == colorId) {
							index=i;
							break;
						}
					}
					if (index > -1)
						ref.metadata["color"] = Global.plot.colors.splice(index, 1)[0];
				}
				if (ref.metadata["color"]) {
					displaySelectedRefs(ref);
					if (!ref.metadata.hidden)
						ref.metadata.hidden = false;
					$("#scurve"+ref.hash.id).attr('id', "scurve"+ref.metadata.color.id);
					updateAddButton(ref.hash.id, true);
					plotSelectedRefs();
					if (window.location.host == "aff3ct.github.io") {
						// track the click with Google Analytics
						ga('send', {
							hitType:       'event',
							eventCategory: 'BER/FER Comparator',
							eventAction:   'click',
							eventLabel:    ref.hash.id + " - " + ref.metadata.source + " - " + ref.filename
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
	let cpy = Array.from(Global.selectedIds);
	cpy.forEach(id => deleteSelectedRef(id));
}

function deleteSelectedRef(id) {
	var index = Global.selectedIds.indexOf(id);
	if (index > -1) {
		Global.selectedIds.splice(index, 1);
		$("#scurve"+Global.refs[id].metadata.color.id).remove();
		Global.plot.colors.push(Global.refs[id].metadata.color);
		delete Global.refs[id].metadata.color;
		delete Global.refs[id].metadata.hidden;
		updateAddButton(id, false);

		if (Global.selectedIds.length==0) {
			$("#sbuttons").empty();
			$("#preview").css("display", "block");
			$("#curves" ).css("display", "none" );
			$("#scurve" ).css("display", "none" );
			removeAxes();
			cleanURI();
			Global.plot.layouts.common.xaxis.autorange=true;
			Global.plot.layouts.common.yaxis.autorange=true;
		}
		else
			plotSelectedRefs();
	}
}

function showPlotRef(id) {
	if (Global.refs[id].metadata.color && Global.refs[id].metadata.hidden == true) {
		Global.refs[id].metadata.hidden = false;
		plotSelectedRefs();
		let cid = Global.refs[id].metadata.color.id;
		$("#scurve"+cid).fadeTo("fast", 1);
		$("#show"+id).remove();
		let hideTemplate = $('#hideTemplate').html();
		Mustache.parse(hideTemplate);
		let hideRendered=Mustache.render(hideTemplate, Global.refs[id]);
		$("#delete"+id).after(hideRendered);
		$("#hide"+id).on("click", function () {
			hidePlotRef(id);
		});
	}
}

function hidePlotRef(id) {
	if (Global.refs[id].metadata.color && Global.refs[id].metadata.hidden == false) {
		Global.refs[id].metadata.hidden = true;
		plotSelectedRefs();
		let cid = Global.refs[id].metadata.color.id;
		$("#scurve"+cid).fadeTo("slow", 0.33);
		$("#hide"+id).remove();
		let showTemplate = $('#showTemplate').html();
		Mustache.parse(showTemplate);
		let showRendered=Mustache.render(showTemplate, Global.refs[id]);
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
				if (ref.contents) {
					let id=ref.hash.value.substring(0,7);
					if (!Global.refs[id]) {
						Global.refs[id]=ref;
						precomputeData(id);
						Global.filteredValueIds=filterByValue(Object.keys(Global.refs));
						displaySelectors();
					}
					else
						console.log("The reference already exists in the database (id='"+id+"').");
					addSelectedRef(Global.refs[id]);
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
	let p=[];
	if (selector.selection.length!=0 && ids.length!=0) {
		ids.forEach(function(id) {
			selector.selection.forEach(function(value) {
				if (deepFind(Global.refs[id],selector.path)==value) {
					p.push(id);
				}
			});
		});
		return p;
	}
	else
		return ids;
}

function filterByDatabase(ids) {
	return filterByGeneric(ids, Global.selectors.dataBase);
}

function filterByCodeTypes(ids) {
	return filterByGeneric(ids, Global.selectors.codeType);
}

function filterByFrameSizes(ids) {
	return filterByGeneric(ids, Global.selectors.frameSize);
}

function filterByModems(ids) {
	return filterByGeneric(ids, Global.selectors.modemType);
}

function filterByChannels(ids) {
	return filterByGeneric(ids, Global.selectors.channelType);
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
			if (Global.refs[id].headers && Global.refs[id].headers.Codec && Global.refs[id].headers.Codec["Code rate"] &&
			    codeRateMin<=Global.refs[id].headers.Codec["Code rate"] &&
			    codeRateMax>=Global.refs[id].headers.Codec["Code rate"]) {
				p.push(id);
			}
		});
		return p;
	}
}

function searchIfValuesInObject(values, obj) {
	let objKeys = Object.keys(obj);
	for (let k=0; k<objKeys.length; k++) {
		for (let v=0; v<values.length; v++) {
			if (objKeys[k].toLowerCase().includes(values[v]))
				values.splice(v--, 1);
		}
		if (!values.length)
			return true;
	}
	for (let k=0; k<objKeys.length; k++) {
		let objVal = obj[objKeys[k]];
		if (typeof(objVal)=="object") {
			if (searchIfValuesInObject(values, objVal))
				return true;
		} else {
			for (let v=0; v<values.length; v++) {
				if (objVal.toString().toLowerCase().includes(values[v]))
					values.splice(v--, 1);
			}
			if (!values.length)
				return true;
		}
	}
	return false;
}

function filterByValue(ids) {
	let value=$("#searchValue").val();
	let values=value.split(" ");
	let vals={};
	for (let v=0; v<values.length; v++) {
		values[v]=$.trim(values[v]).toLowerCase();
		if (values[v]=="") {
			values.splice(v--, 1);
		} else {
			vals[values[v]]="";
		}
	}
	if (!values.length)
		return ids;
	if (window.location.host == "aff3ct.github.io") {
		// track the search value with Google Analytics
		ga('send', {
			hitType:       'event',
			eventCategory: 'BER/FER Comparator',
			eventAction:   'search',
			eventLabel:    value
		});
	}
	let list=[];
	ids.forEach(function(id) {
		if (searchIfValuesInObject(Object.keys(vals), Global.refs[id]))
			list.push(id);
	})
	return list;
}

function filters(ids, type="") {
	switch(type) {
		case "dataBase"   : return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(ids)))));
		case "codeType"   : return filterByDatabase(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(ids)))));
		case "frameSize"  : return filterByDatabase(filterByCodeTypes(filterByCodeRates(filterByModems(filterByChannels(ids)))));
		case "modemType"  : return filterByDatabase(filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByChannels(ids)))));
		case "channelType": return filterByDatabase(filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(ids)))));
		default:
			return filterByDatabase(filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(ids))))));
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
	let selector = Global.selectors[selectorName];
	let filteredRefs=filters(Global.filteredValueIds, selectorName);
	let refsCounter={};
	if (showZeros) {
		Object.keys(Global.refs).forEach(function(id) {
			let key = deepFind(Global.refs[id], selector.path);
			if (key) {
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
			let key = deepFind(Global.refs[fid], selector.path);
			if (key) {
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
	Object.keys(Global.selectors).forEach(function(selectorName) {
		if (except != selectorName)
			displaySelector(selectorName, Global.selectors[selectorName].showZeros);
	});
}

function displayRefsFromURI() {
	let xrange=findGetParameter("xrange");
	if (xrange) {
		Global.plot.layouts.common.xaxis.autorange = false;
		let range=decodeURIComponent(xrange).split(',');
		$.extend(Global.plot.layouts.common.xaxis, {range: [parseFloat(range[0]), parseFloat(range[1])]});
	}
	let yrange=findGetParameter("yrange");
	if (yrange) {
		Global.plot.layouts.common.yaxis.autorange = false;
		let range=decodeURIComponent(yrange).split(',');
		$.extend(Global.plot.layouts.common.yaxis, {range: [parseFloat(range[0]), parseFloat(range[1])]});
	}
	let xaxis=findGetParameter("xaxis");
	let xaxisEnabled=xaxis?decodeURIComponent(xaxis):"";
	let yaxes=findGetParameter("yaxes");
	let yaxesEnabled=yaxes?decodeURIComponent(yaxes).split(','):[];
	let nColors=Global.plot.colors.length;
	let ids=[];
	for (let colorId=0; colorId<nColors; colorId++) {
		let id=findGetParameter("curve"+colorId);
		if (id)
			ids.push({id: id, colorId: colorId, hidden: findGetParameter("hidden"+colorId)?true:false});
	}
	ids.forEach(function(obj) {
		let id=obj.id;
		let colorId=obj.colorId;
		let hidden=obj.hidden;
		if (Global.refs[id]) {
			Global.refs[id].metadata.hidden=hidden?true:false;
			addSelectedRef(Global.refs[id], colorId, xaxisEnabled, yaxesEnabled);
		} else {
			// this is very important to make the copy because the 'CDB.get' call is asynchronous
			let cid=colorId;
			// get a document from the server
			CDB.get(id).then(function (ref) {
				console.log("PouchDB: get success");
				Global.refs[id]=ref;
				Global.refs[id].metadata.hidden=hidden?true:false;
				precomputeData(id);
				Global.filteredValueIds=filterByValue(Object.keys(Global.refs));
				displaySelectors();
				addSelectedRef(ref, cid, xaxisEnabled, yaxesEnabled);
			}).catch(function (err) {
				console.log("PouchDB: get fail");
				console.log(err);
			});
		}
	});
}

// main
$(document).ready(function() {
	let d3 = Plotly.d3;
	Global.plot.div = d3.select("#plot")
	.append('div')
	.style({
		'width': '100%',
		'height': '100%',
		'margin': '0px 0px 0px 0px',
	}).node();
	loadDatabase();
	$('#applySelections').on('click', function() {
		displayRefsList();
	});
	$("#fileInput").on('change', function() {
		loadFilesRecursive(fileInput);
	});
	$(window).resize(function() {
		Plotly.Plots.resize(Global.plot.div);
	});
});
