var inputCt = [];

function addListItem(inputName, minRequired) {

	inputCt[inputName] = inputCt[inputName] ? ++inputCt[inputName] : 1;
	
	let div = document.createElement("div");
	div.className = "row mt-2";
	
	for(i = 2; i < arguments.length; i++) {
		let field = arguments[i].field.replace(/^\w/, c => c.toUpperCase());
		let label = arguments[i].label;
		let type = arguments[i].type || "text";
		let width = arguments[i].width ? ("-" + arguments[i].width) : "";
		let pattern = arguments[i].pattern;
		let placeholder = arguments[i].placeholder || "";
		let value = arguments[i].value || "";
		
		let col = document.createElement("div");
		col.className = "col" + width;
		
		if(inputCt[inputName] == 1) {
			let labelEl = document.createElement("label");
			labelEl.for = inputName + field + inputCt[inputName];
			labelEl.innerHTML = label == undefined ? field : field;
			col.appendChild(labelEl);
		}
		
		let input;
		if(type == "textarea")
			input = document.createElement("textarea");
		else {
			input = document.createElement("input");
			input.type = type;
		}
		input.name = inputName + field + inputCt[inputName];
		input.id = inputName + field + inputCt[inputName];
		input.autocomplete = "omgwtfbbq";
		input.className = "form-control";
		input.placeholder = placeholder;
		input.value = value;
		if(inputCt[inputName] <= minRequired && !arguments[i].required === false) {
			input.required = true;
		}
		if(pattern) {
			input.pattern = pattern;
		}
		col.appendChild(input);
		
		if(inputCt[inputName] <= minRequired) {
			let mStr = " is";
			let ifDiv = document.createElement("div");
			ifDiv.className = "invalid-feedback";
			if(minRequired > 1) {
				mStr = "s are";
			}
			ifDiv.innerHTML = "At least " + minRequired + " " + field + mStr + " required."
			col.appendChild(ifDiv);
		}
		
		div.appendChild(col);
	}
		
	$("#" + inputName).append(div);
}

function toggleExpField(name, isShow) {
	if(isShow) {
		$('#' + name + "EC").collapse('show');
		if($('#' + name + "Exp").length) {
			$('#' + name + "Exp").attr('required', true);
		}
	} else {
		$('#' + name + "EC").collapse('hide');
		if($('#' + name + "Exp").length) {
			$('#' + name + "Exp").attr('required', false);
		}
	}
}

function handleResponse(fullResponse, customHandler) {
	if(fullResponse.status == 200) {
		let response = JSON.parse(fullResponse.responseText);
        if (response.success) {
            if (response.cmd == "redirect") {
                if (response.silent) {
                    window.location.replace("/" + response.redirect);
                } else {
                    window.location.href = "/" + response.redirect;
                }
            } else if (response.cmd == "showModal") {
                $(response.modal).modal('show');
            } else if (customHandler) {
                customHandler(response);
            }
        } else {
            if (response.error) {
                $("#errorModal #errorDesc").html(response.error);
            } else {
                $("#errorModal #errorDesc").html("There was an unknown error.");
            }
            $("#errorModal").modal("show");
        }
	}
}

function validateForm(form) {
	let isValid = form.checkValidity();
	form.classList.add('was-validated');
	if(isValid) {
		return true;
	} else {
		let errorElements = document.querySelectorAll("#" + form.id + " input:invalid");
		errorElements[0].scrollIntoView({behavior: "smooth"});
		return false;
	}
}

function showErrorModal(error, redirectOnClose) {
	$('#errorDisc').html(error);
    if (redirectOnClose) {
        $('#errorModal .errorCloseBtn').each((index, el) => { $(el).attr('onclick', 'window.location.href = "/mainmenu";') });
    } else {
        $('#errorModal .errorCloseBtn').each((index, el) => { $(el).attr('onclick', '') });
    }
	$('#errorModal').modal({backdrop: 'static'});
}

function timedProgressBar(div, seconds, closeModal, modal) {
	let divs = $(div).children();
	let outer = $(divs).find('.progress-outer');
	let inner = $(divs).find('.progress-inner');
	let ctr = $(divs).find('.progress-ctr');

	$(ctr).text("0%");
	$(inner).width(0);
	let pct = 0;
	let pctPerInt = (100 / seconds) / 100;
	let int = setInterval(function(){
		pct = pct + pctPerInt;
		if(pct >= 100) {
			clearInterval(int);
			pct = 100;
			if(closeModal) {
				setTimeout(function() {
					$("#" + modal).modal("hide");
				}, 500);
			}
		}
		$(inner).width(pct + "%");
		$(ctr).text(Math.floor(pct) + "%");
	}, 10);
}

function showWaitModal(time) {
	$("#waitModal").modal("show");
	timedProgressBar($("#progress").get(), time, true, "waitModal");
}

function redirect(page, params) {
	let paramList = "";
	if(params) {
		let isFirst = true;
		paramList += "?";
		for(key in params) {
			if(isFirst) {
				isFirst = false;
			} else {
				paramList += "&";
			}
			paramList += key + "=" + params[key];
		}
	}
	window.location.href = "/" + page + paramList;
}

function makeModal(options) {
	let modal = document.createElement("div");
	modal.className = "modal fade";
	modal.id = options.id == undefined ? "newModal" : options.id;
	modal.setAttribute("role", "dialog");
	modal.setAttribute("tabindex", "-1");
	modal.setAttribute("aria-labelledby", options.id == undefined ? "newModalLabel" : options.id + "Label");
	modal.setAttribute("aria-hidden", "true");
	
		let dialog = document.createElement("div");
		dialog.className = "modal-dialog modal-lg";
		dialog.role = "document";
		modal.appendChild(dialog);
	
		let content = document.createElement("div");
		content.className = "modal-content";
		dialog.appendChild(content);
	
		let header = document.createElement("div");
		header.className = "modal-header";
		dialog.appendChild(header);
		
			let title = document.createElement("h5");
			title.className = "header-title";
			title.id = options.id == undefined ? "newModalLabel" : options.id + "Label";
			title.innerHTML = options.title == undefined ? "" : options.title;
			header.appendChild(title);
			
			if(!options.noCloseBtn) {
				let closeBtn = document.createElement("button");
				closeBtn.type = "button";
				closeBtn.className = "close";
				closeBtn.setAttribute("data-dismiss", "modal");
				closeBtn.setAttribute("data-target", "#" + options.id == undefined ? "newModal" : options.id);
				closeBtn.setAttribute("aria-label", "Close");
				
					let closeSpan = document.createElement("span");
					closeSpan["aria-hidden"] = "true";
					closeSpan.innerHTML = "&times;";
					closeBtn.appendChild(closeSpan);
				
				header.appendChild(closeBtn);
			}
		
		let body = document.createElement("div");
		body.className = "modal-body";
		body.innerHTML = options.body == undefined ? "" : options.body;
		dialog.appendChild(body);
		
		let footer = document.createElement("div");
		footer.className = "modal-footer";
		footer.innerHTML = options.footer == undefined ? "" : options.footer;
		dialog.appendChild(footer);

	document.body.appendChild(modal);
	
	return modal;
}