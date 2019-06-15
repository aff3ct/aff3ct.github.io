var KLDB={};
$(document).ready(function() {
	$.ajaxSetup({
		beforeSend: function(xhr) {
			if (xhr.overrideMimeType) xhr.overrideMimeType("text/plain");
		},
		isLocal:false
	});
	let rootKL="https://www.uni-kl.de/";
	let urlKL=rootKL+"/channel-codes/ml-simulation-results/";
	$.ajax(urlKL,
		{error:function(xhr,status,error) {
			logger("**Error loading \"" + databaseURL + "\"\n"+status+" "+error);
		},
	}).done(function(html) {
		let list = html.match(/href="\/fileadmin\/chaco\/public\/results_[^"]*"/g);
		// rm duplicates
		let obj = {};
		list.forEach(function(entry) {
			let url = entry.match(/href="(\/fileadmin\/chaco\/public\/results_[^"]*)"/)[1];
			if (entry.match(/\.txt/))
				obj[url]="";
		});
		let urls = Object.keys(obj);
		let cu=0;
		urls.forEach(function(url) {
			$.ajax(rootKL+url,
				{error:function(xhr,status,error) {
					logger("**Error loading \"" + databaseURL + "\"\n"+status+" "+error);
				},
			}).done(function(txt) {
				let filename = url.match(/\/([^/]*\.txt)/)[1];
				let ref = text2jsonKaiserslautern(txt, filename, true);
				KLDB[ref.hash.value.substring(0,7)]=ref;
				cu++
				if (cu==urls.length)
				{
					console.log(KLDB);
					console.log(Object.keys(KLDB).length);
					$("body pre").empty();
					$("body pre").append(JSON.stringify(KLDB, null, 4));
				}
			});
		});
	});
});