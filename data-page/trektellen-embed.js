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
			url: 'https://trektellen.nl/count/view/' + site + '/' + trektellen_date + '?a=1&language=' + trektellen_lang,
			dataType: 'jsonp',
			jsonpCallback: "species_count_" + site,
			error: (function () {
				console.log("Error loading Trektellen data");
			}),
			success: (function (result) {
				$("#trektellencountdiv_" + site).html("<p>" + result.count + "</p>");
				$("#trektellencountdiv_" + site + " h1.left").each(function() {
    				var html = $(this).html();
    				var parts = html.split("<br>");
    				if (parts.length > 1) {
        				$(this).html(parts[1].trim()); // Keep after <br>
    				}
    				$(this).css("line-height", "").css("margin", "5px 0 5px 0");
				});
				$("#trektellencountdiv_" + site + "p:first").remove() // First remove empty <p>
				$("#trektellencountdiv_" + site + "p:first").css({
    				"margin-top": "0",
    				"margin-bottom": "0"
				});
				$("#trektellencountdiv_" + site + " select").attr("onchange", "trektellen_get_count($('#trektellencountdiv_" + site + " select').val(),'" + site + "')");
			})
		});
}
</script>
