function submitUserForm(ignoreNoContact) {
	let data = handleUserForm(ignoreNoContact);
	if(data) {
		$.ajax({
			method: 'post',
			url: '../submitUserForm',
			data: data,
			complete: function(response,status,xhr){
				handleResponse(response);
			}
		});
	}
}

function handleUserForm(ignoreNoContact) {
	if(typeof document.createElement("input").checkValidity == "function") {
		//HTML5 Form Validation will work!
        if (validateForm(document.getElementById("userForm"))) {
            let data = {};

            $("#userForm").find(":input:not([type=button], [type=checkbox], [type=radio]), :checked").each(function (i, el) {
                data[this.name] = this.value;
            });
			/*if(!ignoreNoContact && !(data.contactEmail || data.contactText || data.contactFB)) {
				$("#noContactModal").modal({backdrop: "static"});
				//Return. If the user wants to go ahead, the button on the warning will resubmit
				return;
			}*/
            return data;
        }
	} else {
		alert("Your browser is too old. Whomp whomp.");
	}
}

function phoneCarrierSelect(el) {
    if(el.value == "other")
        toggleExpField('phoneCarrierOther', true);
    else
        toggleExpField('phoneCarrierOther', false);
}