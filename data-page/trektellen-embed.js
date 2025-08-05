<script type="text/javascript">
  var trektellen_year = "2018"; //year to be shown
  var trektellen_site = ["1047","1048", "5026"];
  var trektellen_lang = "english";
  var trektellen_species = "588,110";
  var trektellen_totalall = true;
  var trektellen_totalraptors = false;
  var trektellen_totalraptorsandstorks = false;
  var trektellen_ringing = false;

  if ($.isArray(trektellen_site)==true) {
	var trektellen_count_sites=trektellen_site;
} else {
	var trektellen_count_sites=[trektellen_site];
}
jQuery.each( trektellen_count_sites, function( i, site ) {
	document.write("<div class=\"trektellen\" id='trektellencountdiv"+site+"'></div>")
});
$(document).ready(function(){
	$.ajaxSetup({
		cache: false
	});
	jQuery.each( trektellen_count_sites, function( i, site ) {
		trektellen_get_count("",site);
	});
});
function trektellen_get_count(trektellen_date,site){

	$.ajax({
		url: 'https://trektellen.org/count/view/'+site+'/'+trektellen_date+'?a=1&language='+trektellen_lang,
		dataType: 'jsonp',
		jsonpCallback: "species_count_"+site,
		error: (function(){
			console.log("error loading Trektellen data");
		}),
		success: (function(result){
			$("#trektellencountdiv"+site).html("<p>"+result.count+"</p>");
      $("#trektellencountdiv"+site+" select").attr("onchange", "trektellen_get_count($('#trektellencountdiv"+site+" select').val(),'"+site+"')");
		})
	});

}
</script>