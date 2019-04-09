function submitRequest() {
	if(validateForm($('#requestForm')[0])) {
		let data = {};
		$("#requestForm").find(":input:not([type=button], [type=checkbox], [type=radio]), :checked").each(function(i, el) {
			data[this.name] = this.value;
		});
		$.ajax({
			method: 'post',
			url: '../submitRequest',
			data: data,
			complete: function(data,status,xhr){
				handleResponse(data, srHandler);
			}
		});
	}
}

function srHandler(response) {
	if(response.success) {
		FB.getLoginStatus(function(fbResp) {
			if(fbResp.status == "connected") {
				let url = window.location.protocol + "//" + window.location.hostname + "/requestdetail?reqId=" + response.requestId;
				
				//If user has requested us to auto-post request, do so here
				if(response.autoPost && response.autoPostSuccess) {
					/*FB.api(
						"/2337563949617597/feed",
						"POST",
						{
							"message": response.autoPostText,
							"link": "www.google.com" //To be changed to URL
						},
						function (response) {
						  if (response && !response.error) {
							$("#FBPost").html("Your request has been posted to Facebook.");
						  }
						}
					);*/
					$("#FBPost").html("Your request has been posted to Facebook.");
				} else if(response.autoPost) {
					$("#FBPost").html('There was an error posting your message to Facebook. Please try posting manually.<br/><button type="button" class="btn btn-primary" onclick="showFBShare()">Share your request on Facebook</button>');
				} else {
					//If not auto-posting, make a Share button
					$("#FBPost").html('<button type="button" class="btn btn-primary" onclick="showFBShare()">Share your request on Facebook</button>');
				}
			}
		});
		$('#successModal').modal({backdrop: 'static'});
	} else {
		showErrorModal(response.error, true);
	}
}

function showFBShare() {
	FB.ui({
		method: 'share',
		href: window.location.href,
		to: '2337563949617597'
	},
	function(){});
}

function autoPostClick() {
	if(autoFBPostCheck.value == "No") {
		autoFBPostCheck.value = "Yes";
		$("#autoFBPostButton").html("Automated Facebook Post: On");
		if(!$("#autoFBPostButton").hasClass("btn-success")) {
			$("#autoFBPostButton").toggleClass("btn-success btn-secondary");
		}
	} else {
		autoFBPostCheck.value = "No";
		$("#autoFBPostButton").html("Automated Facebook Post: Off");
		if($("#autoFBPostButton").hasClass("btn-success")) {
			$("#autoFBPostButton").toggleClass("btn-success btn-secondary");
		}
	}
}

function assignSelectChange(selected) {

	if(assignSelect.value != "None") {
		$("#assignSubmitButton").html("Assign " + assignSelect[assignSelect.selectedIndex].text);
		if(!$("#assignSubmitButton").hasClass("btn-primary")) {
			$("#assignSubmitButton").toggleClass("btn-primary btn-dark");
		}
	} else {
		$("#assignSubmitButton").html("Assign Nobody");
		if($("#assignSubmitButton").hasClass("btn-primary")) {
			$("#assignSubmitButton").toggleClass("btn-primary btn-dark");
		}
	}
}

function submitAssign(assignSelect) {
	if(assignSelect[assignSelect.selectedIndex].value != "None") {
		$("#assignedTo").val(assignSelect[assignSelect.selectedIndex].value);
		
		$("#assignedButton").html("Assigned to " + assignSelect[assignSelect.selectedIndex].text);
		$("#assignedButton").removeClass("btn-secondary");
		$("#assignedButton").addClass("btn-success");
		$("#fulfilledButton").removeClass("btn-secondary");
		$("#fulfilledButton").addClass("btn-dark");
		$("#fulfilledButton").attr("disabled", true);
	} else {
		$("#assignedTo").val("");
		
		$("#assignedButton").html("Babysitter Not Assigned");
		$("#assignedButton").removeClass("btn-success");
		$("#assignedButton").addClass("btn-secondary");
		$("#fulfilledButton").removeClass("btn-dark");
		$("#fulfilledButton").addClass("btn-secondary");
		$("#fulfilledButton").attr("disabled", false);
	}
	$("#assignModal").modal("hide");
}

function addSitter(parentEl) {
    if(parentEl.charAt(0) != "#")
        parentEl = "#" + parentEl;

    let index = $(parentEl).children().length;

    let fc = $(parentEl + "Template").clone();
    let els = $(fc).children();
    let selectDiv = $(els).find("div.fulfillSelect");
    $(selectDiv).find("label").eq(0).attr("for", "fulfillSelect" + index);
    $(selectDiv).find("select").eq(0).attr("id", "fulfillSelect" + index);
    let startDiv = $(els).find("div.fulfillStartTime");
    $(startDiv).find("label").eq(0).attr("for", "fulfillStartTime" + index);
    $(startDiv).find("input").eq(0).attr("id", "fulfillStartTime" + index);
    let prevEnd = $(parentEl).find("#fulfillEndTime" + (index - 1));
    if(prevEnd.length && $(prevEnd).val())
        $("#fulfillStartTime" + index).val($(prevEnd).val());
    let endDiv = $(els).find("div.fulfillEndTime");
    $("#fulfillEndTime" + index).val($("#endTime").val());
    $(endDiv).find("label").eq(0).attr("for", "fulfillEndTime" + index);
    $(endDiv).find("input").eq(0).attr("id", "fulfillEndTime" + index);

    $(parentEl).append("<br />");
    $(parentEl).append(fc);
}

function submitFulfillment(submitToServer) {
    let fulfillSelect = $("#fulfillSelect").get(0);
	if(fulfillSelect[fulfillSelect.selectedIndex].value != "None") {
		$("#fulfilledStartTime").val($("#fulfillModalStartTime").val());
		$("#fulfilledEndTime").val($("#fulfillModalEndTime").val());
		$("#assignedTo").val(fulfillSelect[fulfillSelect.selectedIndex].value);
		
		$("#fulfilledButton").html("Fulfilled by " + fulfillSelect[fulfillSelect.selectedIndex].text + " (" + $("fulfillDuration").text + ")");
		$("#fulfilledButton").removeClass("btn-secondary");
		$("#fulfilledButton").addClass("btn-success");
		$("#assignedButton").removeClass("btn-secondary");
		$("#assignedButton").addClass("btn-dark");
		$("#assignedButton").attr("disabled", true);
	} else {
		$("#fulfilledStartTime").val("");
		$("#fulfilledEndTime").val("");
		$("#assignedTo").val("");
		
		$("#fulfilledButton").html("Babysitter Not Assigned");
		$("#fulfilledButton").removeClass("btn-success");
		$("#fulfilledButton").addClass("btn-secondary");
		$("#assignedButton").removeClass("btn-dark");
		$("#assignedButton").addClass("btn-secondary");
		$("#assignedButton").attr("disabled", false);
	}
    $("#fulfillModal").modal("hide");

    if (submitToServer) {
        data = {};
        data.assignedTo = $('#assignedTo').val;
        data.fulfilledStartTime = $('#fulfilledStartTime').val;
        data.fulfilledEndTime = $('#fulfilledEndTime').val;
        $.ajax({
            method: 'post',
            url: '/submitFulfillment',
            data: data,
            complete: function (data, status, xhr) {

            }
        });
    }
}

function calcDuration(prefix) {
	let strStart = $("#" + prefix + "StartTime").val();
	let strEnd = $("#" + prefix + "EndTime").val();
	if(strStart && strEnd) {
		let dStart = new Date(strStart);
		let dEnd = new Date(strEnd);
		let dur = (dEnd - dStart) / 36e5;
		return dur;
	} else {
		return 0;
	}
}

function updateDuration(prefix) {
	prefix = prefix == undefined ? "" : prefix;
	let dur = calcDuration(prefix);
	$("#" + prefix + "Duration").html(parseFloat(dur.toFixed(2)) + " hours");
}

function prefillFulfillDates() {
	if($("#StartTime").val()) {
		$("#fulfillModalStartTime").val($("#StartTime").val());
	}
	if($("#EndTime").val()) {
		$("#fulfillModalEndTime").val($("#EndTime").val());
	}
	updateDuration("fulfillModal");
}

function startTimeSelect() {
	if(!$("#EndTime").val()) {
		$("#EndTime").val($("#StartTime").val());
	}
}

function enableEditing() {
	$('#requestFormField').attr('disabled', false);
}