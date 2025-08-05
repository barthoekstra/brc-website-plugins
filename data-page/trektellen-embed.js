<script type="text/javascript">
	var trektellen_site = ["1047", "1048", "5026"];
	var trektellen_lang = "english";

	if ($.isArray(trektellen_site) == true) {
		var trektellen_count_sites = trektellen_site;
	} else {
		var trektellen_count_sites = [trektellen_site];
	}

	$(document).ready(function(){
		$.ajaxSetup({
			cache: false
		});
		jQuery.each( trektellen_count_sites, function(i, site) {
			trektellen_get_count("", site);
		});
	});
	function trektellen_get_count(trektellen_date, site){
		$.ajax({
			url: 'https://trektellen.org/count/view/' + site + '/' + trektellen_date + '?a=1&language=' + trektellen_lang,
			dataType: 'jsonp',
			jsonpCallback: "species_count_" + site,
			error: (function () {
				console.log("Error loading Trektellen data");
			}),
			success: (function (result) {
				$("#trektellencountdiv_" + site).innerHTML("<p>" + result.count + "</p>");
				$("#trektellencountdiv_" + site + " select").attr("onchange", "trektellen_get_count($('#trektellencountdiv_" + site + " select').val(),'" + site + "')");
			})
		});
}
</script>