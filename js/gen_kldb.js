var KLDB={};
$(document).ready(function() {
	$.ajaxSetup({
		beforeSend: function(xhr) {
			if (xhr.overrideMimeType) xhr.overrideMimeType("text/plain");
		},
		isLocal:false
	});
	let rootKL="https://www.uni-kl.de";
	let urlKL=rootKL+"/channel-codes/ml-simulation-results/";
	$.ajax(urlKL,
		{error:function(xhr,status,error) {
			logger("**Error loading \"" + databaseURL + "\"\n"+status+" "+error);
		},
	}).done(function(html) {
		let list = html.match(/href="\/fileadmin\/chaco\/public\/results_[^"]*".+?(?=<\/tr>)/g);
		// rm duplicates
		let obj = {};
		list.forEach(function(entry) {
			let res = entry.match(/href="\/fileadmin\/chaco\/public\/results_[^"]*"/g);
			for (let i = 0; i < res.length; i++) {
				let url = res[i].match(/href="(\/fileadmin\/chaco\/public\/results_[^"]*)"/)[1];
				if (url.match(/\.txt/)) {
					obj[url]={url: url};
					let parMatrixLong = entry.match(/href="\/fileadmin\/chaco\/public[^"]+?(?=alist)[^"]*"/g);
					if (parMatrixLong) {
						let parityMatrix = parMatrixLong[0].match(/href="(\/fileadmin\/chaco\/public\/[^"]*)"/)[1];
						$.extend(obj[url], {parity: parityMatrix});
					}
				}
			}
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
				let codeType = url.match(/\/results_([^/]*)\//)[1];
				let codeTypeCorresp = {
					"ldpc": "LDPC",
					"turbo": "TURBO",
					"polar": "POLAR",
					"array": "LDPC_AR",
					"nonbinary": "LDPC_NB",
					"rm": "RM",
					"bch": "BCH",
					"rs": "RS",
					"others": "",
				};
				let ref = text2jsonKaiserslautern(txt, filename, codeTypeCorresp[codeType]);
				ref.metadata.source="Kaiserslautern";
				ref.metadata.kaiserslautern=true;
				ref.metadata.url=rootKL+url;
				if (obj[url].parity)
					ref.metadata.parity=rootKL+obj[url].parity;
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