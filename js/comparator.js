const GITLAB="https://gitlab.com/api/v4/projects/10354484/";
const BRANCH="development";

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
	ber: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Bit Error Rate (BER)'} },LT),
	fer: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Frame Error Rate (FER)'}},LT),
};

var GD={};

function precomputeData(id)
{
	let ref = Curves.db[id];
	ref["hash"]["id"] = id;
	/([a-z0-9A-Z.\-,\/=\s;\+:]+\([0-9,]+\))([a-z0-9A-Z.\-,\/=\s;\+:()]+)/mg.test(ref.metadata.title);
	let bigtitle=ref.metadata.title;
	let subtitle="";
	if (ref.metadata.title.length > 23) {
		if (RegExp.$1=="" || RegExp.$2=="")
			bigtitle=ref.metadata.title.substring(0,19)+'... ';
		else {
			bigtitle=$.trim(RegExp.$1);
			subtitle=$.trim(RegExp.$2);
		}
	}
	ref["metadata"]["bigtitle"] = bigtitle;
	ref["metadata"]["subtitle"] = subtitle;
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

// size of the compressed Gitlab refs database in bytes
let EVT_TOTAL = 1279262;
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

function displayCommandModal(ref)
{
	if (!$("#cmdModal"+ref.hash.id).length)
	{
		let cmdModalTemplate = $('#cmdModalTemplate').html();
		Mustache.parse(cmdModalTemplate);
		let cmdModalRendered=Mustache.render(cmdModalTemplate, ref);
		$("#curveModals").append(cmdModalRendered);
	}
}

function displayTraceModal(ref)
{
	if (!$("#traceModal"+ref.hash.id).length)
	{
		let traceModalTemplate = $('#traceModalTemplate').html();
		Mustache.parse(traceModalTemplate);
		let traceModalRendered=Mustache.render(traceModalTemplate, ref);
		$("#curveModals").append(traceModalRendered);
	}
}

function displayRefsList(refs) {
	// sort refs by curve title (lexicographical order)
	refs.sort(function(a,b) {
		return Curves.db[a].metadata.title > Curves.db[b].metadata.title;
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
		let refBodyRendered=Mustache.render(refBodyTemplate, Object.assign(ref, {prefix: ""}));
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
			// track the click with Google Analytics
			/**ga('send', {
				hitType:       'event',
				eventCategory: 'BER/FER Comparator',
				eventAction:   'click',
				eventLabel:    decodeURIComponent(ref.filename)
			});**/
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
	let refBodyRendered=Mustache.render(refBodyTemplate, Object.assign(ref, {prefix: "s"}));
	$("#ss"+ref.hash.id).append(refBodyRendered);

	if (ref.metadata.command) {
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
	$("#hide"+ref.hash.id).on("click", function () {
		hidePlotRef(ref.hash.id);
	});

	$('[data-toggle="tooltip"]').tooltip();

	tippy('#tooltipCurve'+ref.hash.id, {
		arrow: true,
		arrowType: 'sharp',
		animation: 'fade',
	});
}

function updateAddButton(id, bool, contents) {
	$("#curve"+id).prop('disabled', bool);
	$("#curve"+id).empty();
	$("#curve"+id).append(contents);
}

function plotSelectedRefs()
{
	let colorList=[];
	Curves.selectedRefs.forEach(function(id) {
		if (!Curves.db[id].hidden || Curves.db[id].hidden == false)
			colorList.push(Curves.db[id].color.value);
	});

	Curves.plots.forEach(function(x) {
		let data = [];
		Curves.selectedRefs.forEach(function(id) {
			if (!Curves.db[id].hidden || Curves.db[id].hidden == false)
				data.push({x: Curves.db[id].contents["Eb/N0"],
				           y: Curves.db[id].contents[Curves.PLOTS[x]],
				           type: 'scatter'});
		});
		Plotly.newPlot(GD[x], data, Object.assign(LAYOUT[x], {colorway: colorList}), {displaylogo:false});
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
		if (ref.local)
		{
			console.log("TODO: put on CouchDB");
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

function addSelectedRef(ref, colorId = -1) {
	if (Curves.selectedRefs.length==0) {
		let deleteAllTemplate = $('#deleteAllTemplate').html();
		Mustache.parse(deleteAllTemplate);
		$("#saccordion").append(deleteAllTemplate);
		let permalinkTemplate = $('#permalinkTemplate').html();
		Mustache.parse(permalinkTemplate);
		$("#saccordion").append(permalinkTemplate);
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
				updateAddButton(ref.hash.id, true, '<i class="fas fa-minus"></i>');
				plotSelectedRefs();
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
		updateAddButton(id, false, '<i class="fas fa-plus"></i>');

		if (Curves.selectedRefs.length==0) {
			$("#closeAll" ).remove();
			$("#permalink").remove();
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

function loadFilesRecursive(fileInput, i = 0) {
	if (i<fileInput.files.length) {
		let file = fileInput.files[i];
		if (file.type=="text/plain")
		{
			$("#fileDisplayArea").empty();
			if (Curves.selectedRefs.length < Curves.max) {
				let reader = new FileReader();
				reader.readAsText(file);
				reader.onloadend = function(e)
				{
					let ref=text2json(reader.result, file.name);
					let id=ref.hash.value.substring(0,7);
					if (typeof(Curves.db[id])==="undefined")
					{
						ref["local"]=true;
						Curves.db[id]=ref;
						precomputeData(id);
					}
					else
						console.log("The reference already exists in the database (id='"+id+"').");
					addSelectedRef(Curves.db[id]);
					loadFilesRecursive(fileInput, i+1);
				};
			}
			else {
				$("#fileDisplayArea").html('<br><br><span class="alert alert-danger" role="alert">Too many curves displayed</span>');
			}
		}
		else
		{
			$("#fileDisplayArea").html('<br><br><span class="alert alert-danger" role="alert">File not supported!</span>');
			loadFilesRecursive(fileInput, i+1);
		}
	}
}

function applySelections() {
	displayRefsList(filters(Object.keys(Curves.db)));
	for (let i in Curves.disponibility) {
		if (Curves.disponibility[i]==0)
			Curves.updateAddButton(true, '<i class="fas fa-minus"></i>', i);
	}
}

function filterByGeneric(refs, selectorObj) {
	let spath = selectorObj.path.split("/");
	let p=[];
	if (selectorObj.selection.length!=0 && refs.length!=0) {
		refs.forEach(function(ref) {
			selectorObj.selection.forEach(function(selection) {
				if (Curves.db[ref][spath[0]][spath[1]][spath[2]]==selection) {
					p.push(ref);
				}
			});
		});
		return p;
	}
	else
		return refs;
}

function filterByCodeTypes(refs) {
	return filterByGeneric(refs, Curves.selectors.codeType);
}

function filterByFrameSizes(refs) {
	return filterByGeneric(refs, Curves.selectors.frameSize);
}

function filterByModems(refs) {
	return filterByGeneric(refs, Curves.selectors.modemType);
}

function filterByChannels(refs) {
	return filterByGeneric(refs, Curves.selectors.channelType);
}

function filterByCodeRates(refs) {
	let p=[];
	let codeRateRange=$('#codeRate')[0].noUiSlider.get();
	let codeRateMin = codeRateRange[0];
	let codeRateMax = codeRateRange[1];
	if (codeRateMin==0 && codeRateMax==1)
		return refs;
	else {
		refs.forEach(function(ref) {
			if (codeRateMin<=Curves.db[ref].headers["Codec"]["Code rate"] &&
				codeRateMax>=Curves.db[ref].headers["Codec"]["Code rate"]) {
				p.push(ref);
			}
		});
		return p;
	}
}

function filters(refs, type = "") {
	switch(type) {
		case "codeType"   : return filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(refs))));
		case "frameSize"  : return filterByCodeTypes(filterByCodeRates(filterByModems(filterByChannels(refs))));
		case "modemType"  : return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByChannels(refs))));
		case "channelType": return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(refs))));
		case "codeRate"   : return filterByCodeTypes(filterByFrameSizes(filterByChannels(filterByModems(refs))));
		default:
			return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(refs)))));
	}
}

function updateSelected(val, selectionList, id) {
	if ($("#"+val).is(":checked")) {
		selectionList.push(val);
	} else {
		selectionList.splice(selectionList.indexOf(val), 1);
	}
	displaySelectors(selectionList.length ? id : "");
}

function displayCheckbox(length, font, endFont, disabled, selectionList, element, id) {
	let checkboxTemplate = $('#checkboxTemplate').html();
	Mustache.parse(checkboxTemplate);
	let checkboxRendered=Mustache.render(checkboxTemplate, {
		element: element,
		disabled: disabled,
		startBlackFont: font,
		endBlackFont: endFont,
		length: length
	});
	$("#"+id).append(checkboxRendered);
	$('#'+element).on('click', function() {
		updateSelected(element, selectionList, id);
	});
}

function displaySelector(id, selectorObj, showZeros = false) {
	let spath = selectorObj.path.split("/");
	let filteredRefs=filters(Object.keys(Curves.db), id);
	let refsCounter={};
	if (showZeros) {
		Object.keys(Curves.db).forEach(function(id) {
			let key = Curves.db[id][spath[0]][spath[1]][spath[2]];
			if (!refsCounter[key])
				refsCounter[key] = 0;
			filteredRefs.forEach(function(ref) {
				if (id == ref)
					refsCounter[key]++;
			});
		});
	} else {
		filteredRefs.forEach(function(ref) {
			let key=Curves.db[ref][spath[0]][spath[1]][spath[2]];
			if (!refsCounter[key])
				refsCounter[key] = 0;
			refsCounter[key]++;
		});
	}
	$("#"+id).empty();
	$("#"+id).append('<ul>');
	for (let key in refsCounter){
		$("#"+id).append('<li>');
		let number=refsCounter[key];
		let black='<font color="black">';
		let disabled='';
		let endBlack='</font>';
		if (showZeros) {
			if (number) {
				black='<font color="black">';
				endBlack='</font>';
			}
			else if (selectorObj.selection.indexOf(key)>-1) {
				black='<font color="black">';
				endBlack='</font>';
			}
			else
				disabled='disabled';
		}
		displayCheckbox(number, black, endBlack, disabled, selectorObj.selection, key, id);
		$("#"+id).append('</li>');
	}
	$("#"+id).append('</ul>');
	$("#"+id).off();
	selectorObj.selection.forEach(function(x) {
		if ($("#"+x)) {
			if (!$("#"+x).prop('disabled'))
				$("#"+x).prop('checked', true);
			else
				$("#"+x).prop('checked', false);
		}
	});
}

function displaySelectors(except = "") {
	Object.keys(Curves.selectors).forEach(function(key) {
		let showZeros = key == "codeType" ? true : false;
		if (except != key)
			displaySelector(key, Curves.selectors[key], showZeros);
	});
}

function displayRefsFromURI() {
	let paramNames = [];
	for (let i = 0; i < Curves.max; i++)
		paramNames.push("curve"+i);
	let colorId = 0;
	paramNames.forEach(function(paramName) {
		let val=findGetParameter(paramName);
		if (val) {
			if (val.slice(0,4)=="NoWw") {
				let ref=text2json(LZString.decompressFromEncodedURIComponent(val));
				let id=ref.hash.value.substring(0,7);
				if (typeof(Curves.db[id])==="undefined")
				{
					ref["local"]=true;
					Curves.db[id]=ref;
					precomputeData(id);
				}
				else
					console.log("The reference already exists in the database (id='"+id+"').");
				addSelectedRef(ref, colorId);
			} else {
				let id = val;
				if (Curves.db[id])
					addSelectedRef(Curves.db[id], colorId);
			}
		}
		colorId++;
	});
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
		applySelections();
	});
	$("#fileInput").on('change', function() {
		loadFilesRecursive(fileInput);
	});
	$(window).resize(function() {
		Plotly.Plots.resize(GD.ber);
		Plotly.Plots.resize(GD.fer);
	});
});