const GITLAB="https://gitlab.com/api/v4/projects/10354484/";
const BRANCH="development";

// connexion to the CouchDB server (this code do not connect to the CouchDB until the first usage)
const serverCDB = "https://couchdb-580e7b.smileupps.com";
const nameCDB = "aff3ct_refs";
var CDB = new PouchDB(serverCDB+'/'+nameCDB);

var Curves = {
	db: {},
	max: 10, // colors are defined for only 10 curves
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
	plots: ["ber","fer"],
	PLOTS: {ber: "BER", fer: "FER"},
	selectors: {
		codeType:    { selection: [], path: "headers/Codec/Type"           },
		frameSize:   { selection: [], path: "headers/Codec/Frame size (N)" },
		modemType:   { selection: [], path: "headers/Modem/Type"           },
		channelType: { selection: [], path: "headers/Channel/Type"         }
	},
	selectedRefs: [],
};

const LT = {
	showlegend:false,
	xaxis:{ zeroline:false, hoverformat: '.e', title: 'Eb/N0 (dB)'},
	margin: { l: 100, r: 40, b: 40, t: 40, pad: 4 },
	hovermode: 'x',
};
const LAYOUT= {
	ber: $.extend({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Bit Error Rate (BER)'} },LT),
	fer: $.extend({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Frame Error Rate (FER)'}},LT),
};
var GD={};

function precomputeData(id) {
	let ref = Curves.db[id];
	ref["hash"]["id"] = id;
	if (typeof(ref.metadata)==="undefined" || typeof(ref.metadata.title)==="undefined") {
		if (typeof(ref.headers)!=="undefined" &&
			typeof(ref.headers.Codec)!=="undefined" &&
			typeof(ref.headers.Codec["Type"])!=="undefined" &&
			typeof(ref.headers.Codec["Frame size (N)"])!=="undefined" &&
			typeof(ref.headers.Codec["Info. bits (K)"])!=="undefined") {
			let codeType = ref.headers.Codec["Type"];
			let N = ref.headers.Codec["Frame size (N)"];
			let K = ref.headers.Codec["Info. bits (K)"];
			ref["metadata"] = {title: codeType+" ("+N+","+K+")"};
		}
	}
	if (typeof(ref.metadata)!=="undefined") {
		if (typeof(ref.metadata.title)!=="undefined") {
			let regex = /([a-z0-9A-Z.\-,\/=\s;\+:]+\([0-9,]+\))([a-z0-9A-Z.\-,\/=\s;\+:()]+)/g;
			let res = ref.metadata.title.match(regex);
			regex.test(ref.metadata.title);
			let bigtitle=(res)?$.trim(RegExp.$1):ref.metadata.title;
			let subtitle=(res)?$.trim(RegExp.$2):"";
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
		ref["metadata"] = {title: "Undefined Title", bigtitle: "Undefined Title", subtitle: ""};
	}
	if (typeof(ref.headers)!=="undefined") {
		ref["headers"]["list"] = [];
		ref["headers"]["list"].push({"name": "Frame size", "value" : ref.headers.Codec["Frame size (N)"]});
		if (ref.headers.Codec["Codeword size (N_cw)"] > ref.headers.Codec["Frame size (N)"])
			ref["headers"]["list"].push({"name": "Codeword", "value" : ref.headers.Codec["Codeword size (N_cw)"]});
		ref["headers"]["list"].push({"name": "Code rate", "value" : ref.headers.Codec["Code rate"]});
		for (let j in ref.headers) {
			if (ref.headers[j].Type) {
				let obj = {"name": j, "value" : ref.headers[j].Type};
				if (tooltips.get(ref.headers[j].Type))
					obj["tooltip"] = tooltips.get(ref.headers[j].Type);
				ref["headers"]["list"].push(obj);
			}
		}
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
		$("#selector"  ).css("display", "block");
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

function displayRefsList(refs) {
	// sort refs by title (lexicographical order)
	refs.sort(function(a,b) {
		return Curves.db[a].metadata.title.localeCompare(Curves.db[b].metadata.title);
	});
	$("#refsList #accordion").empty();
	refs.forEach(function(id) {
		let ref=Curves.db[id];

		let refTemplate = $('#refTemplate').html();
		Mustache.parse(refTemplate);
		let refRendered=Mustache.render(refTemplate, ref);
		$("#refsList #accordion").append(refRendered);

		let refBodyTemplate = $('#refBodyTemplate').html();
		Mustache.parse(refBodyTemplate);
		let refBodyRendered=Mustache.render(refBodyTemplate, $.extend({prefix: ""}, ref));
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
			addSelectedRef(ref);
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
	let refBodyRendered=Mustache.render(refBodyTemplate, $.extend({prefix: "s"}, ref));
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
	$("#hide"+ref.hash.id).on("click", function () {
		hidePlotRef(ref.hash.id);
	});

	$('[data-toggle="tooltip"]').tooltip();
}

function updateAddButton(id, bool) {
	$("#curve"+id).prop('disabled', bool);
	$("#curve"+id).empty();
	$("#curve"+id).append(bool?'<i class="fas fa-minus"></i>':'<i class="fas fa-plus"></i>');
}

function plotSelectedRefs() {
	let colorList=[];
	Curves.selectedRefs.forEach(function(id) {
		if (!Curves.db[id].hidden || Curves.db[id].hidden == false)
			colorList.push(Curves.db[id].color.value);
	});

	Curves.plots.forEach(function(x) {
		let data = [];
		Curves.selectedRefs.forEach(function(id) {
			if ((typeof(Curves.db[id].hidden)==="undefined") || Curves.db[id].hidden == false) {
				data.push({
					x: Curves.db[id].contents["Eb/N0"],
					y: Curves.db[id].contents[Curves.PLOTS[x]],
					type: 'scatter',
					name: Curves.db[id].metadata.bigtitle,
				});
			}
		});
		Plotly.newPlot(GD[x], data, $.extend(LAYOUT[x], {colorway: colorList}), {displaylogo:false});
	});
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
		if (ref.local) {
			ref.local=false;
			// put a document on the CouchDB server
			CDB.put(
				$.extend({_id: id}, ref)
			).then(function (response) {
				console.log("PouchDB: put success");
				console.log(response);
			}).catch(function (err) {
				console.log("PouchDB: put fail");
				console.log(err);
			});
		}
		permalink+=(isFirst?"":"&")+"curve"+ref.color.id+"="+ref.hash.id;
		isFirst=false;
	});
	let permalinkModalTemplate = $('#permalinkModalTemplate').html();
	Mustache.parse(permalinkModalTemplate);
	let permalinkModalRendered=Mustache.render(permalinkModalTemplate, {permalink: permalink});
	$("#permalinkModal").append(permalinkModalRendered);
	$('#permalinkInstModal').modal("show");
}

function addSelectedRef(ref, colorId=-1) {
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
		$("#plotber").css("display", "inline");
		$("#plotfer").css("display", "inline");
	}
	$("#tips").css("display", "none");
	$("#selector .bers .active").removeClass("active");
	$(this).addClass("active");
	if (Curves.selectedRefs.length==Curves.max) {
		let errorMsg = "The maximum number of curves is reached (max = "+Curves.max+")!";
		console.log(errorMsg);
		alert(errorMsg);
	} else {
		if (!Curves.selectedRefs.includes(ref.hash.id)) {
			Curves.selectedRefs.push(ref.hash.id);
			if (colorId == -1)
				ref["color"] = Curves.colors.pop();
			else {
				let index=-1;
				for (let i=0; i<Curves.colors.length; i++) {
					if (Curves.colors[i].id == colorId) {
						index=i;
						break;
					}
				}
				if (index > -1)
					ref["color"] = Curves.colors.splice(index, 1)[0];
			}
			if (ref["color"]) {
				displaySelectedRefs(ref);
				ref["hidden"] = false;
				$("#scurve"+ref.hash.id).attr('id', "scurve"+ref["color"].id);
				updateAddButton(ref.hash.id, true);
				plotSelectedRefs();
				// track the click with Google Analytics
				ga('send', {
					hitType:       'event',
					eventCategory: 'BER/FER Comparator',
					eventAction:   'click',
					eventLabel:    decodeURIComponent(ref.filename)
				});
			}
		} else {
			console.log("It is not allowed to add multiple times the same ref.");
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
		$("#scurve"+Curves.db[id].color.id).remove();
		Curves.colors.push(Curves.db[id].color);
		delete Curves.db[id].color;
		delete Curves.db[id].hidden;
		updateAddButton(id, false);

		if (Curves.selectedRefs.length==0) {
			$("#sbuttons").empty();
			$("#plotber").css("display", "none"  );
			$("#plotfer").css("display", "none"  );
			$("#tips"   ).css("display", "inline");
		}
		else
			plotSelectedRefs();
	}
}

function showPlotRef(id) {
	if (Curves.db[id].color && Curves.db[id].hidden == true)
	{
		Curves.db[id].hidden = false;
		plotSelectedRefs();

		let cid = Curves.db[id].color.id;
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
	if (Curves.db[id].color && Curves.db[id].hidden == false)
	{
		Curves.db[id].hidden = true;
		plotSelectedRefs();

		let cid = Curves.db[id].color.id;
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
			if (Curves.selectedRefs.length < Curves.max) {
				let reader = new FileReader();
				reader.readAsText(file);
				reader.onloadend = function(e) {
					let ref=text2json(reader.result, file.name);
					if (typeof(ref.contents)!=="undefined") {
						let id=ref.hash.value.substring(0,7);
						if (typeof(Curves.db[id])==="undefined") {
							ref["local"]=true;
							Curves.db[id]=ref;
							precomputeData(id);
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
				$("#fileDisplayArea").html('<br><span class="alert alert-danger" role="alert">Too many curves displayed!</span>');
			}
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

function displayCheckbox(length, font, endFont, disabled, selectionList, element, selectorName) {
	let checkboxTemplate = $('#checkboxTemplate').html();
	Mustache.parse(checkboxTemplate);
	let checkboxRendered=Mustache.render(checkboxTemplate, {
		element: element,
		disabled: disabled,
		startBlackFont: font,
		endBlackFont: endFont,
		length: length
	});
	$("#"+selectorName).append(checkboxRendered);
	$('#'+element).on('click', function() {
		updateSelected(element, selectionList, selectorName);
	});
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
	$("#"+selectorName).append('<ul>');
	for (let key in refsCounter){
		$("#"+selectorName).append('<li>');
		let number=refsCounter[key];
		let black='<font color="black">';
		let disabled='';
		let endBlack='</font>';
		if (showZeros) {
			if (number) {
				black='<font color="black">';
				endBlack='</font>';
			} else if (selector.selection.indexOf(key)>-1) {
				black='<font color="black">';
				endBlack='</font>';
			} else
				disabled='disabled';
		}
		displayCheckbox(number, black, endBlack, disabled, selector.selection, key, selectorName);
		$("#"+selectorName).append('</li>');
	}
	$("#"+selectorName).append('</ul>');
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
	let paramNames = [];
	for (let i = 0; i < Curves.max; i++)
		paramNames.push("curve"+i);
	let colorId = 0;
	paramNames.forEach(function(paramName) {
		let id=findGetParameter(paramName);
		if (id) {
			if (Curves.db[id])
				addSelectedRef(Curves.db[id], colorId);
			else {
				// this is very important to make the copy because the 'CDB.get' call is asynchronous
				let cid=colorId;
				// get a document from the server
				CDB.get(id).then(function (ref) {
					console.log("PouchDB: get success");
					Curves.db[id]=ref;
					precomputeData(id);
					addSelectedRef(ref, cid);
				}).catch(function (err) {
					console.log("PouchDB: get fail");
					console.log(err);
				});
			}
		}
		colorId++;
	});
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
	let widthInPercentOfParent = 100;
	let heightInPercentOfParent = 40;
	Curves.plots.forEach(function(e) {
		GD[e] = d3.select("#plot"+e)
		.append('div')
		.style({
			width: widthInPercentOfParent + '%',
			'margin-left': (100 - widthInPercentOfParent) / 2 + '%',
			height: heightInPercentOfParent + 'vh',
			'margin-top': (40 - heightInPercentOfParent) / 2 + 'vh'
		}).node();
	});
	loadDatabase();
	$('#applySelections').on('click', function() {
		displayRefsList(filters(Object.keys(Curves.db)));
	});
	$("#fileInput").on('change', function() {
		loadFilesRecursive(fileInput);
	});
	$(window).resize(function() {
		Plotly.Plots.resize(GD.ber);
		Plotly.Plots.resize(GD.fer);
	});
});